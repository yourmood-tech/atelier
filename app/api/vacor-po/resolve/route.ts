import { NextRequest, NextResponse } from "next/server";
import { getRecipeWithSuppliers } from "@/lib/katana";
import { TREATMENT_SUPPLIER_IDS, treatmentGroup } from "@/lib/vacor";

// Recette Katana d'un article vendu → lignes « traitement » Vacor et Positive Coating, avec la quantité
// de la recette (Black Chrome = 3 mediums noirs, Electric Blue = 4 minis + 1 medium bleu électrique…).
export async function POST(req: NextRequest) {
  try {
    const { sku } = (await req.json()) as { sku?: string };
    if (!sku?.trim()) return NextResponse.json({ error: "sku requis" }, { status: 400 });

    const recipe = await getRecipeWithSuppliers(sku.trim());
    if (!recipe) return NextResponse.json({ error: `Recette Katana introuvable pour ${sku}` }, { status: 404 });

    const lines = recipe.ingredients.filter((i) => i.supplier && TREATMENT_SUPPLIER_IDS.includes(i.supplier.id));
    if (!lines.length) {
      return NextResponse.json({ error: `Aucun traitement Vacor ou Positive Coating dans la recette de « ${recipe.name} »` }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      productName: recipe.name,
      vacor: lines.map((i) => {
        const g = treatmentGroup(i.supplier!.id, i.sku, i.name);
        return {
          variantId: i.id,
          name: i.name,
          sku: i.sku ?? null,
          perUnit: Number(i.quantity) || 1,
          purchasePrice: i.purchasePrice ?? 0,
          supplierId: i.supplier!.id,
          group: g.key,
          groupLabel: `${g.supplierName} · ${g.colour}`,
          bg: g.bg,
          order: g.order,
        };
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
