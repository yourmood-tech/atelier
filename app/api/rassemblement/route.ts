import { NextRequest, NextResponse } from "next/server";
import { getOrderFulfillmentData, addOrderTag } from "@/lib/shopify";

// GET /api/rassemblement?order=394907
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

// POST /api/rassemblement
// body: { orderId, productId }
// Adds tag: prod-ok:YYYY-MM-DD:productId
export async function POST(req: NextRequest) {
  try {
    const { orderId, productId } = await req.json() as { orderId: number; productId: number };
    if (!orderId || !productId) {
      return NextResponse.json({ ok: false, error: "orderId et productId requis" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const tag = `prod-ok:${today}:${productId}`;
    await addOrderTag(orderId, tag);

    return NextResponse.json({ ok: true, tag });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
