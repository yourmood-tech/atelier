import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const CACHE_KEY = "perso:devis:list";

async function redisDel(key: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
}

export async function POST(req: Request) {
  const { id } = await req.json() as { id: number };
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  try {
    // Récupérer les tags actuels du draft order
    const getR = await fetch(
      `https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json?fields=id,tags`,
      { headers: { "X-Shopify-Access-Token": TOKEN }, cache: "no-store" }
    );
    if (!getR.ok) return NextResponse.json({ error: `Draft order ${getR.status}` }, { status: getR.status });
    const { draft_order } = await getR.json() as { draft_order: { id: number; tags: string } };

    const currentTags = draft_order.tags ?? "";
    if (currentTags.includes("devis-clos")) {
      return NextResponse.json({ ok: true, message: "Déjà clos" });
    }

    const newTags = currentTags
      ? `${currentTags}, devis-clos`
      : "devis-clos";

    const putR = await fetch(
      `https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`,
      {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ draft_order: { id, tags: newTags } }),
      }
    );
    if (!putR.ok) {
      const txt = await putR.text();
      return NextResponse.json({ error: `Shopify ${putR.status}: ${txt}` }, { status: 500 });
    }

    // Invalider le cache Redis pour forcer un rechargement
    await redisDel(CACHE_KEY);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
