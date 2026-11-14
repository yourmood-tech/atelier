// Moteur des pépites créatives (Mood Cash Engine, étage 2 — cahier de Stéphanie ch. 5 ; décisions Philippe 13.11.2026).
//
// Chaque matin : les pièces mises en ligne depuis le dernier passage →
//   1. stock RÉEL par taille (recette Katana, la matière la plus rare décide ; le stock Shopify n'a pas de sens) ;
//   2. clientes compatibles, uniquement sur des faits (carnet dans Klaviyo : carnet_bases_codes = largeur+taille des bases
//      achetées) + règle des places (mini 1, medium 2, deux tiers 4, addon 6 ; base XS 4 places, small/large 6) ;
//   3. goût (décision Philippe + Stéphanie 14.11.2026) : famille de design, fête (Noël, Saint-Valentin, Fête des mères)
//      et couleur dominante de la cliente (carnet_familles / carnet_fetes / carnet_couleur dans Klaviyo) :
//      ≥ 50 pièces → compatibles avec même famille OU même fête OU même couleur ;
//      < 50 pièces → compatibles avec (même famille OU même fête) ET même couleur (une seule des deux si la pépite n'a que ça) ;
//      0 pièce (fabriquée à la commande) → comme ≥ 50, réservé aux grandes cliqueuses, délai écrit clairement ;
//      pépite sans famille, fête ni couleur lisible → ancienne règle (peu de stock : même matière ; sinon toutes les compatibles) ;
//   4. dans Klaviyo : un groupe FR et un groupe DE (même règle de langue que les envois quotidiens), puis deux BROUILLONS
//      de campagne qui excluent les clientes au repos, le groupe témoin et la pause « Inactives 6 mois ».
// RIEN n'est envoyé : Stéphanie relit et envoie (validation humaine, ch. 27). Pas de remise, pas de fausse rareté.
import { kv } from "@vercel/kv";
import { shopifyGraphql } from "@/lib/shopify";
import { classe, matiere, PLACES, PLACES_BASE } from "@/lib/carnet/classe";
import { couleurDe, familleDe, fetesDe, type Famille, type Fete, type Teinte } from "@/lib/carnet/gout";

const KATANA = "https://api.katanamrp.com/v1";
const KKEY = process.env.KATANA_API_KEY ?? "";
const ATELIER = 10763;
const KLAVIYO = process.env.KLAVIYO_API_KEY ?? "";
export const EXCLUS = { auRepos: "RMNrmb", temoin: "XQrjy3", inactives: "TMmZzE" };
const LANGUE = { FR: "UzADxv", DE: "TaThDP" }; // segments quotidiens dont on reprend la règle de langue
const CLICS = "NpL6Ey";
export const SEUIL_PEU = 50; // en dessous : seulement les amatrices de la même matière

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type L = Record<string, any>;

