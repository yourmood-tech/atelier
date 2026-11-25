// Pilotage des boutiques (demande de Philippe, 25.11.2026) : ce que chaque boutique se fait envoyer en réassort
// (valeur au prix du site, la commande étant à 0 CHF) face à ce qu'elle vend en caisse. But : vérifier que le stock
// ne dort pas en boutique et qu'elle n'achète pas trop. Réservé à Philippe, Stéphanie et Fabienne.
import { kv } from "@vercel/kv";
import { shopifyGraphql } from "@/lib/shopify";
import { TAG_REASSORT } from "@/lib/reassort-boutique";

// boutiques : mêmes lieux que l'outil de réassort ; « Réassort stand » = toutes les autres caisses (salons, Manor…)
export const BOUTIQUES: { nom: string; lieu: number | null }[] = [
  { nom: "Orbe", lieu: 467716 },
  { nom: "Carouge", lieu: 4514565 },
  { nom: "Martigny", lieu: 4686021 },
  { nom: "Fribourg", lieu: 14059831389 },
  { nom: "Zürich", lieu: 229015570 },
  { nom: "Zermatt", lieu: 37359681629 },
  { nom: "Réassort stand", lieu: null },
];
const STAND = "Réassort stand";
const nomDuLieu = (lieu: number | null) => BOUTIQUES.find((b) => b.lieu === lieu)?.nom ?? STAND;

type Jour = Record<string, [number, number]>; // boutique → [CA en CHF, pièces vendues]
const K_JOUR = (j: string) => `pil:j:${j}`;
export const DEBUT_HISTORIQUE = "2025-11-01";

