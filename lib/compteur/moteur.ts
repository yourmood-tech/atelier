// Compteur anti-saturation — moteur. Tourne par petites tranches (tâche planifiée), chaque tranche
// reprend là où la précédente s'est arrêtée (curseurs dans KV). Rien n'est perdu si une tranche est coupée.
//
// Rangement KV :
//   cpt:curseur:<mesure> / cpt:bord:<mesure>   jusqu'où on a lu les événements Klaviyo
//   cpt:j:<jour>        email → nb de messages comptés ce jour-là (jour suisse), gardé 10 jours
//   cpt:dernier         email → date du dernier message compté
//   cpt:clic:<jour>     email → 1 si clic ce jour-là, gardé 95 jours (idem cpt:desab:<jour>)
//   cpt:hebdo           ensemble des emails « une newsletter par semaine »
//   cpt:profil          email → profil (seulement hebdo / addict / superAddict ; absent = normale)
//   cpt:idx:<boutique>  email → numéro de fiche cliente Shopify
//   cpt:ecrit           email → « messages|budget|dernier » tel qu'écrit la dernière fois
import { kv } from "@vercel/kv";
import {
  BUDGET, JOURS_FENETRE, JOURS_PROFIL, LISTES_HEBDO, M, MESURES_RECU, MESURES_SIGNAUX, SEGMENTS_HEBDO,
  compte, jourSuisse, joursAvant, profilDe, type Profil,
} from "./regles";

const KLAVIYO = process.env.KLAVIYO_API_KEY ?? "";
const DIX_JOURS = 10 * 86400, QUATRE_VINGT_QUINZE_JOURS = 95 * 86400;

type Montre = { fin: number };
const reste = (m: Montre) => m.fin - Date.now();

// ── Klaviyo ──────────────────────────────────────────────────────────────────
async function kget(url: string, rev = "2024-10-15"): Promise<Record<string, unknown>> {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { headers: { Authorization: `Klaviyo-API-Key ${KLAVIYO}`, revision: rev, accept: "application/vnd.api+json" }, cache: "no-store" });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`Klaviyo ${r.status} : ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  throw new Error("Klaviyo : trop de demandes, réessayer plus tard");
}
async function kpost(url: string, body: unknown): Promise<Record<string, unknown>> {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Klaviyo-API-Key ${KLAVIYO}`, revision: "2025-07-15", accept: "application/vnd.api+json", "content-type": "application/vnd.api+json" }, body: JSON.stringify(body) });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`Klaviyo ${r.status} : ${(await r.text()).slice(0, 300)}`);
    const t = await r.text(); return t ? JSON.parse(t) : {};
  }
  throw new Error("Klaviyo : trop de demandes, réessayer plus tard");
}

