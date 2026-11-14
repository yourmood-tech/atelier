// Clientes « sans plafond » — décision Philippe + Stéphanie du 14.11.2026.
// Sans plafond si (en plus des grandes cliqueuses, déjà vues par le compteur) :
//   • vraies ouvertures (ouvertures automatiques des iPhone retirées) sur ≥ 30 jours différents en 90 jours
//     ET ≥ 2 commandes en 12 mois ;
//   • OU ≥ 3 commandes en 12 mois (site + boutiques, fiche Shopify yourmood).
// Une ouverture réelle qui suit une ouverture automatique est invisible : d'où la porte « 3 commandes » seule.
//
// Rangement (stockage partagé, préfixe lib:) — calculé une fois par jour, rattrapage des 90 jours par tranches :
//   lib:o:<jour>        profils Klaviyo qui ont vraiment ouvert ce jour-là (liste d'identifiants)
//   lib:o:<jour>:part   lecture d'un jour en cours (reprise au passage suivant)
//   lib:cmd             { jour, n: { email: commandes 12 mois } } (seulement ≥ 2)
//   lib:bulk            export Shopify des commandes en cours
//   cpt2:libres         { jour, emails[] } — lu par le compteur
import { kv } from "@vercel/kv";
import { jourSuisse, joursAvant } from "./regles";
import { shopifyGql } from "./moteur";

const KLAVIYO = process.env.KLAVIYO_API_KEY ?? "";
export const OUVERTURE = "MBuxm9"; // Opened Email
export const JOURS_OUVERTURE = 30, JOURS_PERIODE = 90, CMD_AVEC_OUVERTURES = 2, CMD_SEULES = 3;
type Montre = { fin: number };
const reste = (m: Montre) => m.fin - Date.now();
export const demandesLib = { n: 0 };
const get = async <T,>(k: string) => { demandesLib.n++; return kv.get<T>(k); };
const set = async (k: string, v: unknown, ex?: number) => { demandesLib.n++; return ex ? kv.set(k, v, { ex }) : kv.set(k, v); };

