import { NextRequest, NextResponse } from "next/server";
import { getProductByHandle } from "@/lib/shopify";
import { getRecipeWithSuppliers, getVariantStock, getKatanaVariantIdBySku } from "@/lib/katana";

function extractHandle(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const parts = u.pathname.split("/");
    const idx = parts.indexOf("products");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // Not a full URL — treat as raw handle
  }
  const clean = raw.trim().replace(/^\/+|\/+$/g, "").split("/").pop() ?? "";
  return clean || null;
}

// GET /api/stock-check?url=https://yourmood.net/products/...
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Paramètre 'url' requis" }, { status: 400 });
    }

    const handle = extractHandle(raw);
    if (!handle) {
      return NextResponse.json({ ok: false, error: "URL invalide" }, { status: 400 });
    }

    const product = await getProductByHandle(handle);
    if (!product) {
      return NextResponse.json({ ok: false, error: `Produit introuvable : ${handle}` }, { status: 404 });
    }

    const variants = await Promise.all(
      product.variants.map(async (variant) => {
        const recipe = await getRecipeWithSuppliers(variant.sku).catch(() => null);

        // — Product with recipe (manufactured) → show materials stock —
        if (recipe?.ingredients.length) {
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
          return {
            variantId: variant.id,
            variantTitle: variant.title,
            sku: variant.sku,
            type: "manufactured" as const,
            ingredients,
            directStock: null,
            minCanMake: Math.min(...ingredients.map((i) => i.canMake)),
          };
        }

        // — Product without recipe (purchased / finished good) → show direct stock —
        const katanaId = await getKatanaVariantIdBySku(variant.sku).catch(() => null);
        const directStock = katanaId
          ? await getVariantStock(katanaId).catch(() => null)
          : null;

        return {
          variantId: variant.id,
          variantTitle: variant.title,
          sku: variant.sku,
          type: "purchased" as const,
          ingredients: [],
          directStock,
          minCanMake: directStock ? directStock.available : 0,
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
