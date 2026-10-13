import { NextRequest, NextResponse } from "next/server";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "refonte:2026:etats";

async function redis(path: string, raw?: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/${path}`, {
    method: raw === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "text/plain" },
    body: raw,
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

export async function GET() {
  const j = await redis(`get/${encodeURIComponent(KEY)}`);
  let etats: Record<string, string[]> = {};
  try {
    let v = j?.result;
    if (typeof v === "string") v = JSON.parse(v);
    if (Array.isArray(v)) v = typeof v[0] === "string" ? JSON.parse(v[0]) : v[0];
    if (v && typeof v === "object") etats = v as Record<string, string[]>;
  } catch { etats = {}; }
  return NextResponse.json({ etats }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let body: { etats?: Record<string, string[]> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "requête invalide" }, { status: 400 }); }
  const etats = body.etats || {};
  const ok = await redis(`set/${encodeURIComponent(KEY)}`, JSON.stringify(etats));
  if (!ok) return NextResponse.json({ error: "stockage indisponible" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
