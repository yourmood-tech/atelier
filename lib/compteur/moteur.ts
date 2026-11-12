// Compteur anti-saturation — moteur v2, ÉCONOME (réécrit le 12.11.2026 après l'épuisement du quota du stockage partagé).
// Principe : tout le calcul se fait en mémoire ; le stockage ne garde que 32 « classeurs » (un objet chacun),
// relus et réécrits seulement quand une de leurs clientes bouge. Ordre de grandeur : ~70 demandes par passage.
//
// Rangement (stockage partagé, préfixe cpt2:) :
//   cpt2:c:<0..31>       classeur : email → { d: {jour: nb}, l: dernier message, k: [jours de clic], u: dernière désinscription, w: déjà écrit }
//   cpt2:curseur:<mesure> / cpt2:bord:<mesure> / cpt2:fini:<mesure>   lecture des événements Klaviyo
//   cpt2:hebdo           liste des emails « une newsletter par semaine » (un seul objet, rafraîchi chaque jour)
//   cpt:idx:<boutique>   email → numéro de fiche Shopify (déjà construit, gardé de la v1)
import { kv } from "@vercel/kv";
import {
  BUDGET, JOURS_FENETRE, JOURS_PROFIL, LISTES_HEBDO, M, MESURES_RECU, MESURES_SIGNAUX, SEGMENTS_HEBDO,
  compte, jourSuisse, joursAvant, profilDe, type Profil,
} from "./regles";

const KLAVIYO = process.env.KLAVIYO_API_KEY ?? "";
export const NB_CLASSEURS = 32;
type Fiche = { d?: Record<string, number>; l?: string; k?: string[]; u?: string; w?: string };
type Classeur = Record<string, Fiche>;
type Montre = { fin: number };
const reste = (m: Montre) => m.fin - Date.now();

// compteur de demandes au stockage, pour le bilan
export const demandes = { n: 0 };
const kvGet = async <T,>(k: string) => { demandes.n++; return kv.get<T>(k); };
const kvSet = async (k: string, v: unknown, o?: { ex: number }) => { demandes.n++; return o ? kv.set(k, v, o) : kv.set(k, v); };

function numeroClasseur(email: string): number {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return h % NB_CLASSEURS;
}

// Les classeurs sont lus une fois par passage (par paquets de 4) et réécrits seulement s'ils ont changé.
export class Armoire {
  private c = new Map<number, Classeur>();
  private sale = new Set<number>();
  async ouvrir(nums: number[]) {
    const manquants = nums.filter((n) => !this.c.has(n));
    for (let i = 0; i < manquants.length; i += 2) {
      const part = manquants.slice(i, i + 2);
      demandes.n++;
      const v = (await kv.mget<Classeur[]>(...part.map((n) => `cpt2:c:${n}`))) ?? [];
      part.forEach((n, j) => this.c.set(n, (v[j] as Classeur | null) ?? {}));
    }
  }
  async toutOuvrir() { await this.ouvrir([...Array(NB_CLASSEURS).keys()]); }
  fiche(email: string): Fiche {
    const n = numeroClasseur(email); const c = this.c.get(n)!;
    this.sale.add(n);
    return (c[email] ??= {});
  }
  lire(email: string): Fiche | undefined { return this.c.get(numeroClasseur(email))?.[email]; }
  *toutes(): Generator<[string, Fiche]> { for (const c of this.c.values()) for (const e of Object.keys(c)) yield [e, c[e]]; }
  // ménage : retire les jours sortis de la fenêtre et les fiches vides
  menage() {
    const garderJours = new Set(joursAvant(JOURS_FENETRE + 1));
    const limiteClic = joursAvant(JOURS_PROFIL).at(-1)!;
    for (const [n, c] of this.c) {
      for (const e of Object.keys(c)) {
        const f = c[e]; let change = false;
        if (f.d) for (const j of Object.keys(f.d)) if (!garderJours.has(j)) { delete f.d[j]; change = true; }
        if (f.k) { const k = f.k.filter((j) => j >= limiteClic); if (k.length !== f.k.length) { f.k = k; change = true; } }
        if (f.u && f.u < limiteClic) { delete f.u; change = true; }
        const vide = (!f.d || !Object.keys(f.d).length) && !f.k?.length && !f.u && (!f.w || f.w.startsWith("0|"));
        if (vide) { delete c[e]; change = true; }
        if (change) this.sale.add(n);
      }
    }
  }
  async ranger() {
    for (const n of this.sale) await kvSet(`cpt2:c:${n}`, this.c.get(n));
    const nb = this.sale.size; this.sale.clear(); return nb;
  }
}

