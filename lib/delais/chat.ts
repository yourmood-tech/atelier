// Chat du site → proposition de réponse en NOTE INTERNE dans Gorgias (décision Philippe 03.11.2026).
// Les conversations du chat sont tenues par Marlène, Fabienne et les boutiques (2 sur 36 au nom de
// Philippe en octobre) : la proposition va donc dans la conversation elle-même, visible seulement par
// l'équipe, quel que soit le nom attribué. Rien n'est envoyé à la cliente : la personne au chat relit,
// ajuste et envoie. Même périmètre que la page /delais : délais et changements de taille.
import { kv } from "@vercel/kv";
import { detectDelayInquiry } from "@/lib/email";
import { getTicketMessages, postInternalNote } from "@/lib/gorgias";
import { faitsCommande } from "@/lib/delais/faits";
import { redigerBrouillon } from "@/lib/delais/brouillon";
import { langueDuMessage } from "@/lib/delais/langue";
import { detecterTaille, faitsTaille, redigerTaille } from "@/lib/delais/taille";

const VU = (id: number) => `delais:chat:${id}`;   // dernier message cliente déjà traité (pas deux notes pour le même)
const ENTETE = "💡 Proposition de réponse (assistant mood — à relire avant d'envoyer)";

/** Retire la formule de fin et la signature : c'est la collègue du chat qui envoie, sous son nom. */
function sansSignature(t: string): string {
  const lignes = t.trim().split("\n");
  while (lignes.length && /^\s*(cordialement|freundliche gr(ü|u)(ss|ß)e|kind regards|best regards|philippe|mood|excellente journée\.?|einen schönen tag\.?|have a (lovely|great) day\.?)?,?\s*$/i.test(lignes[lignes.length - 1])) lignes.pop();
  return lignes.join("\n").trim();
}

export async function traiterChat(ticketId: number, t: Record<string, unknown>) {
  const msgs = (await getTicketMessages(ticketId)).filter((m) => m.channel !== "internal-note");
  const dernier = msgs[msgs.length - 1];
  if (!dernier || dernier.from_agent !== false) return;          // l'équipe a déjà répondu en dernier
  if (Number(await kv.get(VU(ticketId))) === Number(dernier.id)) return;
  await kv.set(VU(ticketId), Number(dernier.id), { ex: 60 * 24 * 3600 });

  const clientes = msgs.filter((m) => m.from_agent === false);
  const texte = clientes.map((m) => String(m.stripped_text ?? m.body_text ?? "")).join("\n---\n");
  const messageClient = String(dernier.stripped_text ?? dernier.body_text ?? "");
  const cust = (t.customer ?? {}) as Record<string, unknown>;
  const email = String(cust.email ?? "");

  let proposition: string | null = null, resume = "";
  const tai = await detecterTaille(texte).catch(() => ({ oui: false, commande: null, taille: null }));
  if (tai.oui) {
    const f = await faitsTaille(tai.commande, email, tai.taille);
    if (f) f.langue = langueDuMessage(texte) ?? f.langue;
    proposition = f ? await redigerTaille(f, messageClient, "email") : null;
    resume = f ? `Changement de taille · commande ${f.commande ?? "?"}${f.aFaire ? ` · À FAIRE : ${f.aFaire}` : ""}` : "";
  } else {
    const det = await detectDelayInquiry(texte.slice(-6000));
    if (!det.is_delay_inquiry) return;
    const faits = await faitsCommande(det.order_number, email);
    faits.langue = langueDuMessage(texte) ?? faits.langue;
    proposition = await redigerBrouillon({ faits, messageClient, prenom: faits.prenom || String(cust.firstname ?? ""), canal: "chat" });
    resume = faits.statut === "introuvable" ? "Commande pas trouvée : demander le numéro de commande." : `Délai · commande ${faits.commande} · statut ${faits.statut}`;
  }
  if (!proposition) return;
  await postInternalNote(ticketId, `${ENTETE}\n\n${sansSignature(proposition)}\n\n— ${resume}`);
}
