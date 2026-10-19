// Registre des brouillons de l'assistant des délais (mémoire de l'outil d'atelier).
import { kv } from "@vercel/kv";
import type { Faits } from "./faits";
import type { FaitsTaille } from "./taille";

export type Brouillon = {
  ticketId: number; messageId: number; recuLe: string;
  client: string; email: string; sujet: string; message: string;
  type?: "delai" | "taille";             // absent = délai (brouillons d'avant le 16.10)
  faits: Faits | null; taille?: FaitsTaille | null; brouillon: string;
  depuis: string;                       // adresse du support à laquelle la cliente a écrit
  canal?: "email" | "whatsapp";         // WhatsApp : la réponse part sur son téléphone via Gorgias
  adresseReponse?: string;              // WhatsApp : adresse-relais de la conversation (…@gorgias.konvoai.com)
  etat: "a_valider" | "envoye" | "ecarte";
  envoyeLe?: string; texteEnvoye?: string; retouche?: boolean;
  echange?: { commande: string; orderId: number; creeLe: string };   // commande d'échange de taille créée
  ticketFerme?: boolean;                // ticket Gorgias clos par l'outil
  historique?: Tour[];                  // tours précédents du même ticket (la cliente a répondu après coup)
  chezPhilippe?: boolean;               // ticket attribué à Philippe dans Gorgias ; false = carte masquée (absent = cartes d'avant le 19.10, vérifié à l'affichage)
};
export type Tour = {
  messageId: number; recuLe: string; message: string; etat: "envoye" | "ecarte";
  envoyeLe?: string; texteEnvoye?: string; retouche?: boolean; ferme?: boolean;
};

/** La cliente a écrit à nouveau sur un ticket déjà traité : le nouveau brouillon garde la trace
 *  des tours précédents et la commande d'échange déjà créée (sinon un 2e clic en créerait une autre). */
export function reprendre(deja: Brouillon | null, nouveau: Brouillon): Brouillon {
  if (!deja) return nouveau;
  const historique = [...(deja.historique ?? [])];
  if (deja.etat !== "a_valider" && deja.messageId !== nouveau.messageId) {
    historique.push({
      messageId: deja.messageId, recuLe: deja.recuLe, message: deja.message, etat: deja.etat,
      envoyeLe: deja.envoyeLe, texteEnvoye: deja.texteEnvoye, retouche: deja.retouche, ferme: deja.ticketFerme,
    });
  }
  return { ...nouveau, historique: historique.length ? historique : undefined, echange: nouveau.echange ?? deja.echange };
}

const CLE = (id: number) => `delais:brouillon:${id}`;
const INDEX = "delais:index";

export async function enregistrer(b: Brouillon): Promise<void> {
  await kv.set(CLE(b.ticketId), b, { ex: 120 * 24 * 3600 });
  const idx = ((await kv.get<number[]>(INDEX)) ?? []).filter((x) => x !== b.ticketId);
  await kv.set(INDEX, [b.ticketId, ...idx].slice(0, 600));
}
/** Met à jour une carte déjà dans le registre sans toucher à l'index (sûr en parallèle). */
export async function majCarte(b: Brouillon): Promise<void> {
  await kv.set(CLE(b.ticketId), b, { ex: 120 * 24 * 3600 });
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

/** Règle de fermeture (Philippe, 16.10.2026) : on clôt le ticket dès que la réponse est partie,
 *  sauf pour un échange de taille d'une commande déjà expédiée : seulement une fois la réponse
 *  partie ET la commande d'échange créée. */
export function peutFermer(b: Brouillon): boolean {
  if (b.etat !== "envoye") return false;
  if (b.type === "taille" && b.taille?.partie && !b.echange) return false;
  return true;
}
