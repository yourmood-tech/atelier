import { NextRequest, NextResponse } from "next/server";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "refonte:2026:etats";

async function redis(path: string, body?: unknown) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

export async function GET() {
  const j = await redis(`get/${encodeURIComponent(KEY)}`);
  let etats = {};
  try { etats = j?.result ? JSON.parse(j.result) : {}; } catch { etats = {}; }
  return NextResponse.json({ etats }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let body: { etats?: Record<string, string[]> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "requête invalide" }, { status: 400 }); }
  const etats = body.etats || {};
  const ok = await redis(`set/${encodeURIComponent(KEY)}`, [JSON.stringify(etats)]);
  if (!ok) return NextResponse.json({ error: "stockage indisponible" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
