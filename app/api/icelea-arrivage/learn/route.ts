import { NextRequest, NextResponse } from "next/server";
import { saveOverride } from "@/lib/icelea/variant-index";

export const maxDuration = 30;

// POST { label, sku } → mémorise la correction (signature du libellé facture → famille SKU).
// Réappliquée automatiquement aux prochaines factures (toutes tailles du produit).
export async function POST(req: NextRequest) {
  try {
    const { label, sku } = (await req.json()) as { label?: string; sku?: string };
    if (!label || !sku) return NextResponse.json({ error: "label et sku requis" }, { status: 400 });
    await saveOverride(label, sku);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
