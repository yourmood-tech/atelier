import { NextRequest, NextResponse } from "next/server";
import { getRecipeWithSuppliers } from "@/lib/katana";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN!;
const SHOPIFY_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

type ShopifyVariant = {
  id: number;
  sku: string | null;
  title: string;
  product_id: number;
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

async function findShopifyVariant(barcode: string): Promise<ShopifyVariant | null> {
  // Try as variant ID first (most common from scanned order slips)
  const byId = await shopifyGet(`/variants/${barcode}.json`) as { variant?: ShopifyVariant } | null;
  if (byId?.variant?.sku) return byId.variant;

  // Fallback: search by barcode field
  const byBarcode = await shopifyGet(`/variants.json?barcode=${encodeURIComponent(barcode)}&limit=1`) as { variants?: ShopifyVariant[] } | null;
  if (byBarcode?.variants?.[0]?.sku) return byBarcode.variants[0];

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { barcode?: string };
    const barcode = body.barcode?.trim();
    if (!barcode) {
      return NextResponse.json({ error: "barcode requis" }, { status: 400 });
    }

    // 1. Resolve Shopify variant → SKU
    const shopifyVariant = await findShopifyVariant(barcode);
    if (!shopifyVariant) {
      return NextResponse.json(
        { error: `Variant Shopify introuvable (barcode: ${barcode})` },
        { status: 404 }
      );
    }

    const sku = shopifyVariant.sku;
    if (!sku) {
      return NextResponse.json(
        { error: `Variant Shopify trouvé mais sans SKU (id: ${shopifyVariant.id})` },
        { status: 404 }
      );
    }

    // 2. Get Katana recipe with supplier info
    const recipe = await getRecipeWithSuppliers(sku);
    if (!recipe) {
      return NextResponse.json(
        { error: `Recette Katana introuvable pour SKU ${sku}` },
        { status: 404 }
      );
    }

    // 3. Filter Icelea ingredients
    const icelea = recipe.ingredients.filter(
      (i) => i.supplier?.name?.toLowerCase().includes("icelea")
    );

    if (!icelea.length) {
      return NextResponse.json(
        {
          error: `Aucun composant Icelea dans la recette de "${recipe.name}" (${sku})`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      productName: recipe.name,
      productSku: sku,
      icelea: icelea.map((i) => ({
        variantId: i.id,
        name: i.name,
        sku: i.sku ?? null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
