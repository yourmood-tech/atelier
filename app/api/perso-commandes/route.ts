import { NextResponse } from "next/server";
import { auth } from "@/auth";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCmd(...args: string[]) {
  const r = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return r.json();
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({ error: "Redis non configuré" }, { status: 503 });

  // Récupérer toutes les clés perso:cart:* (jusqu'à 500 commandes)
  const keysResp = await redisCmd("KEYS", "perso:cart:*");
  const keys: string[] = keysResp.result || [];
  if (keys.length === 0) return NextResponse.json({ commandes: [] });

  // MGET pour récupérer toutes les valeurs en 1 appel
  const valsResp = await redisCmd("MGET", ...keys);
  const vals: (string | null)[] = valsResp.result || [];

  const commandes = vals.map((v) => {
    if (!v) return null;
    try { return JSON.parse(v); } catch { return null; }
  }).filter(Boolean).sort((a: { date: string }, b: { date: string }) => (b.date || "").localeCompare(a.date || ""));

  return NextResponse.json({ commandes });
}