// ── dates en heure suisse ────────────────────────────────────────────────────────────
export const jourSuisse = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(d); // AAAA-MM-JJ
function decalage(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`);
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", hourCycle: "h23" }).format(d));
  return `+0${h - 12}:00`;
}
const lendemain = (j: string) => { const d = new Date(`${j}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

// ── ventes en caisse d'un jour, par boutique ─────────────────────────────────────────
type GqlVente = { id: string; cancelledAt: string | null; retailLocation: { id: string } | null;
  currentTotalPriceSet: { shopMoney: { amount: string } }; currentSubtotalLineItemsQuantity: number };

async function ventesDuJour(jour: string): Promise<Jour> {
  const q = `created_at:>='${jour}T00:00:00${decalage(jour)}' AND created_at:<'${lendemain(jour)}T00:00:00${decalage(lendemain(jour))}' AND source_name:pos`;
  const res: Jour = {};
  let apres: string | null = null;
  for (let page = 0; page < 20; page++) {
    const r: { orders: { nodes: GqlVente[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } = await shopifyGraphql(
      `query($q:String!,$a:String){ orders(first:250, after:$a, query:$q){ nodes{ id cancelledAt retailLocation{ id }
        currentTotalPriceSet{ shopMoney{ amount } } currentSubtotalLineItemsQuantity } pageInfo{ hasNextPage endCursor } } }`,
      { q, a: apres });
    for (const o of r.orders.nodes) {
      if (o.cancelledAt) continue;
      const lieu = o.retailLocation ? Number(o.retailLocation.id.split("/").pop()) : null;
      const b = nomDuLieu(lieu);
      const v = (res[b] ??= [0, 0]);
      v[0] += Number(o.currentTotalPriceSet.shopMoney.amount) || 0;
      v[1] += o.currentSubtotalLineItemsQuantity || 0;
    }
    if (!r.orders.pageInfo.hasNextPage) break;
    apres = r.orders.pageInfo.endCursor;
  }
  return res;
}

// rattrape les jours manquants (les 3 derniers jours sont toujours recalculés : retours, annulations)
export async function rattraper(maxJours = 12): Promise<{ faits: number; reste: number }> {
  const auj = jourSuisse(new Date());
  const jours: string[] = [];
  for (let j = DEBUT_HISTORIQUE; j <= auj; j = lendemain(j)) jours.push(j);
  const recents = new Set(jours.slice(-3));
  const connus = await kv.mget<(Jour | null)[]>(...jours.map(K_JOUR));
  // les plus récents d'abord : les dernières semaines s'affichent tout de suite
  const aFaire = jours.filter((j, i) => recents.has(j) || connus[i] == null).reverse();
  let faits = 0;
  for (const j of aFaire.slice(0, maxJours)) {
    await kv.set(K_JOUR(j), await ventesDuJour(j));
    faits++;
  }
  return { faits, reste: Math.max(0, aFaire.length - faits) };
}

// ── réassorts ─────────────────────────────────────────────────────────────────────────
type GqlReassort = { id: string; name: string; createdAt: string; cancelledAt: string | null; tags: string[];
  lineItems: { nodes: { quantity: number; originalUnitPriceSet: { shopMoney: { amount: string } } }[] } };

async function reassorts(): Promise<{ jour: string; boutique: string; valeur: number; pieces: number; commande: string }[]> {
  const out: { jour: string; boutique: string; valeur: number; pieces: number; commande: string }[] = [];
  let apres: string | null = null;
  for (let page = 0; page < 20; page++) {
    const r: { orders: { nodes: GqlReassort[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } = await shopifyGraphql(
      `query($q:String!,$a:String){ orders(first:100, after:$a, query:$q){ nodes{ id name createdAt cancelledAt tags
        lineItems(first:100){ nodes{ quantity originalUnitPriceSet{ shopMoney{ amount } } } } } pageInfo{ hasNextPage endCursor } } }`,
      { q: `tag:'${TAG_REASSORT}'`, a: apres });
    for (const o of r.orders.nodes) {
      if (o.cancelledAt) continue;
      const t = o.tags.find((x) => /^BOUTIQUE-/i.test(x));
      const nom = t ? t.replace(/^BOUTIQUE-/i, "").trim() : STAND;
      const boutique = BOUTIQUES.find((b) => b.nom.toLowerCase() === nom.toLowerCase())?.nom ?? STAND;
      let valeur = 0, pieces = 0;
      for (const l of o.lineItems.nodes) { valeur += l.quantity * (Number(l.originalUnitPriceSet.shopMoney.amount) || 0); pieces += l.quantity; }
      out.push({ jour: jourSuisse(new Date(o.createdAt)), boutique, valeur, pieces, commande: o.name });
    }
    if (!r.orders.pageInfo.hasNextPage) break;
    apres = r.orders.pageInfo.endCursor;
  }
  return out;
}

// ── tableau : une ligne par boutique et par jour ─────────────────────────────────────
export type LigneJour = { jour: string; boutique: string; achat: number; achatPieces: number; ventes: number; ventesPieces: number };

export async function donnees(): Promise<{ lignes: LigneJour[]; reassorts: { jour: string; boutique: string; valeur: number; pieces: number; commande: string }[]; jusquau: string; manquants: number }> {
  const auj = jourSuisse(new Date());
  const jours: string[] = [];
  for (let j = DEBUT_HISTORIQUE; j <= auj; j = lendemain(j)) jours.push(j);
  const ventes = await kv.mget<(Jour | null)[]>(...jours.map(K_JOUR));
  const ra = await reassorts();
  const cle = (j: string, b: string) => `${j}|${b}`;
  const m = new Map<string, LigneJour>();
  const ligne = (jour: string, boutique: string) => {
    const k = cle(jour, boutique);
    if (!m.has(k)) m.set(k, { jour, boutique, achat: 0, achatPieces: 0, ventes: 0, ventesPieces: 0 });
    return m.get(k)!;
  };
  jours.forEach((j, i) => {
    for (const [b, [ca, p]] of Object.entries(ventes[i] ?? {})) { const l = ligne(j, b); l.ventes += ca; l.ventesPieces += p; }
  });
  for (const r of ra) { const l = ligne(r.jour, r.boutique); l.achat += r.valeur; l.achatPieces += r.pieces; }
  return { lignes: [...m.values()], reassorts: ra.sort((a, b) => b.jour.localeCompare(a.jour)), jusquau: auj, manquants: ventes.filter((v) => v == null).length };
}
