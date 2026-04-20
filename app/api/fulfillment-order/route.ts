import { NextRequest, NextResponse } from "next/server";
import {
  getOrderFulfillmentData,
  cancelShopifyFulfillment,
  createShopifyFulfillment,
  addOrderTag,
} from "@/lib/shopify";

const TAG_ERROR = "ATTENTION-ERREUR-FULFILL-POS-A-REIMPRIMER";
const TAG_EN_PRODUCTION = "en production";

// GET /api/fulfillment-order?order=392523
export async function GET(req: NextRequest) {
  try {
    const orderParam = req.nextUrl.searchParams.get("order")?.trim() ?? "";
    if (!orderParam) {
      return NextResponse.json({ ok: false, error: "Paramètre 'order' requis" }, { status: 400 });
    }
    const data = await getOrderFulfillmentData(orderParam);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/fulfillment-order
// body: { action: "fulfill" | "unfulfill", orderId, lineItemId, fulfillmentId?, fulfillmentOrderId?, fulfillmentOrderLineItemId?, fulfillmentOrderLineItemQuantity? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as string;
    const orderId = body.orderId as number;

    if (action === "unfulfill") {
      const fulfillmentId = body.fulfillmentId as number;
      if (!fulfillmentId) {
        return NextResponse.json({ ok: false, error: "fulfillmentId requis pour unfulfill" }, { status: 400 });
      }

      await cancelShopifyFulfillment(fulfillmentId);

      // Reload tags to check for "en production"
      const orderData = await getOrderFulfillmentData(String(orderId));
      const hasEnProduction = orderData.tags.some(
        (t) => t.toLowerCase() === TAG_EN_PRODUCTION
      );
      if (hasEnProduction) {
        await addOrderTag(orderId, TAG_ERROR);
      }

      return NextResponse.json({ ok: true, tagAdded: hasEnProduction });
    }

    if (action === "fulfill") {
      const fulfillmentOrderId = body.fulfillmentOrderId as number;
      const fulfillmentOrderLineItemId = body.fulfillmentOrderLineItemId as number;
      const fulfillmentOrderLineItemQuantity = (body.fulfillmentOrderLineItemQuantity as number) ?? 1;

      if (!fulfillmentOrderId || !fulfillmentOrderLineItemId) {
        return NextResponse.json(
          { ok: false, error: "fulfillmentOrderId et fulfillmentOrderLineItemId requis" },
          { status: 400 }
        );
      }

      await createShopifyFulfillment(fulfillmentOrderId, [
        { id: fulfillmentOrderLineItemId, quantity: fulfillmentOrderLineItemQuantity },
      ]);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `Action inconnue: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
