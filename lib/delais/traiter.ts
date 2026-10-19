// Assistant des délais — traitement d'un ticket Gorgias : appelé à chaque nouveau message cliente,
// et à la demande depuis la page /delais (« relire la commande et refaire le brouillon »).
import { detectDelayInquiry } from "@/lib/email";
import { getTicket, getTicketMessages } from "@/lib/gorgias";
import { faitsCommande, type Faits } from "@/lib/delais/faits";
import { redigerBrouillon } from "@/lib/delais/brouillon";
import { langueDuMessage } from "@/lib/delais/langue";
import { detecterTaille, faitsTaille, redigerTaille } from "@/lib/delais/taille";
import { enregistrer, lire, majCarte, reprendre, type Brouillon } from "@/lib/delais/registre";

export const PHILIPPE = 15486626;     // compte Gorgias de Philippe
const EQUIPE_DELAIS = 4403;           // groupe « Délais de livraison »

export const attribueA = (t: Record<string, unknown>) => Number((t.assignee_user as Record<string, unknown> | null)?.id ?? 0);

/** Le ticket n'est pas (ou plus) au nom de Philippe : sa carte à valider disparaît de la page. */
async function masquer(deja: Brouillon | null) {
  if (deja && deja.etat === "a_valider" && deja.chezPhilippe !== false) await majCarte({ ...deja, chezPhilippe: false });
}
/** Le ticket est revenu au nom de Philippe : sa carte réapparaît. */
async function montrer(deja: Brouillon) {
  if (deja.chezPhilippe === false) await majCarte({ ...deja, chezPhilippe: true });
}

/** Décision Philippe (19.10.2026) : l'outil ne s'attribue plus les tickets. Il ne prépare un
 *  brouillon que pour les tickets déjà au nom de Philippe dans Gorgias (tri de l'équipe ou
 *  automatisation), et masque la carte d'un ticket réattribué à quelqu'un d'autre.
 *  forcer = « Relire la commande » depuis la page : on refait le brouillon même si ce message
 *  a déjà été vu. Sinon (appel de Gorgias : nouveau message, ticket rangé ou attribué) on ne
 *  refait rien pour un message déjà traité, et rien quand le dernier message vient de l'équipe. */
