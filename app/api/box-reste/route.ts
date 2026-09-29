import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Combien de box « On n'en a jamais trop » reste-t-il ?
// 300 au départ, moins ce qui a déjà été commandé.
const TOTAL = 300;
const PRODUIT = 15826812076409;
const TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN;
const BOUTIQUE = "yourmood.myshopify.com";

export async function GET() {
  try {
    if (!TOKEN) return NextResponse.json({ total: TOTAL, vendues: 0, reste: TOTAL });
    let url: string | null =
      `https://${BOUTIQUE}/admin/api/2025-01/orders.json?status=any&limit=250&fields=id,line_items&created_at_min=2026-09-29T00:00:00%2B02:00`;
    let vendues = 0;
    for (let page = 0; page < 8 && url; page++) {
      const r: Response = await fetch(url, { headers: { "X-Shopify-Access-Token": TOKEN } });
      if (!r.ok) break;
      const j = (await r.json()) as { orders: Array<{ line_items: Array<{ product_id: number | null; quantity: number }> }> };
      for (const o of j.orders) {
        for (const li of o.line_items) if (li.product_id === PRODUIT) vendues += li.quantity;
      }
      const link = r.headers.get("link") || "";
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      url = m ? m[1] : null;
    }
    const reste = Math.max(0, TOTAL - vendues);
    return NextResponse.json({ total: TOTAL, vendues, reste }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ total: TOTAL, vendues: 0, reste: TOTAL });
  }
}
