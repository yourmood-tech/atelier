// « Tableau blanc » des délais, PAR FOURNISSEUR (décisions Philippe 03.11.2026) : quand l'assistant
// ne trouve pas de date fiable, il dit chez quel fournisseur ça bloque ; Philippe écrit l'indication
// du moment pour ce fournisseur (« mi-novembre ») et elle est reprise dans chaque brouillon concerné.
// Analyse de 93 réponses envoyées : 53 fois sur 60, Philippe remplaçait « nous reviendrons vers vous
// avec une date » par une période ; 9 fois sur 18 il complétait la date de la boîte par « fin novembre ».
import { kv } from "@vercel/kv";
import { BOITES } from "./bloque";

export type Consignes = {
  parFournisseur: Record<string, string>;   // fournisseur → « mi-novembre », « fin novembre »…
  majLe: string | null;
};

const CLE = "delais:consignes";

export async function lireConsignes(): Promise<Consignes> {
  try {
    const v = (await kv.get<Record<string, unknown>>(CLE)) ?? {};
    const par = { ...((v.parFournisseur as Record<string, string>) ?? {}) };
    if (typeof v.boites === "string" && v.boites && !par[BOITES]) par[BOITES] = v.boites;   // première version (une seule case boîtes)
    return { parFournisseur: par, majLe: (v.majLe as string) ?? null };
  } catch { return { parFournisseur: {}, majLe: null }; }
}

export async function ecrireConsignes(par: Record<string, unknown>): Promise<Consignes> {
  const net = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const propre: Record<string, string> = {};
  for (const [k, val] of Object.entries(par ?? {})) { const n = net(k), t = net(val); if (n && t) propre[n] = t; }
  const v: Consignes = { parFournisseur: propre, majLe: new Date().toISOString() };
  await kv.set(CLE, v);
  return v;
}

/** L'indication du moment pour ce fournisseur, ou chaîne vide. */
export const indication = (c: Consignes, fournisseur: string | null) => (fournisseur ? c.parFournisseur[fournisseur] ?? "" : "");