export async function traiter(ticketId: number, forcer = false) {
  const t = await getTicket(ticketId);
  if (attribueA(t) !== PHILIPPE) return masquer(await lire(ticketId));
  // e-mail et WhatsApp (la réponse WhatsApp part depuis le ticket Gorgias, sur son téléphone) ;
  // jamais les robots (notifications Shopify « mentioned on order », PayPal, no-reply…)
  if (t.channel !== "email" || t.spam) return;
  const whatsapp = t.via === "whatsapp";   // WhatsApp (relais Konvo) : on répond aussi depuis Gorgias
  const emailClient = String(((t.customer ?? {}) as Record<string, unknown>).email ?? "").toLowerCase();
  // notification interne Shopify (« X mentioned you on order #… ») : on la prend si elle parle
  // de délai, et la réponse part directement à la cliente de cette commande (décision Philippe)
  const mention = emailClient === "mailer@shopify.com" ? String(t.subject ?? "").match(/mentioned (?:you )?on order #?(\d+)/i) : null;
  if (mention) return traiterMention(ticketId, t, mention[1], forcer);
  if (!emailClient || (!whatsapp && /konvoai/.test(emailClient)) || /shopify\.com|paypal|no-?reply|mailer|notification|facebookmail|pinterest|instagram/.test(emailClient)) return;
  const msgs = await getTicketMessages(ticketId);
  if (!forcer && msgs[msgs.length - 1]?.from_agent === true) return;   // l'équipe a répondu en dernier
  const clientes = msgs.filter((m) => m.from_agent === false && m.public !== false);
  const dernier = clientes[clientes.length - 1];
  if (!dernier) return;
  // ce message-là a déjà été traité (envoyé ou écarté) → rien à refaire
  const deja = await lire(ticketId);
  // un brouillon encore « à valider » n'est refait que sur demande (bouton « Relire la commande »)
  if (deja && deja.messageId === Number(dernier.id) && (deja.etat !== "a_valider" || !forcer)) return montrer(deja);

  const equipe = Number((t.assignee_team as Record<string, unknown> | null)?.id ?? 0);
  const texte = [String(t.subject ?? ""), ...clientes.map((m) => String(m.stripped_text ?? m.body_text ?? ""))].join("\n---\n");
  // changement de taille d'abord (un message « trop petite, commande #… » parle aussi de la commande)
  const tai = await detecterTaille(texte).catch(() => ({ oui: false, commande: null, taille: null }));
  if (tai.oui) return traiterTaille(ticketId, t, dernier, tai, whatsapp, deja);
  const det = await detectDelayInquiry(texte.slice(-6000));
  if (!(equipe === EQUIPE_DELAIS || !!deja || det.is_delay_inquiry)) return;

  // faits Shopify + brouillon
  const cust = (t.customer ?? {}) as Record<string, unknown>;
  const email = String(cust.email ?? (dernier.sender as Record<string, unknown>)?.email ?? "");
  const faits = await faitsCommande(det.order_number, email);
  const autres = await autresCommandes(texte, faits.commande, email);
  const prenom = faits.prenom || String(cust.firstname ?? "");
  const messageClient = String(dernier.stripped_text ?? dernier.body_text ?? "");
  faits.langue = langueDuMessage(messageClient) ?? faits.langue;
  const brouillon = await redigerBrouillon({ faits, autres, messageClient, prenom, canal: whatsapp ? "whatsapp" : "email" });
  const src = (dernier.source ?? {}) as Record<string, unknown>;
  const to = ((src.to ?? []) as Record<string, unknown>[])[0];
  const relais = whatsapp ? String(((src.from ?? {}) as Record<string, unknown>).address ?? "") : "";
  await enregistrer(reprendre(deja, {
    ticketId, messageId: Number(dernier.id), recuLe: String(dernier.created_datetime ?? new Date().toISOString()),
    client: String(cust.name ?? prenom ?? email), email, sujet: String(t.subject ?? ""), message: messageClient.slice(0, 4000),
    type: "delai", faits, autres: autres.length ? autres : undefined, brouillon, depuis: String(to?.address ?? "contact@yourmood.net"), etat: "a_valider",
    canal: whatsapp ? "whatsapp" : "email", adresseReponse: relais || undefined, chezPhilippe: true,
  }));
}

/** Les autres numéros de commande cités dans le message (6 chiffres, 39xxxx-40xxxx…), jusqu'à 5.
 *  Seulement les commandes de la même adresse que le ticket : on ne parle jamais de la commande de quelqu'un d'autre. */
async function autresCommandes(texte: string, principale: string | null, email: string): Promise<Faits[]> {
  const deja = new Set([String(principale ?? "").replace(/\D/g, "")]);
  const nums = [...texte.matchAll(/(?<![\d.,'’])#?\s?([34]\d{5})(?![\d.,'’]\d)/g)].map((m) => m[1]).filter((n) => !deja.has(n) && (deja.add(n), true)).slice(0, 5);
  if (!nums.length || !email) return [];
  const { shopifyGet } = await import("@/lib/shopify");
  const out: Faits[] = [];
  for (const n of nums) {
    const o = ((await shopifyGet(`/orders.json?name=%23${n}&status=any&limit=1&fields=email`)).orders as Record<string, unknown>[] ?? [])[0];
    if (!o || String(o.email ?? "").toLowerCase() !== email.toLowerCase()) continue;
    const f = await faitsCommande(n, "");
    if (f.statut !== "introuvable") out.push(f);
  }
  return out;
}

async function traiterTaille(ticketId: number, t: Record<string, unknown>, dernier: Record<string, unknown>, tai: { commande: string | null; taille: string | null }, whatsapp: boolean, deja: Brouillon | null) {
  const cust = (t.customer ?? {}) as Record<string, unknown>;
  const email = String(cust.email ?? (dernier.sender as Record<string, unknown>)?.email ?? "");
  const f = await faitsTaille(tai.commande, email, tai.taille);
  const messageClient = String(dernier.stripped_text ?? dernier.body_text ?? "");
  if (f) f.langue = langueDuMessage(messageClient) ?? f.langue;
  const brouillon = f ? await redigerTaille(f, messageClient, whatsapp ? "whatsapp" : "email")
    : "Bonjour,\n\nNous avons bien reçu votre demande de changement de taille. Pourriez-vous nous indiquer votre numéro de commande ?\n\nExcellente journée.\n\nCordialement,\nPhilippe";
  const src = (dernier.source ?? {}) as Record<string, unknown>;
  const to = ((src.to ?? []) as Record<string, unknown>[])[0];
  await enregistrer(reprendre(deja, {
    ticketId, messageId: Number(dernier.id), recuLe: String(dernier.created_datetime ?? new Date().toISOString()),
    client: String(cust.name ?? email), email, sujet: String(t.subject ?? ""), message: messageClient.slice(0, 4000),
    type: "taille", faits: null, taille: f, brouillon, depuis: String(to?.address ?? "contact@yourmood.net"), etat: "a_valider",
    canal: whatsapp ? "whatsapp" : "email",
    adresseReponse: whatsapp ? String(((src.from ?? {}) as Record<string, unknown>).address ?? "") || undefined : undefined,
    chezPhilippe: true,
  }));
}

// Commentaire laissé sur une commande dans Shopify par l'équipe (boutique, atelier) et relayé
// par e-mail : on lit le commentaire, et si c'est une question de délai, brouillon pour la cliente.
async function traiterMention(ticketId: number, t: Record<string, unknown>, numero: string, forcer: boolean) {
  const msgs = await getTicketMessages(ticketId);
  const m = msgs.filter((x) => x.from_agent === false).pop();
  if (!m) return;
  const deja = await lire(ticketId);
  if (deja && deja.messageId === Number(m.id) && (deja.etat !== "a_valider" || !forcer)) return montrer(deja);
  const brut = String(m.body_text ?? "");
  // le commentaire est le texte entre « mentioned you on order #… » et la fin, sans les liens
  const commentaire = brut.replace(/\(https?:\/\/[^)]*\)/g, " ").replace(/https?:\/\/\S+/g, " ")
    .replace(/^[\s\S]*?mentioned you on order #?\d+\.?/i, "").replace(/Mood Collection/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
  const det = await detectDelayInquiry(`Internal note from our team about order #${numero}: ${commentaire}`);
  if (!det.is_delay_inquiry) return;
  const faits = await faitsCommande(numero, "");
  if (faits.statut === "introuvable") return;
  const { shopifyGet } = await import("@/lib/shopify");
  const o = ((await shopifyGet(`/orders.json?name=%23${numero}&status=any&limit=1&fields=email,customer`)).orders as Record<string, unknown>[] ?? [])[0] ?? {};
  const cust = (o.customer ?? {}) as Record<string, unknown>;
  const email = String(o.email ?? cust.email ?? "");
  if (!email) return;
  const nom = [cust.first_name, cust.last_name].filter(Boolean).join(" ") || email;
  const brouillon = await redigerBrouillon({
    faits, prenom: faits.prenom,
    messageClient: `(No message from the customer: our team left this internal note on the order — never quote it, write a spontaneous update to the customer about her order.) ${commentaire}`,
  });
  await enregistrer(reprendre(deja, {
    ticketId, messageId: Number(m.id), recuLe: String(m.created_datetime ?? new Date().toISOString()),
    client: nom, email, sujet: `Votre commande ${faits.commande ?? "#" + numero}`,
    message: `Note interne Shopify sur ${faits.commande ?? "#" + numero} : ${commentaire}`,
    type: "delai", faits, brouillon, depuis: "contact@yourmood.net", etat: "a_valider", chezPhilippe: true,
  }));
}
