import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const CACHE_KEY = "perso:devis:list";
const CACHE_TTL_MS = 60_000; // 60 secondes

// Seuls les champs utiles pour la liste — réduit la taille des réponses Shopify
const FIELDS = "id,name,status,email,total_price,currency,updated_at,tags,customer,line_items";

async function redisGet(key: string): Promise<string | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  const d = await r.json();
  return d.result ?? null;
}

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
}

async function fetchDraftOrders(status: "open" | "invoice_sent" | "completed"): Promise<unknown[]> {
  const all: unknown[] = [];
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let url: string | null =
    `https://${STORE}/admin/api/${API_VERSION}/draft_orders.json?status=${status}&limit=250&fields=${FIELDS}&updated_at_min=${encodeURIComponent(since)}`;

  while (url) {
    const r: Response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": TOKEN },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Shopify ${r.status}: ${await r.text()}`);
    const data = await r.json();
    all.push(...(data.draft_orders ?? []));
    const link = r.headers.get("Link") ?? "";
    const next = link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }
  return all;
}

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  // Cache Redis — sauf si refresh explicite
  if (!refresh && REDIS_URL) {
    const cached = await redisGet(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: unknown; ts: number };
      if (Date.now() - ts < CACHE_TTL_MS) {
        return NextResponse.json(data, { headers: { "X-Cache": "HIT" } });
      }
    }
  }

  try {
    const [open, invoiceSent, completed] = await Promise.all([
      fetchDraftOrders("open"),
      fetchDraftOrders("invoice_sent"),
      fetchDraftOrders("completed"),
    ]);

    const hasTag = (d: unknown) => {
      const tags: string = (d as Record<string, unknown>).tags as string ?? "";
      return tags.includes("devis-sur-mesure");
    };

    const enCours = [...open, ...invoiceSent].filter(hasTag);
    const valides = completed.filter(hasTag);
    const result = { enCours, valides };

    // Mettre en cache
    redisSet(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() }));

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
