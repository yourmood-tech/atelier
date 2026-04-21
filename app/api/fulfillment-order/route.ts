import { NextRequest, NextResponse } from "next/server";
import {
  getOrderFulfillmentData,
  cancelShopifyFulfillment,
  createShopifyFulfillment,
  addOrderTag,
} from "@/lib/shopify";
import { sendFulfillmentNotification } from "@/lib/email";
import { auth } from "@/auth";

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
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const performedBy = session?.user?.email ?? "inconnu";

    const body = await req.json() as Record<string, unknown>;
    const action = body.action as "fulfill" | "unfulfill";
    const orderId = body.orderId as number;
    const orderName = (body.orderName as string) ?? "";
    const lineItemTitle = (body.lineItemTitle as string) ?? "";
    const variantTitle = (body.variantTitle as string) ?? "";
    const sku = (body.sku as string) ?? "";
    const quantity = (body.quantity as number) ?? 1;

    if (action === "unfulfill") {
      const fulfillmentId = body.fulfillmentId as number;
      const targetLineItemId = body.lineItemId as number;
      if (!fulfillmentId) {
        return NextResponse.json({ ok: false, error: "fulfillmentId requis pour unfulfill" }, { status: 400 });
      }

      // Identify siblings in the same fulfillment BEFORE canceling
      const orderDataBefore = await getOrderFulfillmentData(String(orderId));
      const siblings = orderDataBefore.lineItems.filter(
        (li) => li.fulfillmentId === fulfillmentId && li.lineItemId !== targetLineItemId
      );

      // Cancel the entire fulfillment
      await cancelShopifyFulfillment(fulfillmentId);

      // Reload tags to check for "en production"
      const orderData = await getOrderFulfillmentData(String(orderId));
      const hasEnProduction = orderData.tags.some(
        (t) => t.toLowerCase() === TAG_EN_PRODUCTION
      );
      if (hasEnProduction) {
        await addOrderTag(orderId, TAG_ERROR);
      }

      const siblingsUnfulfilled = siblings.map((li) => ({ lineItemId: li.lineItemId, title: li.title }));

      // Send notification (non-blocking)
      sendFulfillmentNotification({
        action: "unfulfill",
        orderName,
        lineItemTitle,
        variantTitle,
        sku,
        quantity,
        performedBy,
        siblingsUnfulfilled,
      }).catch(() => null);

      return NextResponse.json({ ok: true, tagAdded: hasEnProduction, siblingsUnfulfilled });
    }

    if (action === "fulfill") {
      const lineItemId = body.lineItemId as number;
      if (!orderId || !lineItemId) {
        return NextResponse.json(
          { ok: false, error: "orderId et lineItemId requis" },
          { status: 400 }
        );
      }

      await createShopifyFulfillment(orderId, lineItemId, quantity);

      // Send notification (non-blocking)
      sendFulfillmentNotification({
        action: "fulfill",
        orderName,
        lineItemTitle,
        variantTitle,
        sku,
        quantity,
        performedBy,
      }).catch(() => null);

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
