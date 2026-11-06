import { NextRequest, NextResponse } from "next/server";
import { getRecipeWithSuppliers } from "@/lib/katana";
import { VACOR_SUPPLIER_ID, vacorColour } from "@/lib/vacor";

// Recette Katana d'un article vendu → lignes « traitement Vacor » (avec la quantité de la recette :
// Black Chrome = 3 mediums noirs, Volcan = 1 medium noir + 1 medium pink gold…).
export async function POST(req: NextRequest) {
  try {
    const { sku } = (await req.json()) as { sku?: string };
    if (!sku?.trim()) return NextResponse.json({ error: "sku requis" }, { status: 400 });

    const recipe = await getRecipeWithSuppliers(sku.trim());
    if (!recipe) return NextResponse.json({ error: `Recette Katana introuvable pour ${sku}` }, { status: 404 });

    const vacor = recipe.ingredients.filter(
      (i) => i.supplier?.id === VACOR_SUPPLIER_ID || i.supplier?.name?.toLowerCase().includes("vacor")
    );
    if (!vacor.length) {
      return NextResponse.json({ error: `Aucun traitement Vacor dans la recette de « ${recipe.name} »` }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      productName: recipe.name,
      vacor: vacor.map((i) => ({
        variantId: i.id,
        name: i.name,
        sku: i.sku ?? null,
        perUnit: Number(i.quantity) || 1,
        purchasePrice: i.purchasePrice ?? 0,
        colour: vacorColour(i.sku, i.name),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