// ── Klaviyo ──────────────────────────────────────────────────────────────────
async function kget(url: string, rev = "2024-10-15"): Promise<Record<string, unknown>> {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { headers: { Authorization: `Klaviyo-API-Key ${KLAVIYO}`, revision: rev, accept: "application/vnd.api+json" }, cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`Klaviyo ${r.status} : ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  throw new Error("Klaviyo : trop de demandes, réessayer plus tard");
}
async function kpost(url: string, body: unknown) {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Klaviyo-API-Key ${KLAVIYO}`, revision: "2025-07-15", accept: "application/vnd.api+json", "content-type": "application/vnd.api+json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`Klaviyo ${r.status} : ${(await r.text()).slice(0, 300)}`);
    return;
  }
  throw new Error("Klaviyo : trop de demandes, réessayer plus tard");
}

// ── 1. Lecture des événements, rangés en mémoire puis dans les classeurs ────
type Ev = { email: string; jour: string; quand: string };
export async function collecter(montre: Montre, armoire: Armoire, essai: boolean) {
  const bilan: Record<string, { pages: number; comptes: number; jusqua: string; fini: boolean }> = {};
  const avant = new Date(Date.now() - 2 * 60000).toISOString().slice(0, 19) + "Z";
  const recus: Ev[] = [], clics: Ev[] = [], desab: Ev[] = [];
  const curseurs: Record<string, [string, string[]]> = {};
  const finis: string[] = [];
  for (const mesure of [...MESURES_RECU, ...MESURES_SIGNAUX]) {
    const recu = (MESURES_RECU as readonly string[]).includes(mesure);
    const defaut = new Date(Date.now() - (recu ? JOURS_FENETRE : JOURS_PROFIL) * 86400000).toISOString().slice(0, 19) + "Z";
    let curseur = (await kvGet<string>(`cpt2:curseur:${mesure}`)) ?? defaut;
    let bord = new Set((await kvGet<string[]>(`cpt2:bord:${mesure}`)) ?? []);
    const b: { pages: number; comptes: number; jusqua: string; fini: boolean } = (bilan[mesure] = { pages: 0, comptes: 0, jusqua: curseur, fini: false });
    const filtre = `equals(metric_id,'${mesure}'),greater-or-equal(datetime,${curseur}),less-than(datetime,${avant})`;
    let url: string | null = `https://a.klaviyo.com/api/events/?filter=${encodeURIComponent(filtre)}&sort=datetime&page[size]=200&include=profile&fields[profile]=email&fields[event]=datetime,event_properties`;
    while (url && reste(montre) > 0) {
      const d = await kget(url);
      const emails = new Map<string, string>();
      for (const p of (d.included as { id: string; attributes: { email?: string } }[]) ?? []) if (p.attributes?.email) emails.set(p.id, p.attributes.email.toLowerCase());
      const ev = (d.data as { id: string; attributes: { datetime: string; event_properties: Record<string, unknown> }; relationships: { profile: { data: { id: string } } } }[]) ?? [];
      for (const e of ev) {
        if (bord.has(e.id)) continue;
        const email = emails.get(e.relationships?.profile?.data?.id);
        if (!email) continue;
        const x = { email, jour: jourSuisse(e.attributes.datetime), quand: e.attributes.datetime };
        if (recu) { if (compte(mesure, e.attributes.event_properties ?? {})) { recus.push(x); b.comptes++; } }
        else if (mesure === M.clic) { clics.push(x); b.comptes++; }
        else { desab.push(x); b.comptes++; }
      }
      if (ev.length) {
        const der = ev[ev.length - 1].attributes.datetime.slice(0, 19) + "Z";
        const meme = ev.filter((e) => e.attributes.datetime.slice(0, 19) + "Z" === der).map((e) => e.id);
        bord = der === curseur ? new Set([...bord, ...meme]) : new Set(meme);
        curseur = der;
      }
      b.pages++; b.jusqua = curseur;
      url = ((d.links as { next?: string } | undefined)?.next) ?? null;
      if (!url) { b.fini = true; finis.push(mesure); }
      if (essai && b.pages >= 2) break;
    }
    curseurs[mesure] = [curseur, [...bord]];
  }
  if (essai) return { bilan, recus: recus.length };
  await kv.set("cpt2:trace", { etape: "lecture finie, rangement", quand: new Date().toISOString(), evenements: recus.length + clics.length + desab.length }); demandes.n++;
  // ranger dans les classeurs (une seule ouverture par classeur)
  const tous = [...recus, ...clics, ...desab];
  await armoire.ouvrir([...new Set(tous.map((x) => numeroClasseur(x.email)))]);
  for (const x of recus) { const f = armoire.fiche(x.email); (f.d ??= {})[x.jour] = (f.d[x.jour] ?? 0) + 1; if (!f.l || x.quand > f.l) f.l = x.quand; }
  for (const x of clics) { const f = armoire.fiche(x.email); if (!(f.k ??= []).includes(x.jour)) f.k.push(x.jour); }
  for (const x of desab) { const f = armoire.fiche(x.email); if (!f.u || x.jour > f.u) f.u = x.jour; }
  await kv.set("cpt2:trace", { etape: "classeurs ouverts, écriture", quand: new Date().toISOString() }); demandes.n++;
  const classeurs = await armoire.ranger();
  await kv.set("cpt2:trace", { etape: "classeurs rangés", quand: new Date().toISOString() }); demandes.n++;
  // curseurs APRÈS les classeurs : si la tranche est coupée entre les deux, on relit, on ne perd rien
  for (const [m, [c, bd]] of Object.entries(curseurs)) { await kvSet(`cpt2:curseur:${m}`, c); await kvSet(`cpt2:bord:${m}`, bd); }
  for (const m of finis) if (!(await kvGet(`cpt2:fini:${m}`))) await kvSet(`cpt2:fini:${m}`, new Date().toISOString());
  return { bilan, recus: recus.length, classeurs };
}
export async function collecteAJour(): Promise<boolean> {
  demandes.n++;
  const v = await kv.mget<(string | null)[]>(...[...MESURES_RECU, ...MESURES_SIGNAUX].map((m) => `cpt2:fini:${m}`));
  return (v ?? []).every(Boolean);
}

