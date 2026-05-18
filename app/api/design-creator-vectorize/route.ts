import { NextResponse } from "next/server";
// @ts-expect-error — pas de types pour potrace, on type le callback à la main
import potrace from "potrace";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { image?: string; threshold?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { image, threshold } = body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante ou invalide" }, { status: 400 });
  }

  const m = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Format image invalide" }, { status: 400 });
  const buffer = Buffer.from(m[2], "base64");

  try {
    const svg = await new Promise<string>((resolve, reject) => {
      potrace.trace(
        buffer,
        {
          threshold: typeof threshold === "number" ? threshold : 180,
          color: "#000000",
          background: "transparent",
          turdSize: 4,
          alphaMax: 1,
          optTolerance: 0.4,
        },
        (err: Error | null, svgString: string) => {
          if (err) reject(err);
          else resolve(svgString);
        }
      );
    });
    return NextResponse.json({ svg });
  } catch (e) {
    return NextResponse.json({ error: `Potrace : ${String((e as Error)?.message || e)}` }, { status: 502 });
  }
}
