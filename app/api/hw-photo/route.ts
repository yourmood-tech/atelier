// Sert une photo ajoutée à la main (rangée en base), comme une vraie image.
import { kv } from "@vercel/kv";
export async function GET(request: Request) {
  const id = String(new URL(request.url).searchParams.get("id") || "");
  if (!id) return new Response("", { status: 400 });
  const durl = (await kv.get("hw2026:img:" + id)) as string | null;
  if (!durl) return new Response("", { status: 404 });
  const m = /^data:(.+?);base64,(.*)$/.exec(durl);
  if (!m) return new Response("", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=3600" },
  });
}