// ── 2. « Une newsletter par semaine » : un seul objet, rafraîchi une fois par jour ─
export async function hebdo(essai: boolean): Promise<Set<string>> {
  const aujourdhui = jourSuisse(new Date());
  const v = await kvGet<{ jour: string; emails: string[] }>("cpt2:hebdo");
  if (v && v.jour === aujourdhui) return new Set(v.emails);
  const emails = new Set<string>();
  for (const s of [...SEGMENTS_HEBDO.map((x) => `segments/${x}`), ...LISTES_HEBDO.map((x) => `lists/${x}`)]) {
    let url: string | null = `https://a.klaviyo.com/api/${s}/profiles/?fields[profile]=email&page[size]=100`;
    while (url) {
      const d = await kget(url, "2025-07-15");
      for (const p of (d.data as { attributes: { email?: string } }[]) ?? []) if (p.attributes?.email) emails.add(p.attributes.email.toLowerCase());
      url = ((d.links as { next?: string } | undefined)?.next) ?? null;
    }
  }
  if (!essai) await kvSet("cpt2:hebdo", { jour: aujourdhui, emails: [...emails] });
  return emails;
}

// ── 3. Écriture sur les fiches ───────────────────────────────────────────────
export const BOUTIQUES = {
  yourmood: { domaine: process.env.MOOD_SHOPIFY_DOMAIN || process.env.SHOPIFY_STORE || "", jeton: process.env.MOOD_SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_TOKEN || "" },
  joaillerie: { domaine: process.env.MOODJOAILLERIE_SHOPIFY_DOMAIN || "", jeton: process.env.MOODJOAILLERIE_SHOPIFY_ACCESS_TOKEN || "" },
} as const;
type Boutique = keyof typeof BOUTIQUES;
async function shopifyGql(b: Boutique, query: string, variables: Record<string, unknown> = {}) {
  const { domaine, jeton } = BOUTIQUES[b];
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`https://${domaine}/admin/api/2025-01/graphql.json`, { method: "POST", headers: { "X-Shopify-Access-Token": jeton, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }), cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1000 * (i + 1))); continue; }
    const j = await r.json();
    if (j.errors && JSON.stringify(j.errors).includes("THROTTLED")) { await new Promise((ok) => setTimeout(ok, 1000 * (i + 1))); continue; }
    if (j.errors) throw new Error(`Shopify ${b} : ${JSON.stringify(j.errors).slice(0, 200)}`);
    return j.data;
  }
  throw new Error(`Shopify ${b} : trop de demandes`);
}

