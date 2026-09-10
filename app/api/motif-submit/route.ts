// Réception publique des demandes de motif (configurateur « Créez votre bague en pierres »).
// Stockage partagé Vercel KV (clé par demande + index) + alerte e-mail à Amila.
// Aucune auth (formulaire public cliente) — même schéma que projet-joaillerie-submit.
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const INDEX = "motif:index";
const ALERTE_A = "amila@yourmood.net";

type Pierre = { key?: string; label?: string; couleur?: string; nombre?: number };

async function alerteEmail(record: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const pierres = (Array.isArray(record.pierres) ? record.pierres : []) as Pierre[];
  const lignes = pierres.length
    ? pierres
        .map(
          (p) =>
            `<tr><td style="padding:4px 10px 4px 0"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.couleur || "#ccc"};vertical-align:middle"></span></td>` +
            `<td style="padding:4px 0"><strong>${p.nombre ?? 0}</strong> × ${p.label ?? p.key ?? "?"}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:4px 0">Toutes en diamant blanc</td></tr>`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;color:#111">
      <h2 style="margin-bottom:4px">💎 Nouvelle demande de motif</h2>
      <p style="color:#555;margin-top:0">${record.prenom} ${record.nom} — <a href="mailto:${record.email}">${record.email}</a></p>
      <table style="border-collapse:collapse;width:100%;margin-top:14px">
        <tr><td style="padding:6px 0;color:#555;width:130px">Taille</td><td><strong>${record.taille}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#555">Configuration</td><td>${record.config}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Diamants</td><td>${record.rangees} rangées × ${record.parTour} = <strong>${record.total}</strong></td></tr>
      </table>
      <p style="margin:16px 0 6px;color:#555">Pierre par pierre :</p>
      <table style="border-collapse:collapse">${lignes}</table>
      <p style="margin-top:20px"><a href="https://mood-tools.yourmood.net/motif/admin" style="color:#b28a3c">Voir le motif dessiné dans l'atelier →</a></p>
    </div>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "atelier@yourmood.net",
        to: ALERTE_A,
        subject: `💎 Demande de motif — ${record.prenom} ${record.nom} · taille ${record.taille} · ${record.total} diamants`,
        html,
      }),
    });
  } catch {
    /* l'alerte ne doit jamais faire échouer l'enregistrement de la demande */
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const prenom = String(body.prenom || "").trim();
  const nom = String(body.nom || "").trim();
  const email = String(body.email || "").trim();
  if (!prenom || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "prénom + email valide requis" }, { status: 400 });
  }

  // garde-fou taille : le motif est 1 lettre par diamant (max 8 rangées × ~72 = 576)
  const motif = String(body.motif || "").slice(0, 2000);

  try {
    const id = "mo_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const record = { ...body, prenom, nom, email, motif, id, date: new Date().toISOString() };
    await kv.set("motif:" + id, record);
    await kv.sadd(INDEX, id);
    await alerteEmail(record);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
