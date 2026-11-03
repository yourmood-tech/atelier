// « Tableau blanc » des délais (décision Philippe 03.11.2026) : le délai du moment et la date de la
// boîte turquoise, écrits par Philippe sur sa page /delais et repris dans chaque brouillon.
// Analyse de 93 réponses envoyées : 53 fois sur 60, Philippe remplaçait « nous reviendrons vers vous
// avec une date » par une période (« fin octobre – début novembre », « mi-novembre ») ; 9 fois sur 18
// il complétait la date de la boîte par « fin novembre ».
import { kv } from "@vercel/kv";

export type Consignes = {
  delaiDefaut: string;   // ex. « mi-novembre » : quand Shopify ne donne aucune date fiable
  boites: string;        // ex. « fin novembre » : arrivée des boîtes de rangement mood
  majLe: string | null;
};

const CLE = "delais:consignes";
const VIDE: Consignes = { delaiDefaut: "", boites: "", majLe: null };

export async function lireConsignes(): Promise<Consignes> {
  try { return { ...VIDE, ...((await kv.get<Consignes>(CLE)) ?? {}) }; } catch { return VIDE; }
}

export async function ecrireConsignes(c: { delaiDefaut?: string; boites?: string }): Promise<Consignes> {
  const net = (s?: string) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const v: Consignes = { delaiDefaut: net(c.delaiDefaut), boites: net(c.boites), majLe: new Date().toISOString() };
  await kv.set(CLE, v);
  return v;
}
