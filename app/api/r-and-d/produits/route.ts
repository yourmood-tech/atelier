import { NextResponse } from "next/server";

/**
 * Persistance des produits R&D Pipeline via Upstash Redis (REST API).
 *
 * Setup côté Vercel :
 *   Storage → Create Database → Marketplace → Upstash for Redis → Free tier
 *   → Connect to project (katana-scanner-mvp)
 *
 * Vercel injecte automatiquement :
 *   - UPSTASH_REDIS_REST_URL
 *   - UPSTASH_REDIS_REST_TOKEN
 *
 * Si non configuré, l'API renvoie 503 et le frontend reste sur localStorage.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "r-and-d:produits:amila";

async function redisFetch(path: string, body?: unknown) {
  const url = `${REDIS_URL}${path}`;
  const r = await fetch(url, {
    method: body !== undefined ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Redis ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function GET() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return NextResponse.json(
      {
        error: "persistance cloud non configurée",
        hint: "Active Upstash Redis dans Vercel Storage (3 clics) puis redéploie. En attendant l'app reste sur localStorage.",
      },
      { status: 503 }
    );
  }
  try {
    const r = await redisFetch(`/get/${encodeURIComponent(KEY)}`);
    const raw = r?.result;
    if (!raw) return NextResponse.json({ produits: [] });
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "erreur lecture", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return NextResponse.json(
      {
        error: "persistance cloud non configurée",
        hint: "Active Upstash Redis dans Vercel Storage puis redéploie.",
      },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.produits)) {
      return NextResponse.json({ error: "body doit contenir { produits: [] }" }, { status: 400 });
    }
    // Upstash REST : SET key value
    const valueStr = JSON.stringify(body);
    await redisFetch(`/set/${encodeURIComponent(KEY)}`, [valueStr]);
    return NextResponse.json({ ok: true, count: body.produits.length });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur écriture", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
