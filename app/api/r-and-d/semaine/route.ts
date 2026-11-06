// R&D — une semaine commerciale (jeudi → mercredi) en un coup :
//  • les nouveautés vraiment mises en ligne sur yourmood.net cette semaine (date de publication) + leurs ventes de la semaine
//  • les lignes fixes : Starter pack (étiquette starter), Garde mood (étiquette garde-mood),
//    Joaillerie (pièces vendues plus de 600.- sur yourmood.net + tout le site Mood Joaillerie)
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DOMAIN = process.env.MOOD_SHOPIFY_DOMAIN || process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN;
const J_DOMAIN = process.env.MOODJOAILLERIE_SHOPIFY_DOMAIN;
const J_TOKEN = process.env.MOODJOAILLERIE_SHOPIFY_ACCESS_TOKEN;
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const EXCLU = /devis|carte cadeau|bon cadeau|gift|seconde main|^\s*\d+\s+(novembre|décembre)|papier cadeau|service|réparation|rénovation|frais/i;
const SEUIL_JOAILLERIE = 600;

interface Ligne { product_id: number | null; quantity: number; price: string; title: string; discount_allocations?: Array<{ amount: string }> }
interface Commande { id: number; cancelled_at: string | null; line_items: Ligne[]; total_price?: string }

async function redisGet(key: string): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } });
    const j = await r.json();
    return typeof j?.result === "string" ? JSON.parse(j.result) : j?.result;
  } catch { return null; }
}
async function redisSet(key: string, value: unknown) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try { await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, { method: "POST", headers: { Authorization: `Bearer ${REDIS_TOKEN}` }, body: JSON.stringify(value) }); } catch { /* */ }
}
async function redisSetEx(key: string, value: unknown, ttl: number) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try { await fetch(`${REDIS_URL}/setex/${encodeURIComponent(key)}/${ttl}`, { method: "POST", headers: { Authorization: `Bearer ${REDIS_TOKEN}` }, body: JSON.stringify(value) }); } catch { /* */ }
}

async function getRetry(url: string, token: string): Promise<Response> {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { "X-Shopify-Access-Token": token } });
    if (r.ok) return r;
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 1500 * (i + 1))); continue; }
    throw new Error(`Shopify ${r.status}`);
  }
  throw new Error("Shopify indisponible");
}

async function commandes(domain: string, token: string, debut: Date, fin: Date, fields: string): Promise<Commande[]> {
  const out: Commande[] = [];
  let url: string | null = `https://${domain}/admin/api/2024-10/orders.json?limit=250&status=any&created_at_min=${encodeURIComponent(debut.toISOString())}&created_at_max=${encodeURIComponent(fin.toISOString())}&fields=${fields}`;
  let pages = 0;
  while (url && pages < 40) {
    pages++;
    const r = await getRetry(url, token);
    const d = await r.json();
    for (const o of d.orders || []) out.push(o);
    const m = r.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/);
    url = m ? m[1] : null;
  }
  return out.filter((o) => !o.cancelled_at);
}

async function gql(query: string, variables: Record<string, unknown>) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`https://${DOMAIN}/admin/api/2025-01/graphql.json`, { method: "POST", headers: { "X-Shopify-Access-Token": TOKEN as string, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const j = await r.json();
    if (j?.errors && JSON.stringify(j.errors).includes("THROTTLED")) { await new Promise((s) => setTimeout(s, 2000)); continue; }
    return j;
  }
  return null;
}

const montant = (l: Ligne) => parseFloat(l.price) * l.quantity - (l.discount_allocations || []).reduce((s, d) => s + parseFloat(d.amount), 0);

