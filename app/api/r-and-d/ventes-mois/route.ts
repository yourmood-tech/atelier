import { NextResponse } from "next/server";

const SHOPIFY_TOKEN = process.env.MOOD_SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_DOMAIN = process.env.MOOD_SHOPIFY_DOMAIN;

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

interface VenteAgregee { title: string; quantity: number; ca: number }

async function redisGet(key: string): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.result === "string" ? JSON.parse(j.result) : j?.result;
  } catch { return null; }
}

async function redisSetEx(key: string, value: unknown, ttl: number) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/setex/${encodeURIComponent(key)}/${ttl}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([JSON.stringify(value)]),
    });
  } catch { /* skip */ }
}

export async function GET(request: Request) {
  if (!SHOPIFY_TOKEN || !SHOPIFY_DOMAIN) {
    return NextResponse.json({ error: "Shopify non configuré" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const annee = parseInt(searchParams.get("annee") || "0", 10);
  const mois = parseInt(searchParams.get("mois") || "0", 10);  // 1-12
  if (!annee || !mois || mois < 1 || mois > 12) {
    return NextResponse.json({ error: "annee et mois (1-12) requis" }, { status: 400 });
  }

  const cacheKey = `mood:ventes:${annee}-${String(mois).padStart(2, "0")}`;
  const ttl = 3600; // 1h

  const cached = await redisGet(cacheKey) as { ventes: Record<string, VenteAgregee>; total_ca: number; total_commandes: number } | null;
  if (cached) {
    return NextResponse.json({ ...cached, source: "cache" });
  }

  // Fenêtre du mois
  const debut = new Date(annee, mois - 1, 1).toISOString();
  const fin = new Date(annee, mois, 0, 23, 59, 59).toISOString();

  // Pagination orders
  const ventes: Record<string, VenteAgregee> = {};
  let totalCA = 0;
  let totalCommandes = 0;
  let url: string | null =
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/orders.json?limit=250&status=any&financial_status=paid` +
    `&created_at_min=${encodeURIComponent(debut)}&created_at_max=${encodeURIComponent(fin)}` +
    `&fields=id,total_price,line_items,financial_status,cancelled_at`;

  try {
    while (url) {
      const r: Response = await fetch(url, { headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN } });
      if (!r.ok) {
        return NextResponse.json({ error: `Shopify ${r.status}`, detail: await r.text() }, { status: r.status });
      }
      const data = await r.json();
      const orders: Array<{
        id: number;
        total_price: string;
        cancelled_at: string | null;
        financial_status: string;
        line_items: Array<{ title: string; quantity: number; price: string }>;
      }> = data.orders || [];
      for (const o of orders) {
        if (o.cancelled_at) continue;
        totalCommandes++;
        totalCA += parseFloat(o.total_price || "0");
        for (const li of o.line_items || []) {
          const title = li.title || "Sans titre";
          if (!ventes[title]) ventes[title] = { title, quantity: 0, ca: 0 };
          ventes[title].quantity += li.quantity || 0;
          ventes[title].ca += parseFloat(li.price || "0") * (li.quantity || 0);
        }
      }
      // Pagination via Link header
      const link: string | null = r.headers.get("link");
      const next = link?.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }
  } catch (e) {
    return NextResponse.json(
      { error: "erreur fetch orders", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }

  const result = { ventes, total_ca: Math.round(totalCA), total_commandes: totalCommandes };
  await redisSetEx(cacheKey, result, ttl);
  return NextResponse.json({ ...result, source: "fresh" });
}