async function katana(path: string, params: Record<string, string | number>) {
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`${KATANA}${path}?${q}`, { headers: { Authorization: `Bearer ${KKEY}`, Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    if (r.status === 429 || r.status >= 500) { await pause(2000 * 1.6 ** i); continue; }
    if (!r.ok) throw new Error(`Katana ${path} ${r.status}`);
    const j = await r.json();
    return (Array.isArray(j) ? j : j.data) as L[];
  }
  throw new Error(`Katana ${path} : trop de refus`);
}
async function klaviyo(method: string, path: string, body?: unknown) {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`https://a.klaviyo.com/api/${path}`, { method, headers: { Authorization: `Klaviyo-API-Key ${KLAVIYO}`, revision: "2025-07-15", accept: "application/vnd.api+json", "content-type": "application/vnd.api+json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
    if (r.status === 429) { await pause(2000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`Klaviyo ${path} ${r.status} : ${(await r.text()).slice(0, 300)}`);
    return r.status === 204 ? {} : r.json();
  }
  throw new Error("Klaviyo : trop de demandes");
}

// ── 1. stock réel d'une taille : recette Katana, la matière la plus rare décide ──
async function faisable(sku: string, cache: Map<number, number>): Promise<number | null> {
  const v = await katana("/variants", { sku });
  if (!v.length) return null;
  const desc = async (id: number, prof: number): Promise<number> => {
    const rows = prof <= 3 ? (await katana("/bom_rows", { product_variant_id: id, limit: 100 })).filter((r) => r.product_variant_id === id && !r.deleted_at) : [];
    if (!rows.length) {
      if (!cache.has(id)) { const inv = await katana("/inventory", { variant_id: id, location_id: ATELIER }); cache.set(id, Number(inv[0]?.quantity_in_stock ?? 0)); }
      return Math.max(0, Math.floor(cache.get(id)!));
    }
    let n = Infinity;
    for (const r of rows) { const q = Number(r.quantity ?? 0); if (q > 0) n = Math.min(n, Math.floor((await desc(r.ingredient_variant_id, prof + 1)) / q)); }
    return Number.isFinite(n) ? n : 0;
  };
  return desc(v[0].id, 0);
}

export type Analyse = {
  id: string; titre: string; lien: string; image: string | null; matiere: string | null;
  tailles: { taille: number; stock: number | null; places: number; base: boolean }[];
  stockTotal: number; sansRecette: number; mode: "a-la-commande" | "peu" | "large";
  codes: string[]; taillesBase: number[]; raison?: string;
  famille: Famille | null; fetes: Fete[]; couleur: Teinte | null;
};

// ── 2. analyse d'une pépite ──
export async function analyser(produitId: string): Promise<Analyse> {
  const d: L = await shopifyGraphql<L>(`query($id:ID!){ product(id:$id){ id title handle productType tags descriptionHtml onlineStoreUrl featuredImage{ url } variants(first:100){ nodes{ title sku } } } }`, { id: produitId });
  const p = d.product;
  const cache = new Map<number, number>();
  const tailles: Analyse["tailles"] = [];
  let sansRecette = 0;
  for (const v of p.variants.nodes) {
    const c = classe(p.title, v.title, v.sku, p.productType);
    if (!c.taille || !v.sku) continue;
    const anneaux = c.pieces.filter((x) => x.type in PLACES);
    let places = Math.max(0, ...anneaux.map((x) => PLACES[x.type as keyof typeof PLACES] * x.nb));
    // le choix de la taille dit souvent la forme (« Addon / 58 », « Deux tiers / 58 ») : il passe avant le type de la fiche
    const vt = (v.title ?? "").toLowerCase();
    if (/deux tiers|2\/3/.test(vt)) places = PLACES["deux tiers"];
    else if (/\baddon\b/.test(vt)) places = PLACES.addon;
    else if (/\bmedium\b/.test(vt)) places = PLACES.medium;
    else if (/\bmini\b/.test(vt)) places = PLACES.mini;
    const base = c.pieces.some((x) => x.type === "base");
    if (!places && !base) continue;
    const stock = await faisable(v.sku, cache);
    if (stock == null) sansRecette++;
    tailles.push({ taille: c.taille, stock, places, base });
  }
  const stockTotal = tailles.reduce((s, t) => s + (t.stock ?? 0), 0);
  const mode: Analyse["mode"] = stockTotal === 0 ? "a-la-commande" : stockTotal < SEUIL_PEU ? "peu" : "large";
  // tailles retenues : celles en stock, ou toutes si la pièce est fabriquée à la commande
  const retenues = tailles.filter((t) => mode === "a-la-commande" ? t.stock != null : (t.stock ?? 0) > 0);
  const codes = new Set<string>(); const taillesBase = new Set<number>();
  for (const t of retenues) {
    if (t.base && !t.places) { taillesBase.add(t.taille); continue; } // une base seule : clientes de cette taille
    for (const [w, cap] of Object.entries(PLACES_BASE)) if (t.places <= cap) codes.add(`${w}${t.taille}`);
  }
  return {
    id: p.id, titre: p.title, lien: p.onlineStoreUrl ?? `https://www.yourmood.net/products/${p.handle}`, image: p.featuredImage?.url ?? null,
    matiere: matiere(p.title, p.variants.nodes[0]?.sku ?? null, p.productType), tailles, stockTotal, sansRecette, mode,
    codes: [...codes].sort(), taillesBase: [...taillesBase].sort(),
    famille: familleDe(p.title, p.tags ?? []), fetes: fetesDe(p.title, p.tags ?? []), couleur: couleurDe(p.title, null, p.tags ?? [], p.descriptionHtml),
    raison: !tailles.length ? "pas une pièce à clipser (ni anneau ni base)" : !retenues.length ? "aucune taille avec recette Katana" : undefined,
  };
}

// ── 3. groupes Klaviyo FR / DE ──
async function reglesLangue(lang: "FR" | "DE") {
  const d: L = await klaviyo("GET", `segments/${LANGUE[lang]}?fields[segment]=definition`);
  // on garde uniquement les groupes qui parlent de langue / pays / adresse (pas les achats ni le consentement)
  return (d.data.attributes.definition.condition_groups as L[]).filter((g) => g.conditions.every((c: L) => c.type === "profile-property"));
}
function definition(a: Analyse, langue: L[]) {
  const groupes: L[] = [];
  const cible: L[] = [
    ...a.codes.map((code) => ({ type: "profile-property", property: "properties['carnet_bases_codes']", filter: { type: "list", operator: "contains", value: code } })),
    ...a.taillesBase.map((t) => ({ type: "profile-property", property: "properties['carnet_taille']", filter: { type: "numeric", operator: "equals", value: t } })),
  ];
  groupes.push({ conditions: cible });
  const liste = (prop: string, v: string) => ({ type: "profile-property", property: `properties['${prop}']`, filter: { type: "list", operator: "contains", value: v } });
  const design = [...(a.famille ? [liste("carnet_familles", a.famille)] : []), ...a.fetes.map((f) => liste("carnet_fetes", f))];
  const teinte = a.couleur ? [{ type: "profile-property", property: "properties['carnet_couleur']", filter: { type: "string", operator: "equals", value: a.couleur } }] : [];
  if (!design.length && !teinte.length) {
    if (a.mode === "peu" && a.matiere) groupes.push({ conditions: [liste("carnet_matieres", a.matiere)] });
  } else if (a.mode === "peu") {
    if (design.length) groupes.push({ conditions: design });
    if (teinte.length) groupes.push({ conditions: teinte });
  } else groupes.push({ conditions: [...design, ...teinte] });
  if (a.mode === "a-la-commande") groupes.push({ conditions: [{ type: "profile-metric", metric_id: CLICS, measurement: "count", measurement_filter: { type: "numeric", operator: "greater-than", value: 12 }, timeframe_filter: { type: "date", operator: "in-the-last", unit: "day", quantity: 90 }, metric_filters: null }] });
  groupes.push(...langue);
  groupes.push({ conditions: [{ type: "profile-marketing-consent", consent: { channel: "email", can_receive_marketing: true, consent_status: { subscription: "any", filters: null } } }] });
  return { condition_groups: groupes };
}

// ── 4. brouillons de campagne (FR validé par Stéphanie avant envoi ; DE à relire par Nathalie) ──
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
function html(a: Analyse, lang: "FR" | "DE") {
  const nom = esc(a.titre.replace(/^[^\p{L}\p{N}«„"]+/u, "").split(/ — | – | pour bague| für /)[0].trim());
  const base = "{{ person|lookup:'carnet_base_principale'|default:'' }}";
  const t = lang === "FR"
    ? { haut: "Une pépite créative…", phrase: `On l'a imaginée en pensant à ta compo.<br>Elle se clipse sur ta base ${base} 🤍`, delai: "Fabriquée pour toi à la commande — environ 4 semaines.", bouton: "La découvrir" }
    : { haut: "Ein neues Stück für dich…", phrase: `Wir haben an deine Kombi gedacht.<br>Es passt auf deine Fassung ${base} 🤍`, delai: "Wird für dich auf Bestellung gefertigt — ca. 4 Wochen.", bouton: "Entdecken" };
  const utm = `utm_source=klaviyo&utm_medium=email&utm_campaign=pepite-${a.id.split("/").pop()}`;
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="font-size:14px;letter-spacing:.08em;color:#888;padding-bottom:12px">${t.haut}</td></tr>
${a.image ? `<tr><td><a href="${esc(a.lien)}?${utm}"><img src="${esc(a.image)}" width="560" style="width:100%;height:auto;display:block;border-radius:6px" alt="${nom}"></a></td></tr>` : ""}
<tr><td style="font-size:22px;padding:20px 0 8px">${nom}</td></tr>
<tr><td style="font-size:16px;line-height:1.5">${t.phrase}</td></tr>
${a.mode === "a-la-commande" ? `<tr><td style="font-size:14px;color:#666;padding-top:12px">${t.delai}</td></tr>` : ""}
<tr><td style="padding:24px 0"><a href="${esc(a.lien)}?${utm}" style="background:#222;color:#fff;text-decoration:none;padding:12px 28px;border-radius:24px;font-size:15px;display:inline-block">${t.bouton}</a></td></tr>
<tr><td style="font-size:12px;color:#999">{% unsubscribe %}</td></tr>
</table></td></tr></table></body></html>`;
}

export async function preparer(a: Analyse) {
  const nomCourt = a.titre.replace(/^[^\p{L}\p{N}«„"]+/u, "").slice(0, 60);
  const out: Record<string, unknown> = {};
  for (const lang of ["FR", "DE"] as const) {
    const seg: L = await klaviyo("POST", "segments/", { data: { type: "segment", attributes: { name: `Pépite · ${nomCourt} · ${lang} (moteur)`, definition: definition(a, await reglesLangue(lang)) } } });
    const tpl: L = await klaviyo("POST", "templates/", { data: { type: "template", attributes: { name: `Pépite · ${nomCourt} · ${lang} (moteur)`, editor_type: "CODE", html: html(a, lang) } } });
    const sujet = lang === "FR" ? "✨ Une pépite créative pour ta compo…" : "✨ Ein neues Stück für deine Kombi…";
    const camp: L = await klaviyo("POST", "campaigns/", { data: { type: "campaign", attributes: {
      name: `Pépite · ${nomCourt} · ${lang} · BROUILLON moteur`,
      audiences: { included: [seg.data.id], excluded: [EXCLUS.auRepos, EXCLUS.temoin, EXCLUS.inactives] },
      send_strategy: { method: "immediate" },
      "campaign-messages": { data: [{ type: "campaign-message", attributes: { definition: { channel: "email", label: `${lang}`, content: { subject: sujet, preview_text: a.mode === "a-la-commande" ? (lang === "FR" ? "Fabriquée pour toi à la commande 🤍" : "Auf Bestellung für dich gefertigt 🤍") : "🤍", from_email: "contact@yourmood.net", from_label: "mood" } } } }] },
    } } });
    const msg = camp.data.relationships["campaign-messages"].data[0].id;
    await klaviyo("POST", "campaign-message-assign-template/", { data: { type: "campaign-message", id: msg, relationships: { template: { data: { type: "template", id: tpl.data.id } } } } });
    out[lang] = { segment: seg.data.id, campagne: camp.data.id };
  }
  return out;
}

// ── passage quotidien ──
export async function passage(opts: { creer: boolean; fin: number; produit?: string }) {
  const depuis = (await kv.get<string>("pepites:depuis")) ?? new Date(Date.now() - 24 * 3600e3).toISOString();
  const debut = new Date().toISOString();
  let ids: string[] = [];
  if (opts.produit) ids = [opts.produit.startsWith("gid:") ? opts.produit : `gid://shopify/Product/${opts.produit}`];
  else {
    const d: L = await shopifyGraphql<L>(`query($q:String){ products(first:50, query:$q){ nodes{ id tags } } }`, { q: `status:active AND published_at:>'${depuis}'` });
    ids = d.products.nodes.filter((p: L) => !p.tags.some((t: string) => /calavent|gift|bon cadeau/i.test(t))).map((p: L) => p.id);
  }
  const faites = new Set((await kv.get<string[]>("pepites:faites")) ?? []);
  const resultats: unknown[] = [];
  for (const id of ids) {
    if (Date.now() > opts.fin) break;
    if (!opts.produit && faites.has(id)) continue;
    try {
      const a = await analyser(id);
      const r: Record<string, unknown> = { id, titre: a.titre, mode: a.mode, stock: a.stockTotal, matiere: a.matiere, famille: a.famille, fetes: a.fetes, couleur: a.couleur, codes: a.codes.length, taillesBase: a.taillesBase, sansRecette: a.sansRecette, raison: a.raison };
      if (!a.raison && opts.creer) { r.klaviyo = await preparer(a); faites.add(id); }
      resultats.push(r);
    } catch (e) { resultats.push({ id, erreur: e instanceof Error ? e.message : String(e) }); }
  }
  if (opts.creer && !opts.produit) { await kv.set("pepites:depuis", debut); await kv.set("pepites:faites", [...faites].slice(-500)); }
  const rapport = { quand: debut, depuis, creer: opts.creer, resultats };
  await kv.set("pepites:rapport", rapport, { ex: 14 * 86400 });
  return rapport;
}
