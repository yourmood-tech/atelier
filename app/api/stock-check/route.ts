import { NextRequest, NextResponse } from "next/server";
import { getProductByHandle } from "@/lib/shopify";
import { getRecipeWithSuppliers, getVariantStock } from "@/lib/katana";

function extractHandle(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const parts = u.pathname.split("/");
    const idx = parts.indexOf("products");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // Not a full URL — treat as raw handle
  }
  // Accept bare handle or path segment
  const clean = raw.trim().replace(/^\/+|\/+$/g, "").split("/").pop() ?? "";
  return clean || null;
}

// GET /api/stock-check?url=https://yourmood.net/products/bague-aura-titane
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Paramètre 'url' requis" }, { status: 400 });
    }

    const handle = extractHandle(raw);
    if (!handle) {
      return NextResponse.json({ ok: false, error: "URL invalide — impossible d'extraire le handle produit" }, { status: 400 });
    }

    // 1. Get product + all variants from Shopify
    const product = await getProductByHandle(handle);
    if (!product) {
      return NextResponse.json({ ok: false, error: `Produit introuvable pour le handle : ${handle}` }, { status: 404 });
    }

    // 2. For each variant, get Katana recipe + stock
    const variants = await Promise.all(
      product.variants.map(async (variant) => {
        const recipe = await getRecipeWithSuppliers(variant.sku).catch(() => null);

        if (!recipe?.ingredients.length) {
          return {
            variantId: variant.id,
            variantTitle: variant.title,
            sku: variant.sku,
            ingredients: [],
            minCanMake: 0,
          };
        }

        const ingredients = await Promise.all(
          recipe.ingredients.map(async (ing) => {
            const stock = await getVariantStock(ing.id).catch(() => ({
              inStock: 0, committed: 0, available: 0, toReceive: 0,
            }));
            return {
              name: ing.name,
              sku: ing.sku,
              quantityNeeded: ing.quantity,
              supplier: ing.supplier?.name ?? null,
              stock,
              canMake: ing.quantity > 0 ? Math.floor(stock.available / ing.quantity) : 0,
            };
          })
        );

        const minCanMake = Math.min(...ingredients.map((i) => i.canMake));

        return {
          variantId: variant.id,
          variantTitle: variant.title,
          sku: variant.sku,
          ingredients,
          minCanMake,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      product: product.title,
      productId: product.id,
      variants,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
