import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { estCron } from "@/lib/est-cron";
import { ticketsCompletsDeLaVue, getTicketMessages } from "@/lib/gorgias";
import { heuresOuvrees, estWeekEnd, heureSuisse } from "@/lib/sav/heures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Le veilleur SAV (décision Philippe 10.11.2026) : chaque heure, il regarde l'inbox Gorgias de chaque
// poste SAV (tickets ouverts attribués à la personne) et prévient Philippe sur Slack quand une demande
// cliente attend une réponse depuis plus de 24 heures, sans compter vendredi 17h → lundi 9h.
// Les tickets « rangés » (étiquette SAV-range : pas une demande de cliente) ne comptent pas.
// Chaque attente n'est signalée qu'une fois ; un rappel groupé part le matin à 9h s'il reste du retard.
// Lancement à la main : ?cle=… (SAV_POSTE_CLE), &essai=1 pour voir sans écrire sur Slack.

const POSTES: { nom: string; vue: number }[] = (() => {
  try { const v = JSON.parse(process.env.SAV_VEILLE_POSTES ?? ""); if (Array.isArray(v) && v.length) return v; } catch { /* défaut */ }
  return [{ nom: "Marlène", vue: 2227936 }];   // vue Gorgias privée « Marlene » = son inbox
})();
const LIMITE = 24;
const RANGE = "sav-range";

type Retard = { poste: string; id: number; client: string; sujet: string; heures: number; depuis: string };

async function enRetard(): Promise<{ retards: Retard[]; ouverts: Record<string, number> }> {
  const retards: Retard[] = []; const ouverts: Record<string, number> = {};
  for (const p of POSTES) {
    const tickets = await ticketsCompletsDeLaVue(p.vue);
    ouverts[p.nom] = 0;
    for (const t of tickets) {
      const tags = ((t.tags as { name: string }[]) ?? []).map((x) => x.name.toLowerCase());
      if (tags.includes(RANGE)) continue;
      ouverts[p.nom]++;
      const recu = t.last_received_message_datetime as string | null;
      if (!recu || heuresOuvrees(recu) < LIMITE) continue;
      // une réponse publique de l'équipe après le dernier message de la cliente = pas en retard
      const msgs = await getTicketMessages(Number(t.id));
      const dernierClient = [...msgs].reverse().find((m) => !m.from_agent && m.public !== false);
      const depuis = (dernierClient?.created_datetime as string) ?? recu;
      const repondu = msgs.some((m) => m.from_agent && m.public !== false && m.channel !== "internal-note" && String(m.created_datetime) > depuis);
      if (repondu) continue;
      const h = heuresOuvrees(depuis);
      if (h < LIMITE) continue;
      const c = (t.customer as Record<string, unknown>) ?? {};
      retards.push({ poste: p.nom, id: Number(t.id), client: String(c.name || c.email || "cliente"), sujet: String(t.subject || "(sans sujet)").slice(0, 70), heures: Math.round(h), depuis });
    }
  }
  retards.sort((a, b) => b.heures - a.heures);
  return { retards, ouverts };
}

const lien = (id: number) => `https://yourmood.gorgias.com/app/ticket/${id}`;
const ligne = (r: Retard) => `• <${lien(r.id)}|${r.client} — ${r.sujet}> : ${r.heures} h (inbox de ${r.poste})`;

async function slack(texte: string): Promise<boolean> {
  const url = process.env.SLACK_SAV_WEBHOOK;
  if (!url) return false;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: texte }) });
  return res.ok;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const cle = process.env.SAV_POSTE_CLE;
  if (!estCron(req) && !(cle && p.get("cle") === cle)) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  const essai = p.get("essai") === "1";
  try {
    const { retards, ouverts } = await enRetard();
    const maintenant = new Date();
    const silence = estWeekEnd(maintenant) || heureSuisse(maintenant) < 8 || heureSuisse(maintenant) >= 19;
    let envoye = false, raison = "";
    if (essai) raison = "essai : rien envoyé";
    else if (silence) raison = "hors des heures de travail : rien envoyé";
    else if (!process.env.SLACK_SAV_WEBHOOK) raison = "adresse Slack du veilleur pas encore posée";
    else {
      const nouveaux: Retard[] = [];
      for (const r of retards) if (!(await kv.get(`sav:alerte:${r.id}:${r.depuis}`))) nouveaux.push(r);
      const rappel = heureSuisse(maintenant) === 9 && retards.length > 0 && !(await kv.get(`sav:rappel:${maintenant.toISOString().slice(0, 10)}`));
      if (rappel) {
        envoye = await slack(`☀️ SAV — ${retards.length} demande${retards.length > 1 ? "s" : ""} en retard (plus de 24 h sans réponse) :\n${retards.map(ligne).join("\n")}`);
        if (envoye) await kv.set(`sav:rappel:${maintenant.toISOString().slice(0, 10)}`, 1, { ex: 86400 * 2 });
      } else if (nouveaux.length) {
        envoye = await slack(`⏰ SAV — ${nouveaux.length > 1 ? `${nouveaux.length} demandes passent` : "une demande passe"} les 24 h sans réponse :\n${nouveaux.map(ligne).join("\n")}`);
      }
      if (envoye) for (const r of retards) await kv.set(`sav:alerte:${r.id}:${r.depuis}`, 1, { ex: 86400 * 30 });
      raison = envoye ? "envoyé" : "rien de nouveau";
    }
    return NextResponse.json({ ok: true, ouverts, retards, envoye, raison });
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
