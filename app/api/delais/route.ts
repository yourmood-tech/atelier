import { NextRequest, NextResponse } from "next/server";
import { tous, lire, enregistrer, majCarte } from "@/lib/delais/registre";
import { closeTicket, getTicket } from "@/lib/gorgias";
import { traiter, attribueA, PHILIPPE } from "@/lib/delais/traiter";

export const maxDuration = 120;

// GET → les brouillons des tickets au nom de Philippe (le plus ancien d'abord) ; POST { ticketId, action: "ecarter" | "fermer" }
// « ecarter » = Philippe répond lui-même dans Gorgias (ticket laissé ouvert) ; « fermer » = rien à répondre (ex. un merci), ticket clos
export async function GET() {
  const list = await tous();
  // cartes à valider d'avant le 19.10 : on ne sait pas encore à qui est le ticket → vérifié une fois dans Gorgias
  const inconnues = list.filter((b) => b.etat === "a_valider" && b.chezPhilippe === undefined);
  for (let i = 0; i < inconnues.length; i += 4) {
    await Promise.all(inconnues.slice(i, i + 4).map(async (b) => {
      try { b.chezPhilippe = attribueA(await getTicket(b.ticketId)) === PHILIPPE; await majCarte(b); } catch { /* revérifié au prochain affichage */ }
    }));
  }
  const visibles = list.filter((b) => !(b.etat === "a_valider" && b.chezPhilippe === false))
    .sort((a, b) => a.recuLe.localeCompare(b.recuLe));
  return NextResponse.json({ ok: true, brouillons: visibles });
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
