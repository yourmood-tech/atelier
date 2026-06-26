import { MATCHES } from "./matches";

// Brique de stockage partagée du jeu-concours (Upstash Redis).
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const SUBMISSIONS_KEY = "pronostics:2026:submissions";
export const RESULTS_KEY = "pronostics:2026:results";
export const SENT_KEY = "pronostics:2026:sent";
export const PRICERULE_KEY = "pronostics:2026:pricerule";

export interface Prono { id: string; jour: string; teamA: string; teamB: string; a: number; b: number }
export interface Submission { ts: string; email: string; team: string; pronostics: Prono[] }
export interface Result { a: number; b: number; ts: string }
export type Results = Record<string, Result>;
export interface Winner { email: string; team: string; matchId: string; match: string; score: string }

export function hasRedis(): boolean {
  return !!(REDIS_URL && REDIS_TOKEN);
}

export async function redisGet(key: string): Promise<unknown> {
  if (!hasRedis()) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  return typeof j?.result === "string" ? JSON.parse(j.result) : j?.result;
}

export async function redisSet(key: string, value: unknown): Promise<boolean> {
  if (!hasRedis()) return false;
  const r = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([JSON.stringify(value)]),
  });
  return r.ok;
}

export async function redisRpush(key: string, value: string): Promise<boolean> {
  if (!hasRedis()) return false;
  const r = await fetch(`${REDIS_URL}/rpush/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([value]),
  });
  return r.ok;
}

export async function redisLrange(key: string): Promise<string[]> {
  if (!hasRedis()) return [];
  const r = await fetch(`${REDIS_URL}/lrange/${encodeURIComponent(key)}/0/-1`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j?.result) ? j.result : [];
}

export async function loadSubmissions(): Promise<Submission[]> {
  const raw = await redisLrange(SUBMISSIONS_KEY);
  const out: Submission[] = [];
  for (const s of raw) {
    try { out.push(JSON.parse(s)); } catch { /* ligne corrompue ignorée */ }
  }
  return out;
}

export async function loadResults(): Promise<Results> {
  return ((await redisGet(RESULTS_KEY)) as Results) || {};
}

// Une gagnante = un score EXACT sur un match dont le résultat est connu.
// On garde la DERNIÈRE participation de chaque email (anti-double-comptage).
export function computeWinners(submissions: Submission[], results: Results): Winner[] {
  const latest = new Map<string, Submission>();
  for (const s of submissions) latest.set(s.email, s);

  const winners: Winner[] = [];
  for (const s of latest.values()) {
    for (const p of s.pronostics || []) {
      const res = results[p.id];
      if (!res) continue;
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

// Clé unique d'un bon = email + match (un bon par match gagné, jamais deux fois)
export function bonKey(email: string, matchId: string): string {
  return `${email}::${matchId}`;
}
