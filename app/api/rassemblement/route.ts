import { NextRequest, NextResponse } from "next/server";
import {
  getOrderFulfillmentData,
  addOrderTag,
  getProductCoffretCount,
  setProductCoffretCount,
} from "@/lib/shopify";

function isCoffret(title: string) {
  const t = title.toLowerCase();
  return t.startsWith("pack") || t.startsWith("coffret") || t.includes("starter pack");
}

function sanitizeTitle(title: string): string {
  return title.replace(/,/g, " ").trim();
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

    // Fetch coffret counts for Pack/Coffret items (deduplicated by productId)
    const coffretProductIds = [
      ...new Set(data.lineItems.filter(li => isCoffret(li.title)).map(li => li.productId)),
    ];
    const coffretCounts: Record<number, number | null> = {};
    await Promise.all(
      coffretProductIds.map(async (pid) => {
        coffretCounts[pid] = await getProductCoffretCount(pid);
      })
    );

    return NextResponse.json({ ok: true, data, coffretCounts });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}

// POST /api/rassemblement
// Regular item:   { orderId, productId, title }               → tag prod-ok:YYYY-MM-DD:name
// Coffret item:   { orderId, productId, title, n, total }     → tag prod-ok-N/TOTAL:YYYY-MM-DD:name
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { orderId: number; productId: number; title?: string; n?: number; total?: number };
    const { orderId, productId, title, n, total } = body;

    if (!orderId || !productId) {
      return NextResponse.json({ ok: false, error: "orderId et productId requis" }, { status: 400 });
    }

    const name = sanitizeTitle(title ?? String(productId));
    const today = new Date().toISOString().slice(0, 10);
    const tag = (n !== undefined && total !== undefined)
      ? `prod-ok-${n}/${total}:${today}:${name}`
      : `prod-ok:${today}:${name}`;

    await addOrderTag(orderId, tag);
    return NextResponse.json({ ok: true, tag });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}

// PATCH /api/rassemblement
// { productId, count } → saves coffret_count metafield on product
export async function PATCH(req: NextRequest) {
  try {
    const { productId, count } = await req.json() as { productId: number; count: number };
    if (!productId || !count || count < 1) {
      return NextResponse.json({ ok: false, error: "productId et count requis" }, { status: 400 });
    }
    await setProductCoffretCount(productId, count);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
