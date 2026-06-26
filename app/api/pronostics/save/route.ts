import { NextRequest, NextResponse } from "next/server";

// Stockage = Upstash Redis (même brique que l'outil R&D). Chaque participation
// est ajoutée à une liste ; le calcul des gagnantes lira cette liste plus tard.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const LIST_KEY = "pronostics:2026:submissions";

interface Prono { id: string; jour: string; teamA: string; teamB: string; a: number; b: number }

async function rpush(key: string, value: string): Promise<boolean> {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  const r = await fetch(`${REDIS_URL}/rpush/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([value]),
  });
  return r.ok;
}

export async function POST(request: NextRequest) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return NextResponse.json({ error: "stockage non configuré" }, { status: 503 });
  }

  let body: { email?: string; team?: string; pronostics?: Prono[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const team = (body.team || "").trim();
  const pronostics = Array.isArray(body.pronostics) ? body.pronostics : [];

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "email invalide" }, { status: 400 });
  }
  if (!team) {
    return NextResponse.json({ error: "équipe manquante" }, { status: 400 });
  }
  if (pronostics.length === 0) {
    return NextResponse.json({ error: "aucun pronostic" }, { status: 400 });
  }

  // Nettoyage : on ne garde que des scores entiers 0–20, et les champs attendus.
  const clean = pronostics
    .filter((p) => p && typeof p.id === "string")
    .map((p) => ({
      id: p.id,
      jour: String(p.jour || ""),
      teamA: String(p.teamA || ""),
      teamB: String(p.teamB || ""),
      a: Math.max(0, Math.min(20, parseInt(String(p.a), 10) || 0)),
      b: Math.max(0, Math.min(20, parseInt(String(p.b), 10) || 0)),
    }));

  const submission = {
    ts: new Date().toISOString(),
    email,
    team,
    pronostics: clean,
  };

  const ok = await rpush(LIST_KEY, JSON.stringify(submission));
  if (!ok) {
    return NextResponse.json({ error: "enregistrement impossible" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: clean.length });
}