// ── 1. Collecte des événements (reçus, clics, désinscriptions, plaintes) ─────
export async function collecter(montre: Montre, essai: boolean) {
  const bilan: Record<string, { pages: number; lus: number; comptes: number; jusqua: string }> = {};
  const avant = new Date(Date.now() - 2 * 60000).toISOString().slice(0, 19) + "Z"; // on laisse 2 minutes aux événements en vol
  for (const mesure of [...MESURES_RECU, ...MESURES_SIGNAUX]) {
    const recu = (MESURES_RECU as readonly string[]).includes(mesure);
    const defaut = new Date(Date.now() - (recu ? JOURS_FENETRE : JOURS_PROFIL) * 86400000).toISOString().slice(0, 19) + "Z";
    let curseur = (await kv.get<string>(`cpt:curseur:${mesure}`)) ?? defaut;
    let bord = new Set((await kv.get<string[]>(`cpt:bord:${mesure}`)) ?? []);
    const b = (bilan[mesure] = { pages: 0, lus: 0, comptes: 0, jusqua: curseur });
    const filtre = `equals(metric_id,'${mesure}'),greater-or-equal(datetime,${curseur}),less-than(datetime,${avant})`;
    let url: string | null = `https://a.klaviyo.com/api/events/?filter=${encodeURIComponent(filtre)}&sort=datetime&page[size]=200&include=profile&fields[profile]=email&fields[event]=datetime,event_properties`;
    while (url && reste(montre) > 25000) {
      const d = await kget(url);
      const emails = new Map<string, string>();
      for (const p of (d.included as { id: string; attributes: { email?: string } }[]) ?? []) if (p.attributes?.email) emails.set(p.id, p.attributes.email.toLowerCase());
      const ev = (d.data as { id: string; attributes: { datetime: string; event_properties: Record<string, unknown> }; relationships: { profile: { data: { id: string } } } }[]) ?? [];
      const pipe = kv.pipeline(); let n = 0; const jours = new Set<string>();
      for (const e of ev) {
        if (bord.has(e.id)) continue;
        b.lus++;
        const email = emails.get(e.relationships?.profile?.data?.id);
        if (!email) continue;
        const jour = jourSuisse(e.attributes.datetime);
        if (recu) {
          if (!compte(mesure, e.attributes.event_properties ?? {})) continue;
          pipe.hincrby(`cpt:j:${jour}`, email, 1); pipe.hset("cpt:dernier", { [email]: e.attributes.datetime }); n += 2; b.comptes++;
          jours.add(`cpt:j:${jour}`);
        } else {
          const cle = mesure === M.clic ? `cpt:clic:${jour}` : `cpt:desab:${jour}`;
          pipe.hset(cle, { [email]: 1 }); n++; b.comptes++; jours.add(cle);
        }
      }
      for (const k of jours) { pipe.expire(k, k.startsWith("cpt:j:") ? DIX_JOURS : QUATRE_VINGT_QUINZE_JOURS); n++; }
      // curseur = date du dernier événement de la page ; on garde les numéros des événements de cette seconde-là
      if (ev.length) {
        const der = ev[ev.length - 1].attributes.datetime.slice(0, 19) + "Z";
        const memeSeconde = ev.filter((e) => e.attributes.datetime.slice(0, 19) + "Z" === der).map((e) => e.id);
        bord = der === curseur ? new Set([...bord, ...memeSeconde]) : new Set(memeSeconde);
        curseur = der;
      }
      if (!essai) {
        pipe.set(`cpt:curseur:${mesure}`, curseur); pipe.set(`cpt:bord:${mesure}`, [...bord]); n += 2;
        if (n) await pipe.exec();
      }
      b.pages++; b.jusqua = curseur;
      url = ((d.links as { next?: string } | undefined)?.next) ?? null;
      if (!url && !essai) await kv.set(`cpt:fini:${mesure}`, new Date().toISOString()); // rattrapage terminé pour cette mesure
      if (essai && b.pages >= 2) break;
    }
  }
  return bilan;
}

// Le premier rattrapage (7 jours de messages, 90 jours de clics) est-il terminé pour toutes les mesures ?
export async function collecteAJour(): Promise<boolean> {
  for (const m of [...MESURES_RECU, ...MESURES_SIGNAUX]) if (!(await kv.get(`cpt:fini:${m}`))) return false;
  return true;
}

// ── 2. Inscrites « une newsletter par semaine » (une fois par jour) ─────────
export async function rafraichirHebdo(essai: boolean): Promise<number | null> {
  const aujourdhui = jourSuisse(new Date());
  if ((await kv.get<string>("cpt:hebdo:jour")) === aujourdhui) return null;
  const emails = new Set<string>();
  const sources = [...SEGMENTS_HEBDO.map((s) => `segments/${s}`), ...LISTES_HEBDO.map((l) => `lists/${l}`)];
  for (const s of sources) {
    let url: string | null = `https://a.klaviyo.com/api/${s}/profiles/?fields[profile]=email&page[size]=100`;
    while (url) {
      const d = await kget(url, "2025-07-15");
      for (const p of (d.data as { attributes: { email?: string } }[]) ?? []) if (p.attributes?.email) emails.add(p.attributes.email.toLowerCase());
      url = ((d.links as { next?: string } | undefined)?.next) ?? null;
    }
  }
  if (!essai) {
    await kv.del("cpt:hebdo");
    const l = [...emails];
    for (let i = 0; i < l.length; i += 500) await kv.sadd("cpt:hebdo", ...(l.slice(i, i + 500) as [string, ...string[]]));
    await kv.set("cpt:hebdo:jour", aujourdhui);
  }
  return emails.size;
}

