import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceItems, matchToOpenPOs, buildCatalog, applyOverrides, type VariantIndex } from "@/lib/icelea/arrivage";
import { fetchIceleaVmap, fetchOpenRows, getOverrides, getProgress } from "@/lib/icelea/variant-index";

export const maxDuration = 60;

// POST (form-data pdf) → plan de réception. Catalogue Icelea + PO ouverts relus à chaque
// appel (toujours à jour, aucun index à maintenir). Renvoie aussi le catalogue complet
// (tous les matériaux Icelea) pour la recherche manuelle des lignes non résolues.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier PDF fourni" }, { status: 400 });

    const parsed = await extractInvoiceItems(Buffer.from(await file.arrayBuffer()));
    const { check } = parsed;
    // seules les pièces de stock se réceptionnent : frais, réparations et paires (boucles d'oreilles) restent hors plan
    const items = parsed.items.filter((it) => !it.service && it.unit !== "pairs");
    if (items.length === 0) {
      return NextResponse.json({ error: "Aucune ligne produit trouvée dans la facture" }, { status: 422 });
    }

    // reprise : si un arrivage a été commencé sous l'ancienne clé (date de facture), on la garde
    let invoiceNo = parsed.invoiceNo;
    let progress: Awaited<ReturnType<typeof getProgress>> = invoiceNo ? await getProgress(invoiceNo) : {};
    if (Object.keys(progress).length === 0 && parsed.legacyInvoiceNo && parsed.legacyInvoiceNo !== invoiceNo) {
      const old = await getProgress(parsed.legacyInvoiceNo);
      if (Object.keys(old).length > 0) { invoiceNo = parsed.legacyInvoiceNo; progress = old; }
    }
    const [vmap, openRows, overrides] = await Promise.all([fetchIceleaVmap(), fetchOpenRows(), getOverrides()]);
    const index: VariantIndex = { vmap, openRows };
    const catalog = buildCatalog(index);
    // matching automatique, puis réapplication des corrections mémorisées (elles priment)
    const rows = applyOverrides(matchToOpenPOs(items, index), overrides, catalog);

    const summary = {
      invoiceLines: items.length,
      invoicePieces: items.reduce((s, it) => s + it.qty, 0),
      serviceLines: parsed.items.filter((it) => it.service).length,
      pairLines: parsed.items.filter((it) => it.unit === "pairs").length,
      receptionRows: rows.length,
      matchedRows: rows.filter((r) => r.match === "code" || r.match === "nom" || r.match === "corrige").length,
      approxRows: rows.filter((r) => r.match === "approx").length,
      manualRows: rows.filter((r) => r.match === "manuel").length,
      noAssocRows: rows.filter((r) => r.match === "aucun").length,
      iceleaVariants: catalog.length,
    };
    return NextResponse.json({ rows, summary, catalog, invoiceNo, progress, check });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
