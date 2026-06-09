// Stockage partagé des modifications de moodboards (notes, univers, couleurs, images).
// Toutes les vendeuses lisent/écrivent le même contenu via Vercel KV.
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";

const INDEX = "mb:index";
const keyOf = (email: string) => "mb:" + email.toLowerCase();

// GET → renvoie toutes les modifications existantes { email: {notes, themes, palette, images} }
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  try {
    const emails = (await kv.smembers(INDEX)) as string[] | null;
    if (!emails || emails.length === 0) return NextResponse.json({ edits: {} });
    const keys = emails.map(keyOf);
    const vals = (await kv.mget(...keys)) as (Record<string, unknown> | null)[];
    const edits: Record<string, unknown> = {};
    emails.forEach((e, i) => { if (vals[i]) edits[e.toLowerCase()] = vals[i]; });
    return NextResponse.json({ edits });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}

// POST { email, edit } → sauvegarde la fiche d'une cliente (partagé pour tous)
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  let body: { email?: string; edit?: Record<string, unknown> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const email = (body.email || "").toLowerCase().trim();
  if (!email || !body.edit) return NextResponse.json({ error: "email + edit requis" }, { status: 400 });
  try {
    const edit = { ...body.edit, _by: session.user?.email || "", _at: new Date().toISOString() };
    await kv.set(keyOf(email), edit);
    await kv.sadd(INDEX, email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
