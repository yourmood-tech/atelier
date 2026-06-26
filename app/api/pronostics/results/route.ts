import { NextRequest, NextResponse } from "next/server";
import { MATCHES, MATCH_IDS } from "@/lib/pronostics/matches";

// Stockage Upstash Redis (même brique que la collecte).
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const SUBMISSIONS_KEY = "pronostics:2026:submissions";
const RESULTS_KEY = "pronostics:2026:results";

interface Prono { id: string; jour: string; teamA: string; teamB: string; a: number; b: number }
interface Submission { ts: string; email: string; team: string; pronostics: Prono[] }
interface Result { a: number; b: number; ts: string }
type Results = Record<string, Result>;

async function redisGet(key: string): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  return typeof j?.result === "string" ? JSON.parse(j.result) : j?.result;
}

async function redisSet(key: string, value: unknown): Promise<boolean> {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  const r = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([JSON.stringify(value)]),
  });
  return r.ok;
}

async function redisLrange(key: string): Promise<string[]> {
  if (!REDIS_URL || !REDIS_TOKEN) return [];
  const r = await fetch(`${REDIS_URL}/lrange/${encodeURIComponent(key)}/0/-1`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j?.result) ? j.result : [];
}

// Cœur du jeu : une gagnante = un score EXACT sur un match dont le résultat est connu.
// Une participante peut gagner plusieurs bons (un par match exact). On dédoublonne
// par (email + match) en gardant la dernière participation de chaque email.
export function computeWinners(submissions: Submission[], results: Results) {
  // Dernière participation par email (si quelqu'un a rejoué)
  const latest = new Map<string, Submission>();
  for (const s of submissions) latest.set(s.email, s);

  const winners: Array<{ email: string; team: string; matchId: string; match: string; score: string }> = [];
  for (const s of latest.values()) {
    for (const p of s.pronostics || []) {
      const res = results[p.id];
      if (!res) continue; // résultat pas encore connu
      if (Number(p.a) === Number(res.a) && Number(p.b) === Number(res.b)) {
        const m = MATCHES.find((x) => x.id === p.id);
        winners.push({
          email: s.email,
          team: s.team,
          matchId: p.id,
          match: m ? `${m.teamA} – ${m.teamB}` : p.id,
          score: `${res.a}:${res.b}`,
        });
      }
    }
  }
  return winners;
}

async function loadAll() {
  const raw = await redisLrange(SUBMISSIONS_KEY);
  const submissions: Submission[] = [];
  for (const s of raw) {
    try { submissions.push(JSON.parse(s)); } catch { /* ligne corrompue ignorée */ }
  }
  const results = ((await redisGet(RESULTS_KEY)) as Results) || {};
  return { submissions, results };
}

// GET : état des résultats + gagnantes calculées + total participations
export async function GET() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return NextResponse.json({ error: "stockage non configuré" }, { status: 503 });
  }
  const { submissions, results } = await loadAll();
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
  if (!REDIS_URL || !REDIS_TOKEN) {
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

  const { submissions } = await loadAll();
  const winners = computeWinners(submissions, results).filter((w) => w.matchId === id);
  return NextResponse.json({ ok: true, id, score: `${a}:${b}`, gagnantes: winners.length });
}
