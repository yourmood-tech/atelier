import { NextResponse } from "next/server";

// Calcule les VRAIES ventes Shopify par produit pour l'appli R&D.
// Pour chaque produit on matche soit par NOM (titre Shopify exact), soit par TAG de collection
// (additionne tous les produits qui portent ce tag). On renvoie la quantité réelle vendue
// et le TOTAL avec taxes, calculé depuis la date de sortie du produit.

const SHOPIFY_TOKEN = process.env.MOOD_SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_DOMAIN = process.env.MOOD_SHOPIFY_DOMAIN;

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

interface ProduitDemande {
  id: string;
  nom?: string | null;
  shopifySearch?: string | null;
  tag?: string | null;
  since?: string | null; // date de sortie ISO (YYYY-MM-DD) — sinon 180 jours
}

interface LigneCommande {
  product_id: number | null;
  quantity: number;
  price: string;
  tax_lines?: Array<{ price: string }>;
  discount_allocations?: Array<{ amount: string }>;
}

interface Commande {
  id: number;
  created_at: string;
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

// Résout un produit demandé en un ensemble d'IDs produits Shopify (par tag ou par nom)
// + la date de création la plus ancienne (= la vraie sortie du produit sur Shopify).
async function resoudreIds(p: ProduitDemande): Promise<{ ids: number[]; createdAt: string | null }> {
  const apiBase = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10`;
  const headers = { "X-Shopify-Access-Token": SHOPIFY_TOKEN as string, "Content-Type": "application/json" };

  let query: string;
  let parTag = false;
  if (p.tag && p.tag.trim()) {
    query = `tag:'${p.tag.trim().replace(/'/g, "")}'`;
    parTag = true;
  } else {
    const titre = (p.shopifySearch || p.nom || "").trim();
    if (!titre) return { ids: [], createdAt: null };
    query = titre.replace(/'/g, " ");
  }

  const gql = {
    query: `query($q: String!) {
      products(first: 250, query: $q) {
        edges { node { id title createdAt } }
      }
    }`,
    variables: { q: query },
  };
  const r = await fetch(`${apiBase}/graphql.json`, { method: "POST", headers, body: JSON.stringify(gql) });
  if (!r.ok) return { ids: [], createdAt: null };
  const data = await r.json();
  const edges: Array<{ node: { id: string; title: string; createdAt: string } }> = data?.data?.products?.edges || [];
  const nodes = edges.map((e) => ({
    id: Number(e.node.id.replace("gid://shopify/Product/", "")),
    title: e.node.title,
    createdAt: e.node.createdAt,
  }));

  let retenus = nodes;
  if (!parTag) {
    // Par nom : on privilégie le titre EXACT, sinon ceux qui contiennent le nom.
    const cible = norm(p.shopifySearch || p.nom || "");
    const exacts = nodes.filter((n) => norm(n.title) === cible);
    retenus = exacts.length
      ? exacts
      : nodes.filter((n) => norm(n.title).includes(cible) || cible.includes(norm(n.title)));
  }

  let createdAt: string | null = null;
  for (const n of retenus) {
    if (n.createdAt && (!createdAt || n.createdAt < createdAt)) createdAt = n.createdAt;
  }
  return { ids: retenus.map((n) => n.id), createdAt };
}

