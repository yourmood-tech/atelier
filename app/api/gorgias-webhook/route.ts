import { NextRequest, NextResponse, after } from "next/server";
import { detectDelayInquiry } from "@/lib/email";
import { assignTicket, getTicket, getTicketMessages } from "@/lib/gorgias";
import { faitsCommande } from "@/lib/delais/faits";
import { redigerBrouillon } from "@/lib/delais/brouillon";
import { langueDuMessage } from "@/lib/delais/langue";
import { detecterTaille, faitsTaille, redigerTaille } from "@/lib/delais/taille";
import { enregistrer, lire } from "@/lib/delais/registre";

export const maxDuration = 120;

// Assistant des délais (16.10.2026) — chaque nouveau message cliente par e-mail :
//  1. est-ce une demande de délai ? (groupe « Délais de livraison » ou détection du texte)
//  2. si oui : le ticket est attribué à Philippe, et un brouillon est préparé à partir des seuls
//     faits Shopify (commande, envois, étiquettes d'atelier) ;
//  3. le brouillon attend la validation de Philippe sur la page /delais (rien n'est envoyé seul).
const PHILIPPE = 15486626;            // compte Gorgias de Philippe
const EQUIPE_DELAIS = 4403;           // groupe « Délais de livraison »

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch { return NextResponse.json({ ok: true, skipped: "corps illisible" }); }
  const ev = (body?.event as Record<string, unknown>) ?? {};
  const data = (ev.data as Record<string, unknown>) ?? {};
  const ticket = data.ticket as Record<string, unknown> | undefined;
  const message = data.message as Record<string, unknown> | undefined;
  if (!ticket?.id) return NextResponse.json({ ok: true, skipped: "pas de ticket" });
  if (message?.from_agent === true) return NextResponse.json({ ok: true, skipped: "message de l'équipe" });
  // Gorgias attend une réponse rapide : le travail se fait juste après
  after(async () => { try { await traiter(Number(ticket.id)); } catch (e) { console.error("[délais] ticket", ticket.id, e); } });
  return NextResponse.json({ ok: true });
}

