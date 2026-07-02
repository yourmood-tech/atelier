import { NextRequest, NextResponse } from "next/server";
import { receiveProduct, mergeReceiveResults, type ReceiveResult } from "@/lib/icelea/receive";
import { getProgress, saveProgress } from "@/lib/icelea/variant-index";

export const maxDuration = 60;

// POST { variantId, receivedQty, pickQty, invoiceNo?, rowSig? } → réceptionne (FIFO partiel
// sur PO + surplus/sans-PO en stock) puis picking. Écrit dans Katana (pas de dé-réception)
// et mémorise la progression pour reprendre l'arrivage plus tard.
export async function POST(req: NextRequest) {
  try {
    const { variantId, receivedQty, pickQty, invoiceNo, rowSig } = (await req.json()) as {
      variantId?: number; receivedQty?: number; pickQty?: number; invoiceNo?: string; rowSig?: string;
    };
    if (!variantId || !receivedQty || receivedQty <= 0) {
      return NextResponse.json({ error: "variantId et receivedQty (>0) requis" }, { status: 400 });
    }
    const result = await receiveProduct(variantId, receivedQty, pickQty ?? 0);
    // On cumule avec une éventuelle réception déjà enregistrée pour cette même ligne
    // (article scanné plusieurs fois dans le même arrivage) → total juste à la reprise.
    if (invoiceNo && rowSig) {
      const prev = (await getProgress(invoiceNo))[rowSig] as ReceiveResult | undefined;
      await saveProgress(invoiceNo, rowSig, prev ? mergeReceiveResults(prev, result) : result);
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
