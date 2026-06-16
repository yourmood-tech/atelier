import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Calcule les VRAIES ventes Shopify par produit pour l'appli R&D.
// Match par NOM (titre Shopify exact) OU par TAG de collection (additionne tous les produits du tag).
// Période = LA SEMAINE COMMERCIALE (jeudi 00:00 → mercredi 23:59) du créneau du produit dans le
// calendrier. Renvoie la quantité réelle vendue + le TOTAL avec taxes sur cette semaine.

const SHOPIFY_TOKEN = process.env.MOOD_SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_DOMAIN = process.env.MOOD_SHOPIFY_DOMAIN;

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

interface ProduitDemande {
  id: string;
  nom?: string | null;
  shopifySearch?: string | null;
  tag?: string | null;
  since?: string | null; // date du créneau (YYYY-MM-DD) — détermine la semaine commerciale
}

interface LigneCommande {
  product_id: number | null;
  quantity: number;
  price: string;
  tax_lines?: Array<{ price: string }>;
  discount_allocations?: Array<{ amount: string }>;
}

interface Commande {
  cancelled_at: string | null;
  taxes_included: boolean;
  line_items: LigneCommande[];
}

async function redisGet(key: string): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.result === "string" ? JSON.parse(j.result) : j?.result;
  } catch {
    return null;
  }
}

async function redisSetEx(key: string, value: unknown, ttl: number) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/setex/${encodeURIComponent(key)}/${ttl}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([JSON.stringify(value)]),
    });
  } catch {
    /* skip */
  }
}

function norm(s: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Semaine commerciale Mood : jeudi 00:00 → mercredi 23:59 (UTC).
function getSemaineCommerciale(refDate: Date): { debut: Date; fin: Date } {
  const daysSinceThu = (refDate.getUTCDay() - 4 + 7) % 7; // 4 = jeudi
  const debut = new Date(refDate);
  debut.setUTCDate(refDate.getUTCDate() - daysSinceThu);
  debut.setUTCHours(0, 0, 0, 0);
  const fin = new Date(debut);
  fin.setUTCDate(debut.getUTCDate() + 6);
  fin.setUTCHours(23, 59, 59, 999);
  return { debut, fin };
}

// Résout un produit demandé en un ensemble d'IDs produits Shopify (par tag ou par nom exact).
async function resoudreIds(p: ProduitDemande): Promise<number[]> {
  const apiBase = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10`;
  const headers = { "X-Shopify-Access-Token": SHOPIFY_TOKEN as string, "Content-Type": "application/json" };

  let query: string;
  let parTag = false;
  if (p.tag && p.tag.trim()) {
    query = `tag:'${p.tag.trim().replace(/'/g, "")}'`;
    parTag = true;
  } else {
    const titre = (p.shopifySearch || p.nom || "").trim();
    if (!titre) return [];
    query = titre.replace(/'/g, " ");
  }

  const gql = {
    query: `query($q: String!) {
      products(first: 250, query: $q) {
        edges { node { id title } }
      }
    }`,
    variables: { q: query },
  };
  const r = await fetch(`${apiBase}/graphql.json`, { method: "POST", headers, body: JSON.stringify(gql) });
  if (!r.ok) return [];
  const data = await r.json();
  const edges: Array<{ node: { id: string; title: string } }> = data?.data?.products?.edges || [];
  const nodes = edges.map((e) => ({ id: Number(e.node.id.replace("gid://shopify/Product/", "")), title: e.node.title }));

  if (parTag) return nodes.map((n) => n.id);

  // Par nom : titre EXACT en priorité, sinon ceux qui contiennent le nom.
  const cible = norm(p.shopifySearch || p.nom || "");
  const exacts = nodes.filter((n) => norm(n.title) === cible);
  const retenus = exacts.length
    ? exacts
    : nodes.filter((n) => norm(n.title).includes(cible) || cible.includes(norm(n.title)));
  return retenus.map((n) => n.id);
}

