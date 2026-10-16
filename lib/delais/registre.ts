// Registre des brouillons de l'assistant des délais (mémoire de l'outil d'atelier).
import { kv } from "@vercel/kv";
import type { Faits } from "./faits";

export type Brouillon = {
  ticketId: number; messageId: number; recuLe: string;
  client: string; email: string; sujet: string; message: string;
  faits: Faits; brouillon: string;
  depuis: string;                       // adresse du support à laquelle la cliente a écrit
  etat: "a_valider" | "envoye" | "ecarte";
  envoyeLe?: string; texteEnvoye?: string; retouche?: boolean;
};

const CLE = (id: number) => `delais:brouillon:${id}`;
const INDEX = "delais:index";

export async function enregistrer(b: Brouillon): Promise<void> {
  await kv.set(CLE(b.ticketId), b, { ex: 120 * 24 * 3600 });
  const idx = ((await kv.get<number[]>(INDEX)) ?? []).filter((x) => x !== b.ticketId);
  await kv.set(INDEX, [b.ticketId, ...idx].slice(0, 600));
}
export async function lire(ticketId: number): Promise<Brouillon | null> {
  return (await kv.get<Brouillon>(CLE(ticketId))) ?? null;
}
export async function tous(): Promise<Brouillon[]> {
  const idx = (await kv.get<number[]>(INDEX)) ?? [];
  if (!idx.length) return [];
  const vals = await kv.mget<(Brouillon | null)[]>(...idx.map(CLE));
  return vals.filter((x): x is Brouillon => !!x);
}
