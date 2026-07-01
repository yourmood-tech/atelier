import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceItems, matchToOpenPOs, buildCatalog, type VariantIndex } from "@/lib/icelea/arrivage";
import { getVmap, fetchOpenRows, resolveMissing } from "@/lib/icelea/variant-index";

export const maxDuration = 60;

// POST (form-data pdf) → plan de réception. Les PO ouverts sont TOUJOURS relus ici
// (donc à jour sans reconstruire l'index) ; les variants sont en cache et les nouveaux
// sont résolus automatiquement au passage. 409 si le cache de variants n'existe pas encore.
export async function POST(req: NextRequest) {
  try {
    const started = Date.now();
    const form = await req.formData();
    const file = form.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier PDF fourni" }, { status: 400 });

    const vmap = await getVmap();
    if (!vmap) {
      return NextResponse.json(
        { error: "Index des variants Icelea non construit — lance la construction d'abord.", needIndex: true },
        { status: 409 }
      );
    }

    // parse facture + PO ouverts frais (toujours à jour)
    const items = await extractInvoiceItems(Buffer.from(await file.arrayBuffer()));
    if (items.length === 0) {
      return NextResponse.json({ error: "Aucune ligne produit trouvée dans la facture" }, { status: 422 });
    }
    const openRows = await fetchOpenRows();

    // résout automatiquement les variants nouveaux (absents du cache), dans le temps restant
    const ids = [...new Set(openRows.map((r) => r.vid))];
    const { resolved, remaining } = await resolveMissing(vmap, ids, started + 50000);

    const index: VariantIndex = { vmap, openRows };
    const rows = matchToOpenPOs(items, index);

    const summary = {
      invoiceLines: items.length,
      invoicePieces: items.reduce((s, it) => s + it.qty, 0),
      receptionRows: rows.length,
      matchedRows: rows.filter((r) => r.match === "code" || r.match === "nom").length,
      approxRows: rows.filter((r) => r.match === "approx").length,
      manualRows: rows.filter((r) => r.match === "manuel").length,
      openVariants: Object.keys(vmap).length,
      newResolved: resolved,
      unresolved: remaining, // variants pas encore indexés (relancer / reconstruire si > 0)
    };
    return NextResponse.json({ rows, summary, catalog: buildCatalog(index) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
