import { NextResponse } from "next/server";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id || !id.startsWith("design_")) return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({ error: "Storage non configuré" }, { status: 503 });

  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`perso:design:${id}`)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const d = await r.json();
  if (!d.result) return NextResponse.json({ error: "Design introuvable" }, { status: 404 });

  return new Response(d.result, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `inline; filename="${id}.svg"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