async function kget(url: string): Promise<Record<string, unknown>> {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { headers: { Authorization: `Klaviyo-API-Key ${KLAVIYO}`, revision: "2025-07-15", accept: "application/vnd.api+json" }, cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`Klaviyo ${r.status} : ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  throw new Error("Klaviyo : trop de demandes");
}

// Bornes UTC d'un jour suisse (approximation à l'heure près, suffisante pour compter des jours)
const bornes = (jour: string) => {
  const a = new Date(`${jour}T00:00:00+01:00`);
  return [a.toISOString().slice(0, 19) + "Z", new Date(a.getTime() + 86400000).toISOString().slice(0, 19) + "Z"];
};

// ── 1. Vraies ouvertures, jour par jour (les jours manquants des 90 derniers, plusieurs à la fois) ─
async function lireJour(jour: string, montre: Montre): Promise<boolean> {
  const part = (await get<{ next: string; ids: string[] }>(`lib:o:${jour}:part`)) ?? null;
  const ids = new Set(part?.ids ?? []);
  const [a, b] = bornes(jour);
  let url: string | null = part?.next ?? `https://a.klaviyo.com/api/events?filter=${encodeURIComponent(`and(equals(metric_id,"${OUVERTURE}"),greater-or-equal(datetime,${a}),less-than(datetime,${b}))`)}&fields[event]=event_properties&page[size]=200`;
  while (url && reste(montre) > 0) {
    const d = await kget(url);
    for (const e of (d.data as { attributes: { event_properties?: Record<string, unknown> }; relationships?: { profile?: { data?: { id: string } } } }[]) ?? []) {
      if (e.attributes.event_properties?.machine_open) continue;
      const id = e.relationships?.profile?.data?.id; if (id) ids.add(id);
    }
    url = ((d.links as { next?: string } | undefined)?.next) ?? null;
  }
  if (url) { await set(`lib:o:${jour}:part`, { next: url, ids: [...ids] }, 3 * 86400); return false; }
  await set(`lib:o:${jour}`, [...ids], 100 * 86400);
  if (part) { demandesLib.n++; await kv.del(`lib:o:${jour}:part`); }
  return true;
}
export async function ouvertures(montre: Montre) {
  const jours = joursAvant(JOURS_PERIODE + 1).slice(1); // hier et les 89 jours d'avant
  demandesLib.n++;
  const faits = (await kv.mget<(string[] | null)[]>(...jours.map((j) => `lib:o:${j}`))) ?? [];
  const manquants = jours.filter((_, i) => !faits[i]);
  let lus = 0;
  for (let i = 0; i < manquants.length && reste(montre) > 20000; i += 3) {
    const r = await Promise.all(manquants.slice(i, i + 3).map((j) => lireJour(j, montre)));
    lus += r.filter(Boolean).length;
  }
  return { manquants: manquants.length - lus, lus };
}

// ── 2. Commandes sur 12 mois, par email (export Shopify en deux temps : lancer, puis récupérer) ─
export async function commandes(): Promise<{ etat: string; clientes?: number }> {
  const aujourdhui = jourSuisse(new Date());
  const c = await get<{ jour: string }>("lib:cmd");
  if (c?.jour === aujourdhui) return { etat: "à jour" };
  const op = await get<{ id: string; jour: string }>("lib:bulk");
  if (!op || op.jour !== aujourdhui) {
    const cur = (await shopifyGql("yourmood", `{ currentBulkOperation { id status } }`)).currentBulkOperation;
    if (cur && (cur.status === "RUNNING" || cur.status === "CREATED")) return { etat: "un autre export Shopify tourne, on attend" };
    const depuis = joursAvant(366).at(-1);
    const q = `{ orders(query: "created_at:>='${depuis}'") { edges { node { createdAt cancelledAt email customer { defaultEmailAddress { emailAddress } } } } } }`;
    const r = await shopifyGql("yourmood", `mutation($q:String!){ bulkOperationRunQuery(query:$q){ bulkOperation{ id } userErrors{ message } } }`, { q });
    const id = r.bulkOperationRunQuery.bulkOperation?.id;
    if (!id) throw new Error(`Shopify export : ${JSON.stringify(r.bulkOperationRunQuery.userErrors)}`);
    await set("lib:bulk", { id, jour: aujourdhui }, 2 * 86400);
    return { etat: "export des commandes lancé" };
  }
  const s = (await shopifyGql("yourmood", `query($id:ID!){ node(id:$id){ ... on BulkOperation { status url errorCode } } }`, { id: op.id })).node;
  if (s.status !== "COMPLETED") {
    if (["FAILED", "CANCELED", "EXPIRED"].includes(s.status)) { demandesLib.n++; await kv.del("lib:bulk"); }
    return { etat: `export Shopify : ${s.status}` };
  }
  const n: Record<string, Set<string>> = {};
  if (s.url) {
    const txt = await (await fetch(s.url, { signal: AbortSignal.timeout(60000) })).text();
    for (const ligne of txt.split("\n")) {
      if (!ligne) continue;
      const o = JSON.parse(ligne);
      if (o.cancelledAt) continue;
      const e = String(o.customer?.defaultEmailAddress?.emailAddress ?? o.email ?? "").toLowerCase();
      if (e) (n[e] ??= new Set()).add(jourSuisse(o.createdAt));
    }
  }
  const garde: Record<string, number> = {};
  for (const [e, j] of Object.entries(n)) if (j.size >= CMD_AVEC_OUVERTURES) garde[e] = j.size;
  await set("lib:cmd", { jour: aujourdhui, n: garde }, 3 * 86400);
  return { etat: "commandes comptées", clientes: Object.keys(garde).length };
}

// ── 3. La liste « sans plafond » ─────────────────────────────────────────────
export async function calculer(montre: Montre) {
  const aujourdhui = jourSuisse(new Date());
  const cmd = await get<{ jour: string; n: Record<string, number> }>("lib:cmd");
  if (!cmd) return { etat: "en attente des commandes" };
  const jours = joursAvant(JOURS_PERIODE + 1).slice(1);
  const nb = new Map<string, number>(); let presents = 0;
  for (let i = 0; i < jours.length; i += 10) {
    demandesLib.n++;
    const v = (await kv.mget<(string[] | null)[]>(...jours.slice(i, i + 10).map((j) => `lib:o:${j}`))) ?? [];
    for (const ids of v) { if (!ids) continue; presents++; for (const id of ids) nb.set(id, (nb.get(id) ?? 0) + 1); }
  }
  // emails des grandes ouvreuses
  const grandes = [...nb].filter(([, n]) => n >= JOURS_OUVERTURE).map(([id]) => id);
  const ouvreuses = new Set<string>();
  for (let i = 0; i < grandes.length && reste(montre) > 10000; i += 100) {
    const f = `any(id,[${grandes.slice(i, i + 100).map((x) => `"${x}"`).join(",")}])`;
    const d = await kget(`https://a.klaviyo.com/api/profiles?filter=${encodeURIComponent(f)}&fields[profile]=email&page[size]=100`);
    for (const p of (d.data as { attributes: { email?: string } }[]) ?? []) if (p.attributes.email) ouvreuses.add(p.attributes.email.toLowerCase());
  }
  const libres = Object.entries(cmd.n).filter(([e, n]) => n >= CMD_SEULES || ouvreuses.has(e)).map(([e]) => e);
  const r = { jour: aujourdhui, emails: libres, detail: { joursOuverture: presents, grandesOuvreuses: grandes.length, commandes3: Object.values(cmd.n).filter((n) => n >= CMD_SEULES).length } };
  await set("cpt2:libres", r);
  return { etat: "liste calculée", libres: libres.length, ...r.detail };
}

