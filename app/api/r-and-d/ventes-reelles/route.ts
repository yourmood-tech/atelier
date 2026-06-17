import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Calcule les VRAIES ventes Shopify par produit pour l'appli R&D.
// Match par NOM (titre Shopify exact) OU par TAG de collection (additionne tous les produits du tag).
// Période = LA SEMAINE COMMERCIALE (jeudi 00:00 → mercredi 23:59 UTC) du créneau du produit.
// Compte AUSSI les ventes en BUNDLE (Simple Bundles) : un pack vendu via le configurateur est
// éclaté en lignes-composants portant la propriété _sb_bundle_title/_sb_bundle_group ; on regroupe
// par bundle (1 groupe = 1 pack) et on additionne le prix des composants.

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
  periodeType?: string | null; // 'semaine' (défaut) ou 'mois'
  mois?: string | null; // 'YYYY-MM' si periodeType === 'mois'
}

interface Propriete {
  name: string;
  value: string;
}
interface LigneCommande {
  product_id: number | null;
  quantity: number;
  price: string;
  tax_lines?: Array<{ price: string }>;
  discount_allocations?: Array<{ amount: string }>;
  properties?: Propriete[];
}
interface Commande {
  id: number;
  cancelled_at: string | null;
  taxes_included: boolean;
  line_items: LigneCommande[];
}

interface Cible {
  id: string;
  pids: Set<number>;
  skus: Set<string>;
  vids: Set<number>;
}

async function redisGet(key: string): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } });
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
  const daysSinceThu = (refDate.getUTCDay() - 4 + 7) % 7;
  const debut = new Date(refDate);
  debut.setUTCDate(refDate.getUTCDate() - daysSinceThu);
  debut.setUTCHours(0, 0, 0, 0);
  const fin = new Date(debut);
  fin.setUTCDate(debut.getUTCDate() + 6);
  fin.setUTCHours(23, 59, 59, 999);
  return { debut, fin };
}

function prop(li: LigneCommande, name: string): string | undefined {
  return (li.properties || []).find((p) => p.name === name)?.value;
}