async function traiter(ticketId: number) {
  const t = await getTicket(ticketId);
  // e-mail uniquement : une demande arrivée par WhatsApp se répond sur WhatsApp, pas par e-mail ;
  // et jamais les robots (notifications Shopify « mentioned on order », PayPal, no-reply…)
  if (t.channel !== "email" || t.via === "whatsapp" || t.spam) return;
  const emailClient = String(((t.customer ?? {}) as Record<string, unknown>).email ?? "").toLowerCase();
  // notification interne Shopify (« X mentioned you on order #… ») : on la prend si elle parle
  // de délai, et la réponse part directement à la cliente de cette commande (décision Philippe)
  const mention = emailClient === "mailer@shopify.com" ? String(t.subject ?? "").match(/mentioned (?:you )?on order #?(\d+)/i) : null;
  if (mention) return traiterMention(ticketId, t, mention[1]);
  if (!emailClient || /shopify\.com|konvoai|paypal|no-?reply|mailer|notification|facebookmail|pinterest|instagram/.test(emailClient)) return;
  const msgs = await getTicketMessages(ticketId);
  const clientes = msgs.filter((m) => m.from_agent === false && m.public !== false);
  const dernier = clientes[clientes.length - 1];
  if (!dernier) return;
  // ce message-là a déjà été traité (envoyé ou écarté) → rien à refaire
  const deja = await lire(ticketId);
  // (un brouillon encore « à valider » peut être refait : on le recalcule avec les infos du jour)
  if (deja && deja.messageId === Number(dernier.id) && deja.etat !== "a_valider") return;

  const equipe = Number((t.assignee_team as Record<string, unknown> | null)?.id ?? 0);
  const chezPhilippe = Number((t.assignee_user as Record<string, unknown> | null)?.id ?? 0) === PHILIPPE && !!deja;
  const texte = [String(t.subject ?? ""), ...clientes.map((m) => String(m.stripped_text ?? m.body_text ?? ""))].join("\n---\n");
  // changement de taille d'abord (un message « trop petite, commande #… » parle aussi de la commande)
  const tai = await detecterTaille(texte).catch(() => ({ oui: false, commande: null, taille: null }));
  if (tai.oui) return traiterTaille(ticketId, t, dernier, tai);
  const det = await detectDelayInquiry(texte.slice(-6000));
  if (!(equipe === EQUIPE_DELAIS || chezPhilippe || det.is_delay_inquiry)) return;

  // 1) le ticket passe sur le compte de Philippe
  if (Number((t.assignee_user as Record<string, unknown> | null)?.id ?? 0) !== PHILIPPE) await assignTicket(ticketId, PHILIPPE);

  // 2) faits Shopify + brouillon
  const cust = (t.customer ?? {}) as Record<string, unknown>;
  const email = String(cust.email ?? (dernier.sender as Record<string, unknown>)?.email ?? "");
  const faits = await faitsCommande(det.order_number, email);
  const prenom = faits.prenom || String(cust.firstname ?? "");
  const messageClient = String(dernier.stripped_text ?? dernier.body_text ?? "");
  faits.langue = langueDuMessage(messageClient) ?? faits.langue;
  const brouillon = await redigerBrouillon({ faits, messageClient, prenom });
  const src = (dernier.source ?? {}) as Record<string, unknown>;
  const to = ((src.to ?? []) as Record<string, unknown>[])[0];
  await enregistrer({
    ticketId, messageId: Number(dernier.id), recuLe: String(dernier.created_datetime ?? new Date().toISOString()),
    client: String(cust.name ?? prenom ?? email), email, sujet: String(t.subject ?? ""), message: messageClient.slice(0, 4000),
    type: "delai", faits, brouillon, depuis: String(to?.address ?? "contact@yourmood.net"), etat: "a_valider",
  });
}

async function traiterTaille(ticketId: number, t: Record<string, unknown>, dernier: Record<string, unknown>, tai: { commande: string | null; taille: string | null }) {
  if (Number((t.assignee_user as Record<string, unknown> | null)?.id ?? 0) !== PHILIPPE) await assignTicket(ticketId, PHILIPPE);
  const cust = (t.customer ?? {}) as Record<string, unknown>;
  const email = String(cust.email ?? (dernier.sender as Record<string, unknown>)?.email ?? "");
  const f = await faitsTaille(tai.commande, email, tai.taille);
  const messageClient = String(dernier.stripped_text ?? dernier.body_text ?? "");
  if (f) f.langue = langueDuMessage(messageClient) ?? f.langue;
  const brouillon = f ? await redigerTaille(f, messageClient)
    : "Bonjour,\n\nNous avons bien reçu votre demande de changement de taille. Pourriez-vous nous indiquer votre numéro de commande ?\n\nExcellente journée.\n\nCordialement,\nPhilippe";
  const src = (dernier.source ?? {}) as Record<string, unknown>;
  const to = ((src.to ?? []) as Record<string, unknown>[])[0];
  await enregistrer({
    ticketId, messageId: Number(dernier.id), recuLe: String(dernier.created_datetime ?? new Date().toISOString()),
    client: String(cust.name ?? email), email, sujet: String(t.subject ?? ""), message: messageClient.slice(0, 4000),
    type: "taille", faits: null, taille: f, brouillon, depuis: String(to?.address ?? "contact@yourmood.net"), etat: "a_valider",
  });
}

// Commentaire laissé sur une commande dans Shopify par l'équipe (boutique, atelier) et relayé
// par e-mail : on lit le commentaire, et si c'est une question de délai, brouillon pour la cliente.
async function traiterMention(ticketId: number, t: Record<string, unknown>, numero: string) {
  const msgs = await getTicketMessages(ticketId);
  const m = msgs.filter((x) => x.from_agent === false).pop();
  if (!m) return;
  const deja = await lire(ticketId);
  if (deja && deja.messageId === Number(m.id) && deja.etat !== "a_valider") return;
  const brut = String(m.body_text ?? "");
  // le commentaire est le texte entre « mentioned you on order #… » et la fin, sans les liens
  const commentaire = brut.replace(/\(https?:\/\/[^)]*\)/g, " ").replace(/https?:\/\/\S+/g, " ")
    .replace(/^[\s\S]*?mentioned you on order #?\d+\.?/i, "").replace(/Mood Collection/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
  const det = await detectDelayInquiry(`Internal note from our team about order #${numero}: ${commentaire}`);
  if (!det.is_delay_inquiry) return;
  if (Number((t.assignee_user as Record<string, unknown> | null)?.id ?? 0) !== PHILIPPE) await assignTicket(ticketId, PHILIPPE);
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
  await enregistrer({
    ticketId, messageId: Number(m.id), recuLe: String(m.created_datetime ?? new Date().toISOString()),
    client: nom, email, sujet: `Votre commande ${faits.commande ?? "#" + numero}`,
    message: `Note interne Shopify sur ${faits.commande ?? "#" + numero} : ${commentaire}`,
    type: "delai", faits, brouillon, depuis: "contact@yourmood.net", etat: "a_valider",
  });
}
