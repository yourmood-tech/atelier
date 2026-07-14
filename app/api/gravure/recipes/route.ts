// Recettes de fabrication partagées (visibles par toute l'équipe atelier).
// Lecture/écriture dans Vercel KV, clé = chemin du fichier de gravure.
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";

const INDEX = "grv:index";
const keyOf = (id: string) => "grv:" + id;

type Recipe = { text: string; by: string; at: string };

// GET → toutes les recettes { id: {text, by, at} }
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  try {
    const ids = (await kv.smembers(INDEX)) as string[] | null;
    if (!ids || ids.length === 0) return NextResponse.json({ recipes: {} });
    const vals = (await kv.mget(...ids.map(keyOf))) as (Recipe | null)[];
    const recipes: Record<string, Recipe> = {};
    ids.forEach((id, i) => { if (vals[i]) recipes[id] = vals[i] as Recipe; });
    return NextResponse.json({ recipes });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}

// POST { id, text } → enregistre (ou supprime si texte vide) une recette
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  let body: { id?: string; text?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const id = (body.id || "").trim();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const text = (body.text || "").trim();
  try {
    if (!text) {
      await kv.del(keyOf(id));
      await kv.srem(INDEX, id);
      return NextResponse.json({ ok: true, deleted: true });
    }
    const rec: Recipe = { text, by: session.user?.email || "", at: new Date().toISOString() };
    await kv.set(keyOf(id), rec);
    await kv.sadd(INDEX, id);
    return NextResponse.json({ ok: true, recipe: rec });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
