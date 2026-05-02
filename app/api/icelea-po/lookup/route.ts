import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN!;
const SHOPIFY_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

type ShopifyVariant = {
  id: number;
  title: string;
  sku: string | null;
};

type ShopifyProduct = {
  id: number;
  title: string;
  variants: ShopifyVariant[];
};

async function shopifyGet(path: string): Promise<{ data: unknown; nextUrl: string | null }> {
  const res = await fetch(
    `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_VERSION}${path}`,
    {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return { data: null, nextUrl: null };
  const text = await res.text();
  const link = res.headers.get("link");
  const nextUrl = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  return { data: text ? JSON.parse(text) : null, nextUrl };
}

async function fetchAllVariants(productId: string): Promise<ShopifyVariant[]> {
  const all: ShopifyVariant[] = [];
  let url: string | null =
    `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_VERSION}/products/${productId}/variants.json?limit=250&fields=id,title,sku`;

  while (url) {
    const pageRes: Response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN },
      cache: "no-store",
    });
    if (!pageRes.ok) break;
    const data = await pageRes.json() as { variants?: ShopifyVariant[] };
    all.push(...(data.variants ?? []));
    const linkHeader: string | null = pageRes.headers.get("link");
    url = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }
  return all;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { barcode?: string };
    const barcode = body.barcode?.trim();
    if (!barcode) {
      return NextResponse.json({ error: "barcode requis" }, { status: 400 });
    }

    // Try as Shopify product_id
    const { data: productData } = await shopifyGet(`/products/${barcode}.json?fields=id,title`);
    const byProduct = productData as { product?: { id: number; title: string } } | null;

    if (byProduct?.product) {
      const product = byProduct.product;
      const allVariants = await fetchAllVariants(String(product.id));
      const variants = allVariants
        .filter((v) => v.sku)
        .map((v) => ({ title: v.title, sku: v.sku! }))
        .sort((a, b) => {
          const na = parseFloat(a.title);
          const nb = parseFloat(b.title);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.title.localeCompare(b.title);
        });

      // Single variant (e.g. earrings with no size) — skip size selection
      if (variants.length === 1) {
        return NextResponse.json({
          ok: true,
          type: "variant",
          productId: product.id,
          productName: product.title,
          variantTitle: variants[0].title,
          sku: variants[0].sku,
        });
      }

      return NextResponse.json({
        ok: true,
        type: "product",
        productId: product.id,
        productName: product.title,
        variants,
      });
    }

    // Fallback: try as variant_id
    const { data: variantData } = await shopifyGet(`/variants/${barcode}.json`);
    const byVariant = variantData as { variant?: ShopifyVariant & { product_id: number } } | null;

    if (byVariant?.variant?.sku) {
      const v = byVariant.variant;
      return NextResponse.json({
        ok: true,
        type: "variant",
        productId: v.product_id,
        variantTitle: v.title,
        sku: v.sku,
      });
    }

    return NextResponse.json(
      { error: `Produit Shopify introuvable (id: ${barcode})` },
      { status: 404 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
