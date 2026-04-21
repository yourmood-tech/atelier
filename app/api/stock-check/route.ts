import { NextRequest, NextResponse } from "next/server";
import { searchShopifyProducts } from "@/lib/shopify";
import { getRecipeWithSuppliers, getVariantStock } from "@/lib/katana";

// GET /api/stock-check?q=aura
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q || q.length < 2) {
      return NextResponse.json({ ok: false, error: "Recherche trop courte" }, { status: 400 });
    }

    // 1. Search Shopify products
    const shopifyProducts = await searchShopifyProducts(q);
    if (!shopifyProducts.length) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // 2. For each product, get recipe + stock
    const results = await Promise.all(
      shopifyProducts.map(async (product) => {
        const recipe = await getRecipeWithSuppliers(product.sku50).catch(() => null);
        if (!recipe?.ingredients.length) {
          return { product: product.title, productId: product.id, ingredients: [] };
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
              canMake: stock.available > 0
                ? Math.floor(stock.available / ing.quantity)
                : 0,
            };
          })
        );

        const minCanMake = ingredients.length
          ? Math.min(...ingredients.map((i) => i.canMake))
          : 0;

        return {
          product: product.title,
          productId: product.id,
          ingredients,
          minCanMake,
        };
      })
    );

    return NextResponse.json({ ok: true, results: results.filter((r) => r.ingredients.length) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