// ── Index email → fiche (repris de la v1 : une demande par page de 250 fiches) ─
// Parcourt les fiches modifiées depuis le dernier passage (tout au premier passage), reprend au curseur.
export async function trace(etape: string) { demandes.n++; await kv.set("cpt2:trace", { etape, quand: new Date().toISOString() }); }
export async function indexer(montre: Montre, essai: boolean) {
  const bilan: Record<string, { fiches: number; fini: boolean }> = {};
  for (const b of Object.keys(BOUTIQUES) as Boutique[]) {
    if (!BOUTIQUES[b].jeton) continue;
    const etat = (await kvGet<{ depuis: string | null; curseur: string | null; debut: string }>(`cpt:idx:${b}:etat`)) ?? { depuis: null, curseur: null, debut: new Date().toISOString() };
    const q = etat.depuis ? `updated_at:>'${etat.depuis}'` : "";
    let fiches = 0, fini = false, curseur = etat.curseur;
    while (reste(montre) > 30000) {
      const d = await shopifyGql(b, `query($c:String,$q:String){customers(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{ legacyResourceId defaultEmailAddress{emailAddress} }}}`, { c: curseur, q });
      const m: Record<string, string> = {};
      for (const n of d.customers.nodes) { const e = n.defaultEmailAddress?.emailAddress; if (e) m[e.toLowerCase()] = String(n.legacyResourceId); }
      if (!essai && Object.keys(m).length) { demandes.n++; await kv.hset(`cpt:idx:${b}`, m); }
      fiches += d.customers.nodes.length;
      curseur = d.customers.pageInfo.endCursor;
      if (!d.customers.pageInfo.hasNextPage) { fini = true; break; }
      if (essai) break;
    }
    if (!essai) await kvSet(`cpt:idx:${b}:etat`, fini ? { depuis: etat.debut, curseur: null, debut: new Date().toISOString() } : { ...etat, curseur });
    bilan[b] = { fiches, fini };
  }
  return bilan;
}
export async function indexPret(): Promise<boolean> {
  for (const b of Object.keys(BOUTIQUES) as Boutique[]) {
    if (!BOUTIQUES[b].jeton) continue;
    const e = await kvGet<{ depuis: string | null }>(`cpt:idx:${b}:etat`);
    if (!e?.depuis) return false; // premier parcours pas encore terminé
  }
  return true;
}


type Etat = { n: number; budget: number; dernier: string; profil: Profil };
export function etatDe(f: Fiche, estHebdo: boolean): Etat {
  const fen = new Set(joursAvant(JOURS_FENETRE));
  const n = Object.entries(f.d ?? {}).reduce((s, [j, v]) => s + (fen.has(j) ? v : 0), 0);
  const profil = profilDe({ hebdo: estHebdo, joursClic: f.k?.length ?? 0, desabonnee: !!f.u });
  return { n, budget: BUDGET[profil], dernier: f.l ?? "", profil };
}
const sig = (s: Etat) => `${s.n}|${s.budget}|${s.dernier}`;

