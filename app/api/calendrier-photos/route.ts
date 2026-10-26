// Liste des photos du calendrier 2026 (une fiche par case) — lecture + ajout/retrait d'une photo.
// Quand les deux photos produit (sans et avec base) sont là, le gif est fabriqué ici.
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { CASES, cle, faireGif, jourSuisse, type Photos } from "@/lib/calendrier-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SLOTS = ["sansBase", "avecBase", "portee"] as const;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const tous = await kv.mget<(Photos | null)[]>(...CASES.map((c) => cle(c.n)));
  return NextResponse.json({
    jour: jourSuisse(),
    cases: CASES.map((c, i) => ({ ...c, photos: tous[i] || {} })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const n = Number(b.n);
  if (!(n >= 1 && n <= 24)) return NextResponse.json({ error: "case inconnue" }, { status: 400 });
  const p = ((await kv.get<Photos>(cle(n))) || {}) as Photos;

  if (b.action === "poser" && SLOTS.includes(b.slot) && b.url) p[b.slot as (typeof SLOTS)[number]] = String(b.url);
  else if (b.action === "retirer" && SLOTS.includes(b.slot)) delete p[b.slot as (typeof SLOTS)[number]];
  else if (b.action === "ambiance" && b.url) p.ambiance = [...(p.ambiance || []), String(b.url)];
  else if (b.action === "retirerAmbiance") p.ambiance = (p.ambiance || []).filter((u) => u !== b.url);
  else if (b.action !== "gif") return NextResponse.json({ error: "action inconnue" }, { status: 400 });

  // une photo changée après la mise en ligne → reposée la nuit suivante
  if (p.publie) { delete p.publie; }

  // le gif suit toujours les 2 photos produit
  const de = p.sansBase && p.avecBase ? p.sansBase + "|" + p.avecBase : "";
  if (!de) { delete p.gif; delete p.gifDe; }
  else if (p.gifDe !== de || b.action === "gif") {
    try {
      p.gif = await faireGif(n, p.sansBase!, p.avecBase!);
      p.gifDe = de;
      delete p.erreur;
    } catch (e) {
      p.erreur = "gif : " + String((e as Error).message).slice(0, 150);
    }
  }
  await kv.set(cle(n), p);
  return NextResponse.json({ ok: true, photos: p });
}
