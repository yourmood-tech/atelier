import { NextResponse } from "next/server";

// « Envoyer à mood » depuis la liste de cadeaux du catalogue de Noël :
// la liste arrive dans la boîte du service client (Gorgias), comme un e-mail
// envoyé par la cliente à contact@yourmood.net.

export const dynamic = "force-dynamic";

const DOMAIN = process.env.GORGIAS_DOMAIN ?? "yourmood";
const API_EMAIL = process.env.GORGIAS_API_EMAIL || "";
const API_KEY = process.env.GORGIAS_API_KEY || "";
const CONTACT = "contact@yourmood.net";

type Ligne = { t: string; p: number; u: string };

const esc = (t: string) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const chf = (n: number) => "CHF " + (Math.round(n * 100) % 100 === 0 ? Math.round(n) + ".-" : n.toFixed(2));

export async function POST(request: Request) {
  if (!API_EMAIL || !API_KEY) return NextResponse.json({ error: "service client indisponible" }, { status: 503 });
  let body: { email?: string; voeu?: string; items?: Ligne[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "demande illisible" }, { status: 400 }); }

  const email = String(body.email || "").trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "adresse e-mail invalide" }, { status: 400 });
  const voeu = String(body.voeu || "").trim().slice(0, 300);
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 40)
    .map((x) => ({ t: String(x.t || "").slice(0, 200), p: Number(x.p) || 0, u: /^https:\/\/(www\.yourmood\.net|moodjoaillerie\.net)\//.test(String(x.u)) ? String(x.u) : "" }))
    .filter((x) => x.t);
  if (!items.length && !voeu) return NextResponse.json({ error: "liste vide" }, { status: 400 });

  const total = items.reduce((s, x) => s + x.p, 0);
  const sujet = `🎁 Liste de cadeaux de Noël (catalogue) — ${email}`;
  const texte = [
    `Liste de cadeaux envoyée depuis le catalogue de Noël mood.`,
    `Adresse e-mail de la cliente : ${email}`,
    voeu ? `\nSon vœu pour Noël : « ${voeu} »` : "",
    items.length ? `\nSes bijoux (${items.length}) :` : "",
    ...items.map((x) => `• ${x.t} — ${chf(x.p)}${x.u ? "\n  " + x.u : ""}`),
    items.length ? `\nTotal indicatif : ${chf(total)}` : "",
  ].filter(Boolean).join("\n");
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#2b2622;max-width:560px">
    <p style="font-size:16px;margin:0 0 6px">🎁 <b>Liste de cadeaux de Noël</b> — envoyée depuis le catalogue</p>
    <p style="margin:0 0 14px;color:#555">Adresse e-mail de la cliente : <a href="mailto:${esc(email)}">${esc(email)}</a></p>
    ${voeu ? `<p style="margin:0 0 14px;padding:10px 14px;background:#f3eee4;border-radius:8px;font-size:15px">Son vœu pour Noël : « ${esc(voeu)} »</p>` : ""}
    ${items.length ? `<table style="border-collapse:collapse;width:100%">${items.map((x) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${x.u ? `<a href="${esc(x.u)}" style="color:#2b2622">${esc(x.t)}</a>` : esc(x.t)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;color:#9A7024;white-space:nowrap">${chf(x.p)}</td></tr>`).join("")}
      <tr><td style="padding:8px 0"><b>Total indicatif</b></td><td style="padding:8px 0;text-align:right"><b>${chf(total)}</b></td></tr></table>` : ""}
  </div>`;

  const domain = DOMAIN.includes(".") ? DOMAIN : `${DOMAIN}.gorgias.com`;
  const r = await fetch(`https://${domain}/api/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${API_EMAIL}:${API_KEY}`).toString("base64")}`,
      "Content-Type": "application/json",
      "User-Agent": "curl/8.7.1", // Gorgias est derrière Cloudflare : signature d'outil connue
    },
    body: JSON.stringify({
      channel: "email",
      via: "api",
      from_agent: false,
      customer: { email },
      subject: sujet,
      tags: [{ name: "catalogue-noel" }],
      messages: [{
        channel: "email",
        via: "api",
        from_agent: false,
        sender: { email },
        source: { type: "email", from: { address: email }, to: [{ address: CONTACT, name: "mood" }] },
        subject: sujet,
        body_text: texte,
        body_html: html,
      }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return NextResponse.json({ error: "envoi refusé", detail: t.slice(0, 200) }, { status: 502 });
  }
  const j = await r.json().catch(() => ({}));
  return NextResponse.json({ ok: true, ticket: (j as { id?: number }).id || null });
}
