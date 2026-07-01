import { NextRequest, NextResponse } from "next/server";
import { receiveProduct } from "@/lib/icelea/receive";

export const maxDuration = 60;

// POST { variantId, receivedQty, pickQty } → réceptionne (FIFO partiel sur PO + surplus/sans-PO
// en entrée de stock) puis effectue le picking (sortie). Écrit dans Katana — pas de dé-réception.
export async function POST(req: NextRequest) {
  try {
    const { variantId, receivedQty, pickQty } = (await req.json()) as {
      variantId?: number; receivedQty?: number; pickQty?: number;
    };
    if (!variantId || !receivedQty || receivedQty <= 0) {
      return NextResponse.json({ error: "variantId et receivedQty (>0) requis" }, { status: 400 });
    }
    const result = await receiveProduct(variantId, receivedQty, pickQty ?? 0);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
