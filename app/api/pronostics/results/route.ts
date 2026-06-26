import { NextRequest, NextResponse } from "next/server";
import { MATCHES, MATCH_IDS } from "@/lib/pronostics/matches";
import {
  hasRedis, redisGet, redisSet, loadSubmissions, loadResults, computeWinners,
  RESULTS_KEY, type Results,
} from "@/lib/pronostics/store";

// GET : état des résultats + gagnantes calculées + total participations
export async function GET() {
  if (!hasRedis()) {
    return NextResponse.json({ error: "stockage non configuré" }, { status: 503 });
  }
  const [submissions, results] = await Promise.all([loadSubmissions(), loadResults()]);
  const winners = computeWinners(submissions, results);
  return NextResponse.json({
    matches: MATCHES,
    results,
    participations: submissions.length,
    winners,
  });
}

// POST : enregistrer (ou corriger) le résultat officiel d'un match
export async function POST(request: NextRequest) {
  if (!hasRedis()) {
    return NextResponse.json({ error: "stockage non configuré" }, { status: 503 });
  }
  let body: { id?: string; a?: number; b?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  }
  const id = String(body.id || "");
  if (!MATCH_IDS.has(id)) {
    return NextResponse.json({ error: "match inconnu" }, { status: 400 });
  }
  const a = Math.max(0, Math.min(20, parseInt(String(body.a), 10)));
  const b = Math.max(0, Math.min(20, parseInt(String(body.b), 10)));
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return NextResponse.json({ error: "score invalide" }, { status: 400 });
  }

  const results = ((await redisGet(RESULTS_KEY)) as Results) || {};
  results[id] = { a, b, ts: new Date().toISOString() };
  const ok = await redisSet(RESULTS_KEY, results);
  if (!ok) return NextResponse.json({ error: "enregistrement impossible" }, { status: 500 });

  const submissions = await loadSubmissions();
  const winners = computeWinners(submissions, results).filter((w) => w.matchId === id);
  return NextResponse.json({ ok: true, id, score: `${a}:${b}`, gagnantes: winners.length });
}
