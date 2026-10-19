import { NextRequest, NextResponse, after } from "next/server";
import { traiter } from "@/lib/delais/traiter";

export const maxDuration = 120;

// Assistant des délais (16.10.2026) — chaque nouveau message cliente, ticket rangé ou attribué :
//  1. le ticket est-il au nom de Philippe ? sinon sa carte est masquée (depuis le 19.10 l'outil
//     ne s'attribue plus rien lui-même) ; puis : est-ce une demande de délai ou de taille ?
//  2. si oui : un brouillon est préparé à partir des seuls faits Shopify (commande, envois,
//     étiquettes d'atelier) ;
//  3. le brouillon attend la validation de Philippe sur la page /delais (rien n'est envoyé seul).

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch { return NextResponse.json({ ok: true, skipped: "corps illisible" }); }
  // Gorgias envoie seulement { ticket_id } (formulaire de l'intégration « Vercel (Claude) ») ;
  // l'ancienne forme { event: { data: { ticket, message } } } reste acceptée.
  const ev = (body?.event as Record<string, unknown>) ?? {};
  const data = (ev.data as Record<string, unknown>) ?? {};
  const message = data.message as Record<string, unknown> | undefined;
  const ticketId = Number(body.ticket_id ?? (data.ticket as Record<string, unknown> | undefined)?.id ?? 0);
  if (!ticketId) return NextResponse.json({ ok: true, skipped: "pas de ticket" });
  if (message?.from_agent === true) return NextResponse.json({ ok: true, skipped: "message de l'équipe" });
  // Gorgias attend une réponse rapide : le travail se fait juste après
  after(async () => { try { await traiter(ticketId); } catch (e) { console.error("[délais] ticket", ticketId, e); } });
  return NextResponse.json({ ok: true });
}