// ── 3. Profils (normale / addict / super-addict / hebdo), une fois par jour ─
async function hashEntier(cle: string, cb: (champ: string, valeur: string) => void) {
  let c: string | number = 0;
  do {
    const [suite, items] = (await kv.hscan(cle, c, { count: 5000 })) as [string | number, (string | number)[]];
    for (let i = 0; i < items.length; i += 2) cb(String(items[i]), String(items[i + 1]));
    c = suite;
  } while (String(c) !== "0");
}
export async function calculerProfils(essai: boolean): Promise<Record<Profil, number> | null> {
  const aujourdhui = jourSuisse(new Date());
  if ((await kv.get<string>("cpt:profil:jour:v2")) === aujourdhui) return null;
  const joursClic = new Map<string, number>(); const desab = new Set<string>();
  for (const j of joursAvant(JOURS_PROFIL)) {
    await hashEntier(`cpt:clic:${j}`, (e) => joursClic.set(e, (joursClic.get(e) ?? 0) + 1));
    await hashEntier(`cpt:desab:${j}`, (e) => desab.add(e));
  }
  const hebdo = new Set(((await kv.smembers("cpt:hebdo")) as string[]) ?? []);
  const res: Record<Profil, number> = { hebdo: 0, normale: 0, addict: 0, superAddict: 0 };
  const garder: Record<string, Profil> = {};
  for (const e of new Set([...joursClic.keys(), ...hebdo])) {
    const p = profilDe({ hebdo: hebdo.has(e), joursClic: joursClic.get(e) ?? 0, desabonnee: desab.has(e) });
    res[p]++; if (p !== "normale") garder[e] = p;
  }
  if (!essai) {
    await kv.del("cpt:profil");
    const l = Object.entries(garder);
    for (let i = 0; i < l.length; i += 500) await kv.hset("cpt:profil", Object.fromEntries(l.slice(i, i + 500)));
    await kv.set("cpt:profil:jour:v2", aujourdhui);
  }
  return res;
}

// ── 4. Index email → fiche Shopify (yourmood + mood joaillerie) ─────────────
export const BOUTIQUES = {
  yourmood: { domaine: process.env.MOOD_SHOPIFY_DOMAIN || process.env.SHOPIFY_STORE || "", jeton: process.env.MOOD_SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_TOKEN || "" },
  joaillerie: { domaine: process.env.MOODJOAILLERIE_SHOPIFY_DOMAIN || "", jeton: process.env.MOODJOAILLERIE_SHOPIFY_ACCESS_TOKEN || "" },
} as const;
type Boutique = keyof typeof BOUTIQUES;

async function shopifyGql(b: Boutique, query: string, variables: Record<string, unknown> = {}) {
  const { domaine, jeton } = BOUTIQUES[b];
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`https://${domaine}/admin/api/2025-01/graphql.json`, { method: "POST", headers: { "X-Shopify-Access-Token": jeton, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }), cache: "no-store" });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1000 * (i + 1))); continue; }
    const j = await r.json();
    if (j.errors && JSON.stringify(j.errors).includes("THROTTLED")) { await new Promise((ok) => setTimeout(ok, 1000 * (i + 1))); continue; }
    if (j.errors) throw new Error(`Shopify ${b} : ${JSON.stringify(j.errors).slice(0, 200)}`);
    return j.data;
  }
  throw new Error(`Shopify ${b} : trop de demandes`);
}

// Parcourt les fiches modifiées depuis le dernier passage (tout au premier passage), reprend au curseur.
export async function indexer(montre: Montre, essai: boolean) {
  const bilan: Record<string, { fiches: number; fini: boolean }> = {};
  for (const b of Object.keys(BOUTIQUES) as Boutique[]) {
    if (!BOUTIQUES[b].jeton) continue;
    const etat = (await kv.get<{ depuis: string | null; curseur: string | null; debut: string }>(`cpt:idx:${b}:etat`)) ?? { depuis: null, curseur: null, debut: new Date().toISOString() };
    const q = etat.depuis ? `updated_at:>'${etat.depuis}'` : "";
    let fiches = 0, fini = false, curseur = etat.curseur;
    while (reste(montre) > 30000) {
      const d = await shopifyGql(b, `query($c:String,$q:String){customers(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{ legacyResourceId defaultEmailAddress{emailAddress} }}}`, { c: curseur, q });
      const m: Record<string, string> = {};
      for (const n of d.customers.nodes) { const e = n.defaultEmailAddress?.emailAddress; if (e) m[e.toLowerCase()] = String(n.legacyResourceId); }
      if (!essai && Object.keys(m).length) await kv.hset(`cpt:idx:${b}`, m);
      fiches += d.customers.nodes.length;
      curseur = d.customers.pageInfo.endCursor;
      if (!d.customers.pageInfo.hasNextPage) { fini = true; break; }
      if (essai) break;
    }
    if (!essai) await kv.set(`cpt:idx:${b}:etat`, fini ? { depuis: etat.debut, curseur: null, debut: new Date().toISOString() } : { ...etat, curseur });
    bilan[b] = { fiches, fini };
  }
  return bilan;
}
export async function indexPret(): Promise<boolean> {
  for (const b of Object.keys(BOUTIQUES) as Boutique[]) {
    if (!BOUTIQUES[b].jeton) continue;
    const e = await kv.get<{ depuis: string | null }>(`cpt:idx:${b}:etat`);
    if (!e?.depuis) return false; // premier parcours pas encore terminé
  }
  return true;
}

