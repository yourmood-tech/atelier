import { NextRequest, NextResponse } from "next/server";
import { getRecipeWithSuppliers, getVariantStock, getKatanaVariantIdBySku } from "@/lib/katana";

// GET /api/stock-debug?sku=MED-AURA-MENTALO-CZ-56
// Traces the exact same code path as /api/stock-check to diagnose stock = 0 issues
export async function GET(req: NextRequest) {
  const sku = req.nextUrl.searchParams.get("sku")?.trim() ?? "";
  if (!sku) return NextResponse.json({ error: "sku requis" }, { status: 400 });

  try {
    const recipe = await getRecipeWithSuppliers(sku).catch((err: Error) => ({
      __error: err.message,
    }));

    if (!recipe || "__error" in recipe) {
      // Try purchased path
      const katanaId = await getKatanaVariantIdBySku(sku).catch(() => null);
      const directStock = katanaId
        ? await getVariantStock(katanaId).catch((err: Error) => ({ __error: err.message }))
        : null;
      return NextResponse.json({
        sku,
        path: "purchased",
        recipe: recipe ?? null,
        katanaVariantId: katanaId,
        directStock,
      });
    }

    const hasIngredients = "ingredients" in recipe && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0;

    if (!hasIngredients) {
      return NextResponse.json({ sku, path: "no_recipe", recipe });
    }

    const ingredientStocks = await Promise.all(
      (recipe as { ingredients: { id: number; sku: string | null; name: string; quantity: number }[] }).ingredients.map(async (ing) => {
        const stockResult = await getVariantStock(ing.id).catch((err: Error) => ({
          __error: err.message,
        }));
        return {
          ingredientId: ing.id,
          ingredientSku: ing.sku,
          ingredientName: ing.name,
          quantity: ing.quantity,
          stock: stockResult,
          canMake: !("__error" in stockResult) && ing.quantity > 0
            ? Math.floor((stockResult as { inStock: number }).inStock / ing.quantity)
            : "__error",
        };
      })
    );

    return NextResponse.json({
      sku,
      path: "manufactured",
      recipe: { id: recipe.id, name: recipe.name, ingredientCount: recipe.ingredients.length },
      ingredientStocks,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
