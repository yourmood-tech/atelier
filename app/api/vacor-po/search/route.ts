import { NextRequest, NextResponse } from "next/server";
import { searchTreatmentMaterials } from "@/lib/katana";
import { TREATMENT_SUPPLIER_IDS, treatmentGroup } from "@/lib/vacor";

// Recherche manuelle d'une pièce (nom ou code MTRL-…) chez Technocut / Vacor / Positive Coating,
// quand l'article scanné n'est pas trouvé ou que sa recette ne contient pas la pièce.
export async function POST(req: NextRequest) {
  try {
    const { q, suppliers } = (await req.json()) as { q?: string; suppliers?: number[] };
    if (!q?.trim() || q.trim().length < 2) return NextResponse.json({ ok: true, results: [] });
    const wanted = suppliers?.length ? TREATMENT_SUPPLIER_IDS.filter((id) => suppliers.includes(id)) : TREATMENT_SUPPLIER_IDS;
    const found = await searchTreatmentMaterials(q.trim(), wanted);
    return NextResponse.json({
      ok: true,
      results: found.map((v) => {
        const g = treatmentGroup(v.supplierId, v.sku, v.name);
        return {
          variantId: v.variantId,
          name: v.name,
          sku: v.sku,
          perUnit: 1,
          purchasePrice: v.purchasePrice,
          supplierId: v.supplierId,
          group: g.key,
          groupLabel: g.colour ? `${g.supplierName} · ${g.colour}` : g.supplierName,
          bg: g.bg,
          order: g.order,
        };
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