// ── 5. Écriture sur les fiches (Shopify d'abord, sinon profil Klaviyo) ──────
type Etat = { n: number; budget: number; dernier: string; profil: Profil };
export async function ecrire(montre: Montre, essai: boolean) {
  const jours = joursAvant(JOURS_FENETRE);
  const n = new Map<string, number>();
  for (const j of jours) await hashEntier(`cpt:j:${j}`, (e, v) => n.set(e, (n.get(e) ?? 0) + Number(v)));
  const ecrit = new Map<string, string>();
  await hashEntier("cpt:ecrit", (e, v) => ecrit.set(e, v));
  const profils = new Map<string, Profil>();
  await hashEntier("cpt:profil", (e, v) => profils.set(e, v as Profil));
  // à écrire : tout email dont le chiffre a changé (y compris retour à 0 quand les jours sortent de la fenêtre)
  const cand = new Set<string>([...n.keys()]);
  for (const [e, v] of ecrit) if (!v.startsWith("0|")) cand.add(e);
  const derniers = new Map<string, string>();
  const liste = [...cand];
  for (let i = 0; i < liste.length; i += 500) {
    const part = liste.slice(i, i + 500);
    const v = (await kv.hmget<Record<string, string>>("cpt:dernier", ...part)) ?? {};
    for (const e of part) if (v?.[e]) derniers.set(e, String(v[e]));
  }
  const aEcrire: [string, Etat][] = [];
  for (const e of liste) {
    const profil = profils.get(e) ?? "normale";
    const etat: Etat = { n: n.get(e) ?? 0, budget: BUDGET[profil], dernier: derniers.get(e) ?? "", profil };
    if (ecrit.get(e) !== `${etat.n}|${etat.budget}|${etat.dernier}`) aEcrire.push([e, etat]);
  }
  const bilan = { aEcrire: aEcrire.length, shopify: 0, joaillerie: 0, klaviyo: 0, reste: 0, auDessus: 0 };
  for (const [, s] of aEcrire) if (s.n > s.budget) bilan.auDessus++;
  if (essai) { bilan.reste = aEcrire.length; return bilan; }

  // répartition par boutique
  const ou = new Map<string, { b: Boutique; id: string }>();
  for (const b of ["yourmood", "joaillerie"] as Boutique[]) {
    if (!BOUTIQUES[b].jeton) continue;
    const sans = aEcrire.map(([e]) => e).filter((e) => !ou.has(e));
    for (let i = 0; i < sans.length; i += 500) {
      const part = sans.slice(i, i + 500);
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
      const erreurs = d.metafieldsSet.userErrors as { message: string }[];
      if (erreurs.length && erreurs.length >= part.length * 2) throw new Error(`Shopify ${b} : ${erreurs[0].message}`);
      await kv.hset("cpt:ecrit", Object.fromEntries(part.map(([e, s]) => [e, `${s.n}|${s.budget}|${s.dernier}`])));
      if (b === "yourmood") bilan.shopify += part.length; else bilan.joaillerie += part.length;
    }
  }
  // sans fiche Shopify (ou joaillerie seulement si la marketplace l'a) : profil Klaviyo, par lots de 5 000
  const kl = aEcrire.filter(([e]) => !ou.has(e));
  for (let i = 0; i < kl.length && reste(montre) > 15000; i += 5000) {
    const part = kl.slice(i, i + 5000);
    await kpost("https://a.klaviyo.com/api/profile-bulk-import-jobs/", { data: { type: "profile-bulk-import-job", attributes: { profiles: { data: part.map(([e, s]) => ({ type: "profile", attributes: { email: e, properties: { compteur_messages_7j: s.n, compteur_budget_semaine: s.budget, compteur_profil: s.profil, ...(s.dernier ? { compteur_dernier_message: s.dernier } : {}) } } })) } } } });
    await kv.hset("cpt:ecrit", Object.fromEntries(part.map(([e, s]) => [e, `${s.n}|${s.budget}|${s.dernier}`])));
    bilan.klaviyo += part.length;
  }
  bilan.reste = bilan.aEcrire - bilan.shopify - bilan.joaillerie - bilan.klaviyo;
  return bilan;
}