export async function ecrire(montre: Montre, armoire: Armoire, hebdoSet: Set<string>, essai: boolean) {
  await armoire.toutOuvrir();
  armoire.menage();
  const aEcrire: [string, Etat][] = [];
  const profils: Record<Profil, number> = { hebdo: 0, normale: 0, addict: 0, superAddict: 0 };
  let touchees = 0, auDessus = 0;
  for (const [e, f] of armoire.toutes()) {
    const s = etatDe(f, hebdoSet.has(e));
    if (s.n > 0) { touchees++; profils[s.profil]++; if (s.n > s.budget) auDessus++; }
    if (f.w !== sig(s) && (s.n > 0 || (f.w && !f.w.startsWith("0|")))) aEcrire.push([e, s]);
  }
  const bilan = { touchees, profils, auDessus, aEcrire: aEcrire.length, shopify: 0, joaillerie: 0, klaviyo: 0, reste: 0 };
  if (essai) { bilan.reste = aEcrire.length; return bilan; }

  const ou = new Map<string, { b: Boutique; id: string }>();
  for (const b of ["yourmood", "joaillerie"] as Boutique[]) {
    if (!BOUTIQUES[b].jeton) continue;
    const sans = aEcrire.map(([e]) => e).filter((e) => !ou.has(e));
    for (let i = 0; i < sans.length; i += 1000) {
      const part = sans.slice(i, i + 1000);
      demandes.n++;
      const v = (await kv.hmget<Record<string, string>>(`cpt:idx:${b}`, ...part)) ?? {};
      for (const e of part) if (v?.[e]) ou.set(e, { b, id: String(v[e]) });
    }
  }
  const MS = `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }`;
  const champs = (id: string, s: Etat) => {
    const owner = `gid://shopify/Customer/${id}`;
    const m = [
      { ownerId: owner, namespace: "custom", key: "sollicitations_7j", type: "number_integer", value: String(s.n) },
      { ownerId: owner, namespace: "custom", key: "budget_sollicitations", type: "number_integer", value: String(s.budget) },
    ];
    if (s.dernier) m.push({ ownerId: owner, namespace: "custom", key: "derniere_sollicitation", type: "date_time", value: s.dernier.slice(0, 19) + "Z" });
    return m;
  };
  for (const b of ["yourmood", "joaillerie"] as Boutique[]) {
    const lot = aEcrire.filter(([e]) => ou.get(e)?.b === b);
    for (let i = 0; i < lot.length && reste(montre) > 20000; i += 8) {
      const part = lot.slice(i, i + 8);
      const d = await shopifyGql(b, MS, { m: part.flatMap(([e, s]) => champs(ou.get(e)!.id, s)) });
      const err = d.metafieldsSet.userErrors as { message: string }[];
      if (err.length >= part.length * 2) throw new Error(`Shopify ${b} : ${err[0].message}`);
      for (const [e, s] of part) armoire.fiche(e).w = sig(s);
      if (b === "yourmood") bilan.shopify += part.length; else bilan.joaillerie += part.length;
    }
  }
  const kl = aEcrire.filter(([e]) => !ou.has(e));
  for (let i = 0; i < kl.length && reste(montre) > 15000; i += 5000) {
    const part = kl.slice(i, i + 5000);
    await kpost("https://a.klaviyo.com/api/profile-bulk-import-jobs/", { data: { type: "profile-bulk-import-job", attributes: { profiles: { data: part.map(([e, s]) => ({ type: "profile", attributes: { email: e, properties: { compteur_messages_7j: s.n, compteur_budget_semaine: s.budget, compteur_profil: s.profil, ...(s.dernier ? { compteur_dernier_message: s.dernier } : {}) } } })) } } } });
    for (const [e, s] of part) armoire.fiche(e).w = sig(s);
    bilan.klaviyo += part.length;
  }
  bilan.reste = bilan.aEcrire - bilan.shopify - bilan.joaillerie - bilan.klaviyo;
  await armoire.ranger();
  return bilan;
}

// ── Ménage unique des clés de la v1 (cpt:j:*, cpt:clic:*, cpt:desab:*, cpt:dernier, cpt:ecrit, cpt:profil…) ─
export async function menageV1() {
  if (await kvGet("cpt2:menage-v1")) return 0;
  const cles = ["cpt:dernier", "cpt:ecrit", "cpt:profil", "cpt:profil:jour", "cpt:profil:jour:v2", "cpt:hebdo", "cpt:hebdo:jour", "cpt:dernier-bilan", "cpt:ecriture-ok", "cpt:verrou"];
  for (const m of [...MESURES_RECU, ...MESURES_SIGNAUX]) cles.push(`cpt:curseur:${m}`, `cpt:bord:${m}`, `cpt:fini:${m}`);
  for (const j of joursAvant(100)) cles.push(`cpt:j:${j}`, `cpt:clic:${j}`, `cpt:desab:${j}`);
  for (let i = 0; i < cles.length; i += 100) { demandes.n++; await kv.del(...cles.slice(i, i + 100)); }
  await kvSet("cpt2:menage-v1", new Date().toISOString());
  return cles.length;
}
