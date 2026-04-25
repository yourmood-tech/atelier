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

async function shopifyGet(path: string): Promise<unknown> {
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
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { barcode?: string };
    const barcode = body.barcode?.trim();
    if (!barcode) {
      return NextResponse.json({ error: "barcode requis" }, { status: 400 });
    }

    // Try as Shopify product_id
    const byProduct = await shopifyGet(
      `/products/${barcode}.json?fields=id,title,variants`
    ) as { product?: ShopifyProduct } | null;

    if (byProduct?.product) {
      const product = byProduct.product;
      const variants = product.variants
        .filter((v) => v.sku)
        .map((v) => ({ title: v.title, sku: v.sku! }))
        .sort((a, b) => {
          const na = parseFloat(a.title);
          const nb = parseFloat(b.title);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.title.localeCompare(b.title);
        });

      return NextResponse.json({
        ok: true,
        type: "product",
        productId: product.id,
        productName: product.title,
        variants,
      });
    }

    // Fallback: try as variant_id
    const byVariant = await shopifyGet(
      `/variants/${barcode}.json`
    ) as { variant?: ShopifyVariant & { product_id: number } } | null;

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