// Résout un produit demandé → IDs produits + SKUs + IDs de variantes (pour matcher les bundles).
async function resoudreProduit(p: ProduitDemande): Promise<{ ids: number[]; skus: string[]; vids: number[] }> {
  const apiBase = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10`;
  const headers = { "X-Shopify-Access-Token": SHOPIFY_TOKEN as string, "Content-Type": "application/json" };

  let query: string;
  let parTag = false;
  if (p.tag && p.tag.trim()) {
    query = `tag:'${p.tag.trim().replace(/'/g, "")}'`;
    parTag = true;
  } else {
    const titre = (p.shopifySearch || p.nom || "").trim();
    if (!titre) return { ids: [], skus: [], vids: [] };
    query = titre.replace(/'/g, " ");
  }

  const gql = {
    query: `query($q: String!) {
      products(first: 100, query: $q) {
        edges { node { id title variants(first: 100) { edges { node { id sku } } } } }
      }
    }`,
    variables: { q: query },
  };
  const r = await fetch(`${apiBase}/graphql.json`, { method: "POST", headers, body: JSON.stringify(gql) });
  if (!r.ok) return { ids: [], skus: [], vids: [] };
  const data = await r.json();
  interface Node { id: string; title: string; variants?: { edges: Array<{ node: { id: string; sku: string | null } }> } }
  const edges: Array<{ node: Node }> = data?.data?.products?.edges || [];
  let retenus = edges.map((e) => e.node);
  if (!parTag) {
    const cible = norm(p.shopifySearch || p.nom || "");
    const exacts = retenus.filter((n) => norm(n.title) === cible);
    retenus = exacts.length ? exacts : retenus.filter((n) => norm(n.title).includes(cible) || cible.includes(norm(n.title)));
  }
  const ids: number[] = [];
  const skus: string[] = [];
  const vids: number[] = [];
  for (const n of retenus) {
    ids.push(Number(n.id.replace("gid://shopify/Product/", "")));
    for (const v of n.variants?.edges || []) {
      if (v.node.sku) skus.push(v.node.sku);
      vids.push(Number(v.node.id.replace("gid://shopify/ProductVariant/", "")));
    }
  }
  return { ids, skus, vids };
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

  const jour = new Date().toISOString().slice(0, 10);
  const sig = produits
    .map((p) => `${p.id}:${(p.tag || "").trim()}|${(p.shopifySearch || p.nom || "").trim()}|${p.since || ""}`)
    .sort()
    .join(";");
  const cacheKey = `mood:ventes-reelles-b:${jour}:${sig.length}:${sig.slice(0, 80)}`;
  const cached = (await redisGet(cacheKey)) as { resultats: Record<string, { qty: number; total: number }> } | null;
  if (cached) return NextResponse.json({ ...cached, source: "cache" });

  // Récupère toutes les commandes d'une semaine commerciale (1 fois, mises en mémoire)
  async function commandesSemaine(debut: Date, fin: Date): Promise<Commande[]> {
    const out: Commande[] = [];
    let url: string | null =
      `https://${domain}/admin/api/2024-10/orders.json?limit=250&status=any` +
      `&created_at_min=${encodeURIComponent(debut.toISOString())}&created_at_max=${encodeURIComponent(fin.toISOString())}` +
      `&fields=id,cancelled_at,taxes_included,line_items`;
    let pages = 0;
    while (url && pages < 40) {
      pages++;
      // Réessai automatique si Shopify répond "trop de requêtes" (429) ou erreur serveur (5xx).
      let r: Response | null = null;
      for (let essai = 0; essai < 6; essai++) {
        r = await fetch(url, { headers: { "X-Shopify-Access-Token": token } });
        if (r.ok) break;
        if (r.status === 429 || r.status >= 500) {
          const retryAfter = parseFloat(r.headers.get("retry-after") || "") || 2;
          await new Promise((res) => setTimeout(res, Math.min(5000, retryAfter * 1000)));
          continue;
        }
        throw new Error(`Shopify ${r.status}: ${(await r.text()).slice(0, 200)}`);
      }
      if (!r || !r.ok) throw new Error(`Shopify indisponible (trop de requêtes) après plusieurs essais`);
      const data = await r.json();
      for (const o of (data.orders || []) as Commande[]) out.push(o);
      const link: string | null = r.headers.get("link");
      const next = link?.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }
    return out;
  }

  // Calcule (qty packs, total avec taxes) d'une cible sur un lot de commandes — direct + bundle.
  function calculer(cible: Cible, commandes: Commande[]): { qty: number; total: number } {
    let directQty = 0;
    let directTot = 0;
    const groupes = new Map<string, number>(); // 1 groupe de bundle = 1 pack
    for (const o of commandes) {
      if (o.cancelled_at) continue;
      for (const li of o.line_items || []) {
        const q = li.quantity || 0;
        const base = parseFloat(li.price || "0") * q;
        const disc = (li.discount_allocations || []).reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
        const tax = (li.tax_lines || []).reduce((s, t) => s + parseFloat(t.price || "0"), 0);
        const net = base - disc;
        const totalAvecTaxe = o.taxes_included ? net : net + tax;
        const grp = prop(li, "_sb_bundle_group");
        if (grp) {
          // ligne-composant de bundle : matcher le pack parent par SKU ou variant id
          const bt = prop(li, "_sb_bundle_title") || "";
          const skuM = (bt.match(/SKU:\s*([^\s|]+)/) || [])[1];
          const vidStr = (prop(li, "_sb_bundle_variant_id_qty") || "").split(":")[0].trim();
          const vid = vidStr ? Number(vidStr) : 0;
          if ((skuM && cible.skus.has(skuM)) || (vid && cible.vids.has(vid))) {
            const gk = `${o.id}:${grp.split(" ")[0]}`;
            groupes.set(gk, (groupes.get(gk) || 0) + totalAvecTaxe);
          }
        } else if (li.product_id != null && cible.pids.has(li.product_id)) {
          directQty += q;
          directTot += totalAvecTaxe;
        }
      }
    }
    let totalBundle = 0;
    for (const v of groupes.values()) totalBundle += v;
    return { qty: directQty + groupes.size, total: Math.round((directTot + totalBundle) * 100) / 100 };
  }

  // 1) Résoudre chaque produit (ids + skus + vids)
  const resolutions = await Promise.all(
    produits.map(async (p) => {
      const r = await resoudreProduit(p);
      const cible: Cible = { id: p.id, pids: new Set(r.ids), skus: new Set(r.skus), vids: new Set(r.vids) };
      return { p, cible };
    })
  );

  // 2) Grouper par fenêtre de temps : soit la semaine commerciale du créneau, soit le mois entier.
  const semaines = new Map<string, { debut: Date; fin: Date; cibles: Cible[] }>();
  for (const { p, cible } of resolutions) {
    let debut: Date;
    let fin: Date;
    let key: string;
    if (p.periodeType === "mois" && p.mois && /^\d{4}-\d{2}$/.test(p.mois)) {
      // Mois entier (1er 00:00 → dernier jour 23:59 UTC)
      const [an, mo] = p.mois.split("-").map(Number);
      debut = new Date(Date.UTC(an, mo - 1, 1, 0, 0, 0, 0));
      fin = new Date(Date.UTC(an, mo, 0, 23, 59, 59, 999));
      key = `M:${p.mois}`;
    } else {
      const ref = p.since ? new Date(p.since + "T12:00:00Z") : new Date();
      const sem = getSemaineCommerciale(isNaN(ref.getTime()) ? new Date() : ref);
      debut = sem.debut;
      fin = sem.fin;
      key = `W:${debut.toISOString().slice(0, 10)}`;
    }
    let w = semaines.get(key);
    if (!w) {
      w = { debut, fin, cibles: [] };
      semaines.set(key, w);
    }
    w.cibles.push(cible);
  }

  // 3) Une requête par semaine, puis calcul direct + bundle pour chaque cible
  const resultats: Record<string, { qty: number; total: number }> = {};
  for (const p of produits) resultats[p.id] = { qty: 0, total: 0 };
  try {
    for (const w of semaines.values()) {
      const commandes = await commandesSemaine(w.debut, w.fin);
      for (const cible of w.cibles) {
        if (!cible.pids.size && !cible.skus.size) continue;
        resultats[cible.id] = calculer(cible, commandes);
      }
    }
  } catch (e) {
    return NextResponse.json({ error: "erreur fetch orders", detail: String((e as Error)?.message || e) }, { status: 500 });
  }

  const result = { ok: true, resultats, semaines: semaines.size };
  await redisSetEx(cacheKey, result, 600);
  return NextResponse.json({ ...result, source: "fresh" });
}
