import { NextRequest, NextResponse } from "next/server";
import { lire, enregistrer, peutFermer } from "@/lib/delais/registre";
import { sendEmailReply, closeTicket } from "@/lib/gorgias";

const PHILIPPE = 15486626;

// POST { ticketId, texte } → envoie la réponse à la cliente (au nom de Philippe, depuis l'adresse
// du support), ferme le ticket (il se rouvre tout seul si la cliente répond), note si retouché.
export async function POST(req: NextRequest) {
  try {
    const { ticketId, texte } = (await req.json()) as { ticketId?: number; texte?: string };
    const b = ticketId ? await lire(ticketId) : null;
    if (!b) return NextResponse.json({ error: "brouillon introuvable" }, { status: 404 });
    if (b.etat === "envoye") return NextResponse.json({ error: "déjà envoyé" }, { status: 409 });
    const t = (texte ?? "").trim();
    if (!t) return NextResponse.json({ error: "texte vide" }, { status: 400 });
    if (t.includes("[DATE À COMPLÉTER]")) return NextResponse.json({ error: "il reste « [DATE À COMPLÉTER] » dans le texte" }, { status: 400 });
    await sendEmailReply({
      ticketId: b.ticketId, agentId: PHILIPPE, fromAddress: b.depuis || "contact@yourmood.net", fromName: "Support mood collection",
      // WhatsApp : on écrit à l'adresse-relais de la conversation, le relais l'envoie sur son téléphone
      toAddress: b.canal === "whatsapp" && b.adresseReponse ? b.adresseReponse : b.email, toName: b.client, subject: b.sujet ? (b.sujet.match(/^(re:|votre commande)/i) ? b.sujet : `Re: ${b.sujet}`) : "Votre commande", text: t,
    });
    b.etat = "envoye"; b.envoyeLe = new Date().toISOString(); b.texteEnvoye = t;
    b.retouche = t.replace(/\s+/g, " ") !== b.brouillon.trim().replace(/\s+/g, " ");
    let ferme = false, erreurFermeture: string | null = null;
    if (peutFermer(b)) {
      try { await closeTicket(b.ticketId); ferme = true; } catch (e) { erreurFermeture = e instanceof Error ? e.message : String(e); }
    }
    b.ticketFerme = ferme;
    await enregistrer(b);
    return NextResponse.json({ ok: true, ferme, attendEchange: b.type === "taille" && !!b.taille?.partie && !b.echange, erreurFermeture });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
