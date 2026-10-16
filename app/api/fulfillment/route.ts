import { NextRequest, NextResponse } from "next/server";
import { getOrderFulfillmentData, createBulkFulfillment } from "@/lib/shopify";
import { controleExpedition } from "@/lib/sav";

// GET /api/fulfillment?order=394907
export async function GET(req: NextRequest) {
  const orderParam = req.nextUrl.searchParams.get("order")?.trim() ?? "";
  if (!orderParam) {
    return NextResponse.json({ ok: false, error: "Paramètre 'order' requis" }, { status: 400 });
  }
  try {
    const data = await getOrderFulfillmentData(orderParam);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}

// POST /api/fulfillment
// body: { orderId, lineItemIds?: number[], trackingNumber?: string }
export async function POST(req: NextRequest) {
  try {
    const { orderId, lineItemIds, trackingNumber } = await req.json() as {
      orderId: number;
      lineItemIds?: number[];
      trackingNumber?: string;
    };

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId requis" }, { status: 400 });
    }

    await createBulkFulfillment(orderId, lineItemIds ?? [], trackingNumber || undefined);
    // commande d'échange de taille : l'original est-il revenu ? sinon → orpheline (outil SAV)
    const ctrl = await controleExpedition(orderId).catch(() => ({ orpheline: false as boolean, original: undefined as string | undefined }));
    return NextResponse.json({ ok: true, orpheline: ctrl.orpheline, original: ctrl.original });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