export async function POST(request: Request) {
  if (!SHOPIFY_TOKEN || !SHOPIFY_DOMAIN) {
    return NextResponse.json({ error: "Shopify non configuré" }, { status: 503 });
  }

  let body: { produits?: ProduitDemande[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const produits = (body.produits || []).filter((p) => p && p.id && ((p.tag && p.tag.trim()) || (p.shopifySearch && p.shopifySearch.trim()) || (p.nom && p.nom.trim())));
  if (!produits.length) return NextResponse.json({ ok: true, resultats: {} });

  // Cache (clé = signature de la demande + jour)
  const jour = new Date().toISOString().slice(0, 10);
  const sig = produits
    .map((p) => `${p.id}:${(p.tag || "").trim()}|${(p.shopifySearch || p.nom || "").trim()}|${p.since || ""}`)
    .sort()
    .join(";");
  const cacheKey = `mood:ventes-reelles:${jour}:${sig.length}:${sig.slice(0, 80)}`;
  const cached = (await redisGet(cacheKey)) as { resultats: Record<string, { qty: number; total: number }> } | null;
  if (cached) return NextResponse.json({ ...cached, source: "cache" });

  // 1) Résoudre les IDs Shopify + date de sortie réelle de chaque produit (en parallèle)
  const resolutions = await Promise.all(
    produits.map(async (p) => {
      const res = await resoudreIds(p);
      return { p, ids: res.ids, createdAt: res.createdAt };
    })
  );

  // 2) Date « depuis la sortie » par produit : createdAt Shopify, sinon date calendrier, sinon 180 j.
  const defautSince = new Date();
  defautSince.setDate(defautSince.getDate() - 180);
  function sinceDe(createdAt: string | null, cardDate: string | null | undefined): Date {
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (cardDate) {
      const d = new Date(cardDate + "T00:00:00Z");
      if (!isNaN(d.getTime())) return d;
    }
    return defautSince;
  }

  let earliest = new Date();
  for (const { p, createdAt } of resolutions) {
    const d = sinceDe(createdAt, p.since);
    if (d < earliest) earliest = d;
  }

  // Index produit_id -> liste de (produit demandé + sa date since)
  const pidToProduits = new Map<number, Array<{ id: string; since: Date }>>();
  for (const { p, ids, createdAt } of resolutions) {
    const since = sinceDe(createdAt, p.since);
    for (const pid of ids) {
      if (!pidToProduits.has(pid)) pidToProduits.set(pid, []);
      pidToProduits.get(pid)!.push({ id: p.id, since });
    }
  }

  // 3) Balayage des commandes payées depuis earliest
  const resultats: Record<string, { qty: number; total: number }> = {};
  for (const p of produits) resultats[p.id] = { qty: 0, total: 0 };

  let url: string | null =
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/orders.json?limit=250&status=any&financial_status=paid` +
    `&created_at_min=${encodeURIComponent(earliest.toISOString())}` +
    `&fields=id,created_at,cancelled_at,taxes_included,line_items`;
  let pages = 0;
  try {
    while (url && pages < 250) {
      pages++;
      const r: Response = await fetch(url, { headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN } });
      if (!r.ok) {
        return NextResponse.json({ error: `Shopify ${r.status}`, detail: (await r.text()).slice(0, 300) }, { status: r.status });
      }
      const data = await r.json();
      const orders: Commande[] = data.orders || [];
      for (const o of orders) {
        if (o.cancelled_at) continue;
        const dateCmd = new Date(o.created_at);
        for (const li of o.line_items || []) {
          if (li.product_id == null) continue;
          const cibles = pidToProduits.get(li.product_id);
          if (!cibles) continue;
          const qty = li.quantity || 0;
          const base = parseFloat(li.price || "0") * qty;
          const disc = (li.discount_allocations || []).reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
          const tax = (li.tax_lines || []).reduce((s, t) => s + parseFloat(t.price || "0"), 0);
          const totalAvecTaxe = o.taxes_included ? base - disc : base - disc + tax;
          for (const c of cibles) {
            if (dateCmd >= c.since) {
              resultats[c.id].qty += qty;
              resultats[c.id].total += totalAvecTaxe;
            }
          }
        }
      }
      const link: string | null = r.headers.get("link");
      const next = link?.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }
  } catch (e) {
    return NextResponse.json({ error: "erreur fetch orders", detail: String((e as Error)?.message || e) }, { status: 500 });
  }

  for (const id in resultats) resultats[id].total = Math.round(resultats[id].total * 100) / 100;

  const result = { ok: true, resultats, pages };
  await redisSetEx(cacheKey, result, 600); // 10 min
  return NextResponse.json({ ...result, source: "fresh" });
}
