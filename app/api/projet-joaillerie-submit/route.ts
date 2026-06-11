// Réception publique des demandes de projet joaillerie sur-mesure.
// Stockage partagé Vercel KV (clé par demande + index). Aucune auth (formulaire public client).
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const INDEX = "projetjoa:index";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const prenom = String(body.prenom || "").trim();
  const email = String(body.email || "").trim();
  if (!prenom || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "prénom + email valide requis" }, { status: 400 });
  }
  // garde-fou taille (images en dataURL) : on limite à ~6 images
  if (Array.isArray(body.images) && body.images.length > 8) {
    body.images = (body.images as unknown[]).slice(0, 8);
  }

  try {
    const id = "pj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const record = { ...body, id, date: new Date().toISOString() };
    await kv.set("projetjoa:" + id, record);
    await kv.sadd(INDEX, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
