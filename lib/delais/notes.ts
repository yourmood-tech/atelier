// Ce que l'équipe a écrit sur la commande (Philippe, 17.10.2026) : la note de la commande et les
// commentaires laissés dans son historique (« Livré entre mi et fin novembre », « base donnée à
// recoller », « échange de taille, j'ai fait le changement »…). Sur 150 commandes ouvertes, 1 sur 3
// en porte. Le brouillon s'en sert comme d'un fait, sans jamais les citer.
import { shopifyGraphql } from "@/lib/shopify";

export type NoteEquipe = { date: string | null; texte: string; source: "note" | "commentaire" };

const fmt = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
// mentions Shopify « [@U107571090|Mood Collection] » → retirées ; initiales seules (« sv », « ch ») → ignorées
const nettoyer = (t: string) => t.replace(/\[@[^\]|]*\|[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
const vide = (t: string) => t.length < 3 || /^[A-Za-zÀ-ÿ]{1,3}\.?$/.test(t);

export async function notesEquipe(orderId: number, note: unknown): Promise<NoteEquipe[]> {
  const out: NoteEquipe[] = [];
  const n = nettoyer(String(note ?? ""));
  if (!vide(n)) out.push({ date: null, texte: n.slice(0, 600), source: "note" });
  try {
    const d = await shopifyGraphql<{ order: { events: { nodes: { __typename: string; createdAt: string; rawMessage?: string; attachments?: { name: string }[] }[] } } | null }>(
      `query($id: ID!) { order(id: $id) { events(first: 100) { nodes { __typename createdAt ... on CommentEvent { rawMessage attachments { name } } } } } }`,
      { id: `gid://shopify/Order/${orderId}` });
    for (const e of d.order?.events.nodes ?? []) {
      if (e.__typename !== "CommentEvent") continue;
      const t = nettoyer(e.rawMessage ?? "");
      const pj = (e.attachments ?? []).length ? ` (pièce jointe : ${(e.attachments ?? []).map((a) => a.name).join(", ")})` : "";
      if (!vide(t) || pj) out.push({ date: fmt(e.createdAt), texte: (t + pj).slice(0, 600), source: "commentaire" });
    }
  } catch (e) { console.error("[délais] historique commande", orderId, e); }
  return out;
}

/** Bloc à glisser dans la consigne de rédaction (les deux assistants : délais et tailles). */
export function notesPourRedaction(notes: NoteEquipe[]): string {
  if (!notes.length) return "";
  return `\nINTERNAL NOTES written by our team on this order (oldest first; the order note has no date):
${notes.map((x) => `- ${x.date ? x.date + " — " : "order note — "}${x.texte}`).join("\n")}
How to use these notes: they are facts from our team and they are MORE RECENT and MORE PRECISE than the automatic status above.
If a note gives a delivery estimate, a change made to the order, a part being repaired or replaced, or anything that answers the customer, use it (a more recent note wins over an older one and over the supplier estimate).
Ignore notes that are irrelevant to the customer (payment method, initials, internal routing, gift wrapping instructions…).
NEVER quote a note, never mention colleagues' names, internal tools, trays, suppliers or internal processes; rephrase for the customer.`;
}
