// ─── Délai affiché sur la fiche produit : « Prête à partir » ou « Fabriquée pour vous » ───
//
// Décidé avec Philippe le 31.10.2026, après le ticket d'une très bonne cliente : l'appli
// mobile lui avait affiché « en stock » une pièce qui demandait des semaines.
//
// Le seul stock fiable est celui des MATIÈRES dans Katana (pas celui des produits). Pour
// chaque taille d'anneau en argent dont la recette utilise une matière Icelea, on calcule
// combien de pièces on peut sortir du tiroir : la matière la plus rare décide (recettes à
// plusieurs matières comprises). Le résultat est écrit sur la taille dans Shopify
// (mood.pieces_pretes) ; le thème affiche le message selon ce nombre.
//
// Deux temps, à cause des limites de Katana et de la durée d'une tâche (300 s) :
//   1. l'INDEX (une fois par semaine, en plusieurs tranches) : matières Icelea, livre des
//      recettes (≈ 600 pages, le plus long), références Katana des produits Icelea, tailles
//      Shopify en argent → qui dépend de quoi ;
//   2. le STOCK (chaque nuit) : relire le stock des seules matières utiles (≈ 6 000),
//      recalculer, et n'écrire dans Shopify que les tailles qui ont changé.
//
// Contrôlé le 31.10.2026 contre le tiroir de Philippe sur 5 anneaux : le calcul reprend
// Katana 5 fois sur 5 ; les 2 écarts venaient de Katana (stock trop bas, corrigé).

import { kv } from "@vercel/kv";
import { shopifyGraphql } from "@/lib/shopify";

const KATANA = "https://api.katanamrp.com/v1";
const KEY = process.env.KATANA_API_KEY!;
const ICELEA = 755704;
const ATELIER = 10763; // « Z.I. Des Ducats 40b » : le tiroir
const BUDGET_MS = 240_000; // on rend la main avant les 300 s
const INDEX_MAX_AGE_MS = 6 * 24 * 3600 * 1000;
const CHUNK = 4000; // éléments par clé KV (rester loin de la limite de taille d'une valeur)

const K = {
  etat: "delai-fab:index:etat",
  ice: "delai-fab:index:ice",
  recettes: (n: number) => `delai-fab:index:recettes:${n}`,
  cibles: (n: number) => `delai-fab:cibles:${n}`,
  arbre: (n: number) => `delai-fab:arbre:${n}`,
  pret: "delai-fab:pret",
  valeurs: "delai-fab:valeurs",
  rapport: "delai-fab:rapport",
  verrou: "delai-fab:verrou",
};

type Etat = {
  etape: "matieres" | "recettes" | "assembler" | "pret";
  page: number;
  morceaux: number; // tranches de recettes déjà rangées
  debut: string;
  fin?: string;
};
type Pret = { construitLe: string; cibles: number; arbre: number; morceauxCibles: number; morceauxArbre: number };
type Cible = [number, number[]]; // [taille Shopify (id numérique), produits Katana]
type Noeud = [number, [number, number][]]; // [variante Katana, [[ingrédient, quantité]]]

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ligne = Record<string, any>;

