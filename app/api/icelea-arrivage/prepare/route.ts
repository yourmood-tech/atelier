import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceItems, matchToOpenPOs, buildCatalog } from "@/lib/icelea/arrivage";
import { getIndex } from "@/lib/icelea/variant-index";

export const maxDuration = 60;

// POST (form-data pdf) → plan de réception : chaque (produit, taille) + SKU/nom Katana
// + PO(s) ouverts FIFO + code-barres. Nécessite l'index (sinon 409 → construire d'abord).
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier PDF fourni" }, { status: 400 });

    const index = await getIndex();
    if (!index) {
      return NextResponse.json(
        { error: "Index des variants Icelea non construit — lance la construction d'abord.", needIndex: true },
        { status: 409 }
      );
    }

    const items = await extractInvoiceItems(Buffer.from(await file.arrayBuffer()));
    if (items.length === 0) {
      return NextResponse.json({ error: "Aucune ligne produit trouvée dans la facture" }, { status: 422 });
    }
    const rows = matchToOpenPOs(items, index);

    const invoicePieces = items.reduce((s, it) => s + it.qty, 0);
    const matched = rows.filter((r) => r.match !== "manuel");
    const summary = {
      invoiceLines: items.length,
      invoicePieces,
      receptionRows: rows.length,
      matchedRows: matched.length,
      manualRows: rows.length - matched.length,
      openVariants: Object.keys(index.vmap).length,
    };
    return NextResponse.json({ rows, summary, catalog: buildCatalog(index) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
