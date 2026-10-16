import { NextRequest, NextResponse } from "next/server";
import { lire, enregistrer, peutFermer } from "@/lib/delais/registre";
import { closeTicket } from "@/lib/gorgias";
import { creerCommandeEchange } from "@/lib/sav";

// POST { ticketId, lignes: [{ lineItemId, taille }] } → commande d'échange de taille à 0 CHF,
// étiquette « ECHANGE-<origine> », note « Echange-<échange> » sur l'origine. Production immédiate.
export async function POST(req: NextRequest) {
  try {
    const { ticketId, lignes } = (await req.json()) as { ticketId?: number; lignes?: { lineItemId: number; taille: string }[] };
    const b = ticketId ? await lire(ticketId) : null;
    if (!b || b.type !== "taille" || !b.taille?.commande) return NextResponse.json({ error: "demande de taille introuvable" }, { status: 404 });
    if (b.echange) return NextResponse.json({ error: `commande d'échange déjà créée : ${b.echange.commande}` }, { status: 409 });
    const l = (lignes ?? []).filter((x) => x.lineItemId && /^\d{2}$/.test(String(x.taille)));
    if (!l.length) return NextResponse.json({ error: "choisis au moins un article et sa nouvelle taille" }, { status: 400 });
    if (l.some((x) => Number(x.taille) % 2 === 1)) return NextResponse.json({ error: "taille impaire impossible" }, { status: 400 });
    const r = await creerCommandeEchange(b.taille.commande, l);
    b.echange = { ...r, creeLe: new Date().toISOString() };
    // réponse déjà partie → la commande d'échange était la dernière condition : on clôt le ticket
    let erreurFermeture: string | null = null;
    if (peutFermer(b) && !b.ticketFerme) {
      try { await closeTicket(b.ticketId); b.ticketFerme = true; } catch (e) { erreurFermeture = e instanceof Error ? e.message : String(e); }
    }
    await enregistrer(b);
    return NextResponse.json({ ok: true, ...r, ferme: !!b.ticketFerme, erreurFermeture });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