export async function GET(request: Request) {
  if (!DOMAIN || !TOKEN) return NextResponse.json({ error: "accès Shopify absent" }, { status: 503 });
  const u = new URL(request.url);
  const debutStr = u.searchParams.get("debut");
  if (!debutStr || !/^\d{4}-\d{2}-\d{2}$/.test(debutStr)) return NextResponse.json({ error: "debut=YYYY-MM-DD requis" }, { status: 400 });
  // semaine commerciale : jeudi 00:00 → mercredi 23:59 (heure suisse ≈ UTC+1)
  const debut = new Date(debutStr + "T00:00:00+01:00");
  const fin = new Date(debut.getTime() + 7 * 86400000 - 1);
  const enCours = Date.now() < fin.getTime();
  const ck = `mood:rd-semaine:v4:${debutStr}`;
  // semaine terminée et déjà bloquée : chiffres définitifs, on ne recalcule plus jamais
  const cleFige = `mood:rd-semaine-fige:${debutStr}`;
  const fige = await redisGet(cleFige);
  if (fige) return NextResponse.json({ ...(fige as object), source: "bloque" });
  if (!u.searchParams.get("frais")) {
    const c = await redisGet(ck);
    if (c && enCours) return NextResponse.json({ ...(c as object), source: "cache" });
  }

  try {
    // 1) ventes de la semaine sur yourmood.net, par produit
    const cmds = await commandes(DOMAIN, TOKEN, debut, fin, "id,cancelled_at,line_items");
    const parProduit: Record<string, { qty: number; total: number }> = {};
    const titres: Record<string, string> = {};
    let joaQty = 0, joaTotal = 0;
    for (const o of cmds) for (const l of o.line_items) {
      const t = montant(l);
      if (l.product_id) { const k = String(l.product_id); parProduit[k] = parProduit[k] || { qty: 0, total: 0 }; parProduit[k].qty += l.quantity; parProduit[k].total += t; titres[k] = l.title || ""; }
      if (parseFloat(l.price) > SEUIL_JOAILLERIE && !EXCLU.test(l.title || "") && !/coffret|starter/i.test(l.title || "")) { joaQty += l.quantity; joaTotal += t; }
    }
    // 2) étiquettes des produits vendus (starter / garde-mood)
    const ids = Object.keys(parProduit);
    const tags: Record<string, string[]> = {};
    const infos: Record<string, { type: string; cree: string }> = {};
    for (let i = 0; i < ids.length; i += 100) {
      const j = await gql(`query($ids:[ID!]!){nodes(ids:$ids){... on Product{id tags productType createdAt}}}`, { ids: ids.slice(i, i + 100).map((x) => `gid://shopify/Product/${x}`) });
      for (const n of j?.data?.nodes || []) if (n) { const k = n.id.split("/").pop(); tags[k] = (n.tags || []).map((t: string) => t.toLowerCase()); infos[k] = { type: n.productType || "", cree: n.createdAt || "" }; }
    }
    const fixe = (tagsOk: string[], titre: RegExp) => { let qty = 0, total = 0; for (const k of ids) if ((tags[k] || []).some((t) => tagsOk.includes(t)) || titre.test(titres[k] || "")) { qty += parProduit[k].qty; total += parProduit[k].total; } return { qty, total: Math.round(total) }; };

    // 3) nouveautés mises en ligne cette semaine (date de publication sur la boutique)
    const q = `created_at:>='${debut.toISOString()}' AND created_at:<='${fin.toISOString()}' AND status:active`;
    const sorties: Array<Record<string, unknown>> = [];
    let after: string | null = null;
    for (let p = 0; p < 5; p++) {
      const j = await gql(`query($q:String!,$a:String){products(first:100,after:$a,query:$q,sortKey:CREATED_AT){pageInfo{hasNextPage endCursor} nodes{id title handle productType tags publishedAt createdAt status featuredImage{url} priceRangeV2{minVariantPrice{amount}}}}}`, { q, a: after });
      const d = j?.data?.products;
      if (!d) break;
      for (const n of d.nodes) {
        if (n.status !== "ACTIVE" || EXCLU.test(n.title)) continue;
        const pid = n.id.split("/").pop();
        sorties.push({ id: pid, title: n.title, handle: n.handle, type: n.productType, tags: n.tags, publishedAt: (n.publishedAt && n.publishedAt >= n.createdAt ? n.publishedAt : n.createdAt),
          image: n.featuredImage?.url ? n.featuredImage.url + (n.featuredImage.url.includes("?") ? "&" : "?") + "width=300" : null,
          prix: parseFloat(n.priceRangeV2?.minVariantPrice?.amount || "0"), qty: parProduit[pid]?.qty || 0, total: Math.round(parProduit[pid]?.total || 0) });
      }
      if (!d.pageInfo.hasNextPage) break;
      after = d.pageInfo.endCursor;
    }

    // 4) site Mood Joaillerie (toute la semaine)
    let joaStore: { commandes: number; total: number } | null = null;
    if (J_DOMAIN && J_TOKEN) {
      try {
        const jc = await commandes(J_DOMAIN, J_TOKEN, debut, fin, "id,cancelled_at,total_price,line_items");
        joaStore = { commandes: jc.length, total: Math.round(jc.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0)) };
      } catch { joaStore = null; }
    }

    const out = {
      debut: debutStr, enCours,
      sorties,
      ventesParProduit: parProduit,
      fixes: {
        starter: fixe(["starter", "starter pack", "starterpack"], /starter pack|in the mood for/i),
        garde: fixe(["garde-mood", "garde mood", "gardemood"], /garde-mood|garde mood/i),
        coffret: (() => { // coffrets du mois : fiches « coffret » créées depuis ~2 semaines avant le début du mois de la semaine
          const moisDebut = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), 1) - 15 * 86400000).toISOString();
          let qty = 0, total = 0;
          for (const k of ids) { const inf = infos[k]; const t = titres[k] || "";
            const estCoffret = /coffret/i.test(inf?.type || "") || /^\W*coffret/i.test(t) || (tags[k] || []).includes("coffret du mois");
            if (estCoffret && !/starter|garde/i.test(t) && (inf?.cree || "") >= moisDebut) { qty += parProduit[k].qty; total += parProduit[k].total; } }
          return { qty, total: Math.round(total) };
        })(),
        joaillerie: { qty: joaQty, total: Math.round(joaTotal + (joaStore?.total || 0)), yourmood: Math.round(joaTotal), siteJoaillerie: joaStore },
      },
    };
    if (enCours) await redisSetEx(ck, out, 900);
    else await redisSet(cleFige, { ...out, bloqueLe: new Date().toISOString() }); // bloqué pour toujours
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