export async function POST(request: Request) {
  if (!SHOPIFY_TOKEN || !SHOPIFY_DOMAIN) {
    return NextResponse.json({ error: "Shopify non configuré" }, { status: 503 });
  }
  const token: string = SHOPIFY_TOKEN;
  const domain: string = SHOPIFY_DOMAIN;

  let body: { produits?: ProduitDemande[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const produits = (body.produits || []).filter(
    (p) => p && p.id && ((p.tag && p.tag.trim()) || (p.shopifySearch && p.shopifySearch.trim()) || (p.nom && p.nom.trim()))
  );
  if (!produits.length) return NextResponse.json({ ok: true, resultats: {} });

  // Cache (clé = signature de la demande + jour)
  const jour = new Date().toISOString().slice(0, 10);
  const sig = produits
    .map((p) => `${p.id}:${(p.tag || "").trim()}|${(p.shopifySearch || p.nom || "").trim()}|${p.since || ""}`)
    .sort()
    .join(";");
  const cacheKey = `mood:ventes-reelles-sem:${jour}:${sig.length}:${sig.slice(0, 80)}`;
  const cached = (await redisGet(cacheKey)) as { resultats: Record<string, { qty: number; total: number }> } | null;
  if (cached) return NextResponse.json({ ...cached, source: "cache" });

  // Récupère les ventes d'UNE semaine pour un ensemble de product_id → { pid: {qty, total} }
  async function ventesSemaineParPid(debut: Date, fin: Date, pidSet: Set<number>): Promise<Map<number, { qty: number; total: number }>> {
    const agg = new Map<number, { qty: number; total: number }>();
    let url: string | null =
      `https://${domain}/admin/api/2024-10/orders.json?limit=250&status=any` +
      `&created_at_min=${encodeURIComponent(debut.toISOString())}&created_at_max=${encodeURIComponent(fin.toISOString())}` +
      `&fields=id,cancelled_at,taxes_included,line_items`;
    let pages = 0;
    while (url && pages < 40) {
      pages++;
      const r: Response = await fetch(url, { headers: { "X-Shopify-Access-Token": token } });
      if (!r.ok) throw new Error(`Shopify ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const data = await r.json();
      const orders: Commande[] = data.orders || [];
      for (const o of orders) {
        if (o.cancelled_at) continue;
        for (const li of o.line_items || []) {
          if (li.product_id == null || !pidSet.has(li.product_id)) continue;
          const qty = li.quantity || 0;
          const base = parseFloat(li.price || "0") * qty;
          const disc = (li.discount_allocations || []).reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
          const tax = (li.tax_lines || []).reduce((s, t) => s + parseFloat(t.price || "0"), 0);
          const totalAvecTaxe = o.taxes_included ? base - disc : base - disc + tax;
          const cur = agg.get(li.product_id) || { qty: 0, total: 0 };
          cur.qty += qty;
          cur.total += totalAvecTaxe;
          agg.set(li.product_id, cur);
        }
      }
      const link: string | null = r.headers.get("link");
      const next = link?.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }
    return agg;
  }

  // 1) Résoudre les IDs Shopify de chaque produit (en parallèle)
  const resolutions = await Promise.all(produits.map(async (p) => ({ p, ids: await resoudreIds(p) })));

  // 2) Grouper par semaine commerciale (selon la date du créneau)
  interface Semaine {
    debut: Date;
    fin: Date;
    pids: Set<number>;
    prods: Array<{ id: string; ids: number[] }>;
  }
  const semaines = new Map<string, Semaine>();
  for (const { p, ids } of resolutions) {
    const ref = p.since ? new Date(p.since + "T12:00:00Z") : new Date();
    const { debut, fin } = getSemaineCommerciale(isNaN(ref.getTime()) ? new Date() : ref);
    const key = debut.toISOString().slice(0, 10);
    let w = semaines.get(key);
    if (!w) {
      w = { debut, fin, pids: new Set<number>(), prods: [] };
      semaines.set(key, w);
    }
    w.prods.push({ id: p.id, ids });
    for (const pid of ids) w.pids.add(pid);
  }

  // 3) Une requête par semaine distincte, puis attribution à chaque produit/tag
  const resultats: Record<string, { qty: number; total: number }> = {};
  for (const p of produits) resultats[p.id] = { qty: 0, total: 0 };
  try {
    for (const w of semaines.values()) {
      if (!w.pids.size) continue;
      const agg = await ventesSemaineParPid(w.debut, w.fin, w.pids);
      for (const pr of w.prods) {
        for (const pid of pr.ids) {
          const a = agg.get(pid);
          if (a) {
            resultats[pr.id].qty += a.qty;
            resultats[pr.id].total += a.total;
          }
        }
      }
    }
  } catch (e) {
    return NextResponse.json({ error: "erreur fetch orders", detail: String((e as Error)?.message || e) }, { status: 500 });
  }

  for (const id in resultats) resultats[id].total = Math.round(resultats[id].total * 100) / 100;

  const result = { ok: true, resultats, semaines: semaines.size };
  await redisSetEx(cacheKey, result, 600); // 10 min
  return NextResponse.json({ ...result, source: "fresh" });
}
