import { NextRequest, NextResponse } from "next/server";
import { tous, lire, enregistrer } from "@/lib/delais/registre";
import { closeTicket } from "@/lib/gorgias";
import { traiter } from "@/lib/delais/traiter";

export const maxDuration = 120;

// GET → tous les brouillons (les plus récents d'abord) ; POST { ticketId, action: "ecarter" | "fermer" }
// « ecarter » = Philippe répond lui-même dans Gorgias (ticket laissé ouvert) ; « fermer » = rien à répondre (ex. un merci), ticket clos
export async function GET() {
  const list = (await tous()).sort((a, b) => b.recuLe.localeCompare(a.recuLe));
  return NextResponse.json({ ok: true, brouillons: list });
}
export async function POST(req: NextRequest) {
  const { ticketId, action } = (await req.json()) as { ticketId?: number; action?: string };
  const b = ticketId ? await lire(ticketId) : null;
  if (!b) return NextResponse.json({ error: "brouillon introuvable" }, { status: 404 });
  // « refaire » : relire la commande (étiquettes, notes de l'équipe…) et réécrire le brouillon encore à valider
  if (action === "refaire") {
    if (b.etat !== "a_valider") return NextResponse.json({ error: "déjà traité" }, { status: 409 });
    await traiter(b.ticketId, true);
    return NextResponse.json({ ok: true });
  }
  if (action !== "ecarter" && action !== "fermer") return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  b.etat = "ecarte";
  let erreurFermeture: string | null = null;
  if (action === "fermer") {
    try { await closeTicket(b.ticketId); b.ticketFerme = true; } catch (e) { erreurFermeture = e instanceof Error ? e.message : String(e); }
  }
  await enregistrer(b);
  return NextResponse.json({ ok: true, ferme: !!b.ticketFerme, erreurFermeture });
}
