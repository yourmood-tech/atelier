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

// Semaine commerciale Mood : jeudi 00:00 → mercredi 23:59 (7 jours)
function getSemaineCommerciale(refDate: Date = new Date()): { debut: Date; fin: Date } {
  // Jeudi = 4 dans getDay() (0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam)
  const daysSinceThu = (refDate.getDay() - 4 + 7) % 7;
  const debut = new Date(refDate);
  debut.setDate(refDate.getDate() - daysSinceThu);
  debut.setHours(0, 0, 0, 0);
  // Fin = jeudi + 6 jours = mercredi 23:59
  const fin = new Date(debut);
  fin.setDate(debut.getDate() + 6);
  fin.setHours(23, 59, 59, 999);
  return { debut, fin };
}

export async function GET(request: Request) {
  if (!SHOPIFY_TOKEN || !SHOPIFY_DOMAIN) {
    return NextResponse.json({ error: "Shopify non configuré" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  // Optionnel : ?date=YYYY-MM-DD pour calculer la semaine d'une autre date (sinon today)
  const dateParam = searchParams.get("date");
  const refDate = dateParam ? new Date(dateParam + "T12:00:00Z") : new Date();
  if (isNaN(refDate.getTime())) {
    return NextResponse.json({ error: "Paramètre date invalide (format YYYY-MM-DD)" }, { status: 400 });
  }

  const { debut, fin } = getSemaineCommerciale(refDate);
  const cacheKey = `mood:ventes-semaine:${debut.toISOString().slice(0, 10)}`;
  const ttl = 900; // 15 min (les ventes de la semaine changent souvent)

  const cached = await redisGet(cacheKey) as {
    ventes: Record<string, VenteAgregee>;
    total_ca: number; total_commandes: number;
    debut: string; fin: string;
  } | null;
  if (cached) {
    return NextResponse.json({ ...cached, source: "cache" });
  }

  const ventes: Record<string, VenteAgregee> = {};
  const ventesParJour: Record<string, { ca: number; count: number }> = {};
  let totalCA = 0;
  let totalCommandes = 0;
  let url: string | null =
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/orders.json?limit=250&status=any&financial_status=paid` +
    `&created_at_min=${encodeURIComponent(debut.toISOString())}&created_at_max=${encodeURIComponent(fin.toISOString())}` +
    `&fields=id,total_price,created_at,line_items,financial_status,cancelled_at`;

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
        created_at: string;
        cancelled_at: string | null;
        financial_status: string;
        line_items: Array<{ title: string; quantity: number; price: string }>;
      }> = data.orders || [];
      for (const o of orders) {
        if (o.cancelled_at) continue;
        totalCommandes++;
        const ca = parseFloat(o.total_price || "0");
        totalCA += ca;
        // Breakdown par jour (YYYY-MM-DD)
        const jour = (o.created_at || "").slice(0, 10);
        if (jour) {
          if (!ventesParJour[jour]) ventesParJour[jour] = { ca: 0, count: 0 };
          ventesParJour[jour].ca += ca;
          ventesParJour[jour].count++;
        }
        for (const li of o.line_items || []) {
          const title = li.title || "Sans titre";
          if (!ventes[title]) ventes[title] = { title, quantity: 0, ca: 0 };
          ventes[title].quantity += li.quantity || 0;
          ventes[title].ca += parseFloat(li.price || "0") * (li.quantity || 0);
        }
      }
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

  // Arrondir les ventes par jour
  const ventesParJourRond: Record<string, { ca: number; count: number }> = {};
  for (const [jour, v] of Object.entries(ventesParJour)) {
    ventesParJourRond[jour] = { ca: Math.round(v.ca), count: v.count };
  }
  const result = {
    ventes,
    ventes_par_jour: ventesParJourRond,
    total_ca: Math.round(totalCA),
    total_commandes: totalCommandes,
    debut: debut.toISOString(),
    fin: fin.toISOString(),
  };
  await redisSetEx(cacheKey, result, ttl);
  return NextResponse.json({ ...result, source: "fresh" });
}
