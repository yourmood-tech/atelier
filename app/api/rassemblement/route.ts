import { NextRequest, NextResponse } from "next/server";
import {
  getOrderFulfillmentData,
  addOrderTag,
  removeOrderTagsBySkuKey,
  setOrderCoffretCountTag,
} from "@/lib/shopify";

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}${mm}${yy}`;
}

// GET /api/rassemblement?order=394907
// Returns order data + coffretCounts map for Pack/Coffret items
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
// Regular item:   { orderId, productId, sku }          → tag prod-ok:ddmmyy:SKU
// Coffret item:   { orderId, productId, sku, n, total } → tag prod-ok-N-sur-TOTAL-SKU
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { orderId: number; productId: number; sku?: string; n?: number; total?: number };
    const { orderId, productId, sku, n, total } = body;

    if (!orderId || !productId) {
      return NextResponse.json({ ok: false, error: "orderId et productId requis" }, { status: 400 });
    }

    const skuPart = (sku || String(productId)).replace(/[^a-zA-Z0-9-_]/g, "");
    const tag = (n !== undefined && total !== undefined)
      ? `prod-ok-${n}-sur-${total}-${skuPart}`
      : `prod-ok-${fmtDate(new Date())}-${skuPart}`;

    await addOrderTag(orderId, tag);
    return NextResponse.json({ ok: true, tag });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/rassemblement
// { orderId, sku, count } → saves coffret-count-SKUPART-N tag on order
export async function PATCH(req: NextRequest) {
  try {
    const { orderId, sku, count } = await req.json() as { orderId: number; sku: string; count: number };
    if (!orderId || !sku || !count || count < 1) {
      return NextResponse.json({ ok: false, error: "orderId, sku et count requis" }, { status: 400 });
    }
    const skuPart = sku.replace(/[^a-zA-Z0-9-_]/g, "");
    await setOrderCoffretCountTag(orderId, skuPart, count);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}

// DELETE /api/rassemblement
// { orderId, sku } → retire tous les tags prod-ok-*-{skuKey} de la commande
export async function DELETE(req: NextRequest) {
  try {
    const { orderId, sku } = await req.json() as { orderId: number; sku: string };
    if (!orderId || !sku) {
      return NextResponse.json({ ok: false, error: "orderId et sku requis" }, { status: 400 });
    }
    const key = sku.replace(/[^a-zA-Z0-9-_]/g, "");
    await removeOrderTagsBySkuKey(orderId, key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}