async function katana(path: string, params: Record<string, string | number | (string | number)[]>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) for (const x of Array.isArray(v) ? v : [v]) q.append(k, String(x));
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`${KATANA}${path}?${q}`, { headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json" } });
    if (r.status === 429 || r.status >= 500) { await pause(2000 * 1.6 ** i); continue; }
    if (!r.ok) throw new Error(`Katana ${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return (Array.isArray(j) ? j : j.data) as Ligne[];
  }
  throw new Error(`Katana ${path} : trop de refus`);
}

async function enParallele<T, R>(items: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await f(items[k]); }
  }));
  return out;
}

async function ranger<T>(cle: (n: number) => string, items: T[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < items.length; i += CHUNK) await kv.set(cle(n++), items.slice(i, i + CHUNK));
  return n;
}
async function relire<T>(cle: (n: number) => string, morceaux: number): Promise<T[]> {
  const parts = await Promise.all(Array.from({ length: morceaux }, (_, n) => kv.get<T[]>(cle(n))));
  return parts.flatMap((p) => p ?? []);
}

// ─── 1. INDEX ─────────────────────────────────────────────────────────────────

export async function avancerIndex(forcer = false): Promise<Etat | { saute: string }> {
  const t0 = Date.now();
  const enTemps = () => Date.now() - t0 < BUDGET_MS;
  let e = await kv.get<Etat>(K.etat);
  const pret = await kv.get<Pret>(K.pret);
  if (!e || (e.etape === "pret" && (forcer || !pret || Date.now() - Date.parse(pret.construitLe) > INDEX_MAX_AGE_MS))) {
    e = { etape: "matieres", page: 1, morceaux: 0, debut: new Date().toISOString() };
  }
  if (e.etape === "pret") return { saute: `index du ${pret?.construitLe} encore frais` };

  if (e.etape === "matieres") {
    const ice: number[] = [];
    for (let p = 1; ; p++) {
      const rows = await katana("/materials", { default_supplier_id: ICELEA, limit: 250, page: p });
      for (const m of rows) for (const v of m.variants ?? []) ice.push(v.id);
      if (rows.length < 250) break;
    }
    await kv.set(K.ice, ice);
    e = { ...e, etape: "recettes", page: 1 };
    await kv.set(K.etat, e);
  }

  // Le livre des recettes entier (≈ 150 000 lignes), rangé par tranches de 16 pages.
  while (e.etape === "recettes" && enTemps()) {
    const pages = Array.from({ length: 16 }, (_, i) => e!.page + i);
    const res = await enParallele(pages, 3, (p) => katana("/recipes", { limit: 250, page: p }));
    const lignes: [number, number, number][] = [];
    for (const rows of res) for (const r of rows) {
      if (r.deleted_at || r.product_variant_id == null || r.ingredient_variant_id == null) continue;
      lignes.push([r.product_variant_id, r.ingredient_variant_id, Number(r.quantity ?? 0)]);
    }
    await kv.set(K.recettes(e.morceaux), lignes);
    const fini = res.some((rows) => rows.length < 250);
    e = { ...e, page: e.page + 16, morceaux: e.morceaux + 1, ...(fini ? { etape: "assembler" as const } : {}) };
    await kv.set(K.etat, e);
  }

  if (e.etape === "assembler" && enTemps()) {
    await assembler(e);
    e = { ...e, etape: "pret", fin: new Date().toISOString() };
    await kv.set(K.etat, e);
  }
  return e;
}

async function assembler(e: Etat) {
  const ice = new Set((await kv.get<number[]>(K.ice)) ?? []);
  const recettes = new Map<number, [number, number][]>();
  for (let n = 0; n < e.morceaux; n++) {
    for (const [pv, ing, q] of (await kv.get<[number, number, number][]>(K.recettes(n))) ?? []) {
      const l = recettes.get(pv) ?? []; l.push([ing, q]); recettes.set(pv, l);
    }
  }
  const produitsIcelea = new Set([...recettes].filter(([, l]) => l.some(([ing]) => ice.has(ing))).map(([pv]) => pv));
  // Références (SKU) des seuls produits Icelea : 250 par appel, ≈ 65 appels.
  const ids = [...produitsIcelea];
  const paquets: number[][] = [];
  for (let i = 0; i < ids.length; i += 250) paquets.push(ids.slice(i, i + 250));
  const lus = await enParallele(paquets, 3, (b) => katana("/variants", { ids: b, limit: 250 }));
  const parSku = new Map<string, number[]>();
  for (const rows of lus) for (const v of rows) {
    if (!v.sku || v.deleted_at) continue;
    const sku = String(v.sku).trim().toUpperCase();
    const l = parSku.get(sku) ?? []; l.push(v.id); parSku.set(sku, l);
  }

  // Tailles actives des fiches « argent » de la boutique.
  const cibles: Cible[] = [];
  const garder = (v: { id: string; sku: string | null }) => {
    const k = parSku.get(String(v.sku ?? "").trim().toUpperCase());
    if (k) cibles.push([Number(String(v.id).split("/").pop()), k]);
  };
  let apres: string | null = null;
  for (;;) {
    const d: Ligne = await shopifyGraphql<Ligne>(
      `query($c:String){ products(first:10, after:$c, query:"status:active AND title:argent*"){ pageInfo{ hasNextPage endCursor } nodes{ id title variants(first:100){ pageInfo{ hasNextPage endCursor } nodes{ id sku } } } } }`,
      { c: apres }
    );
    for (const p of d.products.nodes) {
      if (!/argent/i.test(p.title)) continue;
      p.variants.nodes.forEach(garder);
      // fiches à plus de 100 tailles/couleurs (ex. EXOPLANÈTE) : lire la suite
      let suite = p.variants.pageInfo;
      while (suite.hasNextPage) {
        const v: Ligne = await shopifyGraphql<Ligne>(
          `query($id:ID!,$c:String){ product(id:$id){ variants(first:250, after:$c){ pageInfo{ hasNextPage endCursor } nodes{ id sku } } } }`,
          { id: p.id, c: suite.endCursor }
        );
        v.product.variants.nodes.forEach(garder);
        suite = v.product.variants.pageInfo;
      }
    }
    if (!d.products.pageInfo.hasNextPage) break;
    apres = d.products.pageInfo.endCursor;
  }

  // Sous-arbre utile des recettes (produits, sous-produits éventuels).
  const arbre: Noeud[] = [];
  const vu = new Set<number>();
  const visiter = (id: number, prof: number) => {
    if (vu.has(id) || prof > 3) return;
    vu.add(id);
    const l = recettes.get(id);
    if (!l) return;
    arbre.push([id, l]);
    for (const [ing] of l) visiter(ing, prof + 1);
  };
  for (const [, ks] of cibles) for (const k of ks) visiter(k, 0);

  const pret: Pret = {
    construitLe: new Date().toISOString(),
    cibles: cibles.length,
    arbre: arbre.length,
    morceauxCibles: await ranger(K.cibles, cibles),
    morceauxArbre: await ranger(K.arbre, arbre),
  };
  await kv.set(K.pret, pret);
}

// ─── 2. STOCK (chaque nuit) ─────────────────────────────────────────────────

export async function mettreAJourStock(ecrire = true) {
  const pret = await kv.get<Pret>(K.pret);
  if (!pret) return { fait: false, raison: "index pas encore construit" };
  const cibles = await relire<Cible>(K.cibles, pret.morceauxCibles);
  const arbre = new Map(await relire<Noeud>(K.arbre, pret.morceauxArbre));

  const feuilles = new Set<number>();
  const descendre = (id: number, prof: number) => {
    const l = arbre.get(id);
    if (!l || prof > 3) { feuilles.add(id); return; }
    for (const [ing] of l) descendre(ing, prof + 1);
  };
  for (const [, ks] of cibles) for (const k of ks) descendre(k, 0);

  const ids = [...feuilles];
  const paquets: number[][] = [];
  // un seul emplacement demandé → une ligne par matière : 200 matières par appel
  for (let i = 0; i < ids.length; i += 200) paquets.push(ids.slice(i, i + 200));
  const stock = new Map<number, number>();
  const lus = await enParallele(paquets, 3, (b) => katana("/inventory", { variant_id: b, location_id: ATELIER, limit: 250 }));
  for (const rows of lus) for (const x of rows) stock.set(x.variant_id, Number(x.quantity_in_stock ?? 0));
  if (stock.size < ids.length * 0.9) throw new Error(`stock incomplet : ${stock.size} lus sur ${ids.length}`);

  const faisable = (id: number, prof: number): number => {
    const l = arbre.get(id);
    if (!l || prof > 3) return Math.max(0, Math.floor(stock.get(id) ?? 0));
    return Math.min(...l.map(([ing, q]) => (q > 0 ? Math.floor(faisable(ing, prof + 1) / q) : Infinity)));
  };

  const avant = (await kv.get<Record<string, number>>(K.valeurs)) ?? {};
  const valeurs: Record<string, number> = {};
  const changes: [number, number][] = [];
  let zero = 0;
  for (const [sid, ks] of cibles) {
    const n = Math.min(...ks.map((k) => faisable(k, 0)));
    const nn = Number.isFinite(n) ? n : 0;
    valeurs[sid] = nn;
    if (nn === 0) zero++;
    if (avant[sid] !== nn) changes.push([sid, nn]);
  }

  let ecrits = 0;
  const erreurs: string[] = [];
  if (ecrire) {
    for (let i = 0; i < changes.length; i += 25) {
      const lot = changes.slice(i, i + 25).map(([sid, n]) => ({
        ownerId: `gid://shopify/ProductVariant/${sid}`, namespace: "mood", key: "pieces_pretes", type: "number_integer", value: String(n),
      }));
      const d = await shopifyGraphql<Ligne>(
        `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ id } userErrors{ message } } }`,
        { m: lot }
      );
      ecrits += d.metafieldsSet.metafields?.length ?? 0;
      for (const u of d.metafieldsSet.userErrors ?? []) erreurs.push(u.message);
    }
    // on ne retient que ce qui a vraiment été écrit, pour réessayer le reste la nuit suivante
    if (!erreurs.length) await kv.set(K.valeurs, valeurs);
  }
  const rapport = {
    le: new Date().toISOString(), tailles: cibles.length, matieresLues: stock.size,
    aZero: zero, pretes: cibles.length - zero, changees: changes.length, ecrites: ecrits, erreurs: erreurs.slice(0, 5),
    indexDu: pret.construitLe,
  };
  if (ecrire) await kv.set(K.rapport, rapport);
  return { fait: true, ...rapport };
}

export async function avecVerrou<T>(f: () => Promise<T>): Promise<T | { saute: string }> {
  const ok = await kv.set(K.verrou, Date.now(), { nx: true, ex: 290 });
  if (!ok) return { saute: "une autre tranche tourne déjà" };
  try { return await f(); } finally { await kv.del(K.verrou); }
}

export async function lireRapport() {
  return { rapport: await kv.get(K.rapport), index: await kv.get(K.etat), pret: await kv.get(K.pret) };
}
