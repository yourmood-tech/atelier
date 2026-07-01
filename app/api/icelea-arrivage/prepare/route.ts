import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceItems, matchToOpenPOs, buildCatalog, type VariantIndex } from "@/lib/icelea/arrivage";
import { fetchIceleaVmap, fetchOpenRows } from "@/lib/icelea/variant-index";

export const maxDuration = 60;

// POST (form-data pdf) → plan de réception. Catalogue Icelea + PO ouverts relus à chaque
// appel (toujours à jour, aucun index à maintenir). Renvoie aussi le catalogue complet
// (tous les matériaux Icelea) pour la recherche manuelle des lignes non résolues.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier PDF fourni" }, { status: 400 });

    const items = await extractInvoiceItems(Buffer.from(await file.arrayBuffer()));
    if (items.length === 0) {
      return NextResponse.json({ error: "Aucune ligne produit trouvée dans la facture" }, { status: 422 });
    }

    const [vmap, openRows] = await Promise.all([fetchIceleaVmap(), fetchOpenRows()]);
    const index: VariantIndex = { vmap, openRows };
    const rows = matchToOpenPOs(items, index);
    const catalog = buildCatalog(index);

    const summary = {
      invoiceLines: items.length,
      invoicePieces: items.reduce((s, it) => s + it.qty, 0),
      receptionRows: rows.length,
      matchedRows: rows.filter((r) => r.match === "code" || r.match === "nom").length,
      approxRows: rows.filter((r) => r.match === "approx").length,
      manualRows: rows.filter((r) => r.match === "manuel").length,
      iceleaVariants: catalog.length,
    };
    return NextResponse.json({ rows, summary, catalog });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
