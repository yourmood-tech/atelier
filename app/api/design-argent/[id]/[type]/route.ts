import { NextResponse } from "next/server";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const TYPES_OK = new Set(["complet", "gravure", "plan"]);

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await ctx.params;
  if (!id || !id.startsWith("argent_")) return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  if (!TYPES_OK.has(type)) return NextResponse.json({ error: "Type invalide (attendu: complet | gravure | plan)" }, { status: 400 });
  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({ error: "Storage non configuré" }, { status: 503 });

  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`perso:argent:design:${id}:${type}`)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const d = await r.json();
  if (!d.result) return NextResponse.json({ error: "Design introuvable" }, { status: 404 });

  return new Response(d.result, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `inline; filename="${id}-${type}.svg"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
