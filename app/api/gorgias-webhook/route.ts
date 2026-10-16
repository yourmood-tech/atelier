import { NextRequest, NextResponse, after } from "next/server";
import { detectDelayInquiry } from "@/lib/email";
import { assignTicket, getTicket, getTicketMessages } from "@/lib/gorgias";
import { faitsCommande } from "@/lib/delais/faits";
import { redigerBrouillon } from "@/lib/delais/brouillon";
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
  if (t.channel !== "email" || t.spam) return;
  const msgs = await getTicketMessages(ticketId);
  const clientes = msgs.filter((m) => m.from_agent === false && m.public !== false);
  const dernier = clientes[clientes.length - 1];
  if (!dernier) return;
  // ce message-là a déjà son brouillon → rien à refaire (Gorgias peut prévenir deux fois)
  const deja = await lire(ticketId);
  if (deja && deja.messageId === Number(dernier.id)) return;

  const equipe = Number((t.assignee_team as Record<string, unknown> | null)?.id ?? 0);
  const chezPhilippe = Number((t.assignee_user as Record<string, unknown> | null)?.id ?? 0) === PHILIPPE && !!deja;
  const texte = [String(t.subject ?? ""), ...clientes.map((m) => String(m.stripped_text ?? m.body_text ?? ""))].join("\n---\n");
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
  const brouillon = await redigerBrouillon({ faits, messageClient, prenom });
  const src = (dernier.source ?? {}) as Record<string, unknown>;
  const to = ((src.to ?? []) as Record<string, unknown>[])[0];
  await enregistrer({
    ticketId, messageId: Number(dernier.id), recuLe: String(dernier.created_datetime ?? new Date().toISOString()),
    client: String(cust.name ?? prenom ?? email), email, sujet: String(t.subject ?? ""), message: messageClient.slice(0, 4000),
    faits, brouillon, depuis: String(to?.address ?? "contact@yourmood.net"), etat: "a_valider",
  });
}
