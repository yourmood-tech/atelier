import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante côté serveur" }, { status: 500 });
  }

  let body: { image?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { image } = body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante ou invalide" }, { status: 400 });
  }

  const m = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Format image invalide" }, { status: 400 });
  const mimeType = m[1];
  const data = m[2];

  const prompt = `Transform this 3D photo of a ring into a FLAT UNROLLED TECHNICAL VIEW for an engraver / stone-setter.

OUTPUT REQUIRED:
- A long horizontal rectangular strip on a pure white background.
- The strip represents the ring's outer surface UNROLLED COMPLETELY FLAT (as if the ring was cut and laid open).
- No 3D perspective whatsoever. No depth. No shadows. No curved edges. No reflections. Perfectly orthographic top-down view of the unrolled band.
- The strip should fill the entire horizontal width of the canvas (do NOT leave large white space on the left or right edges).
- Aspect ratio of the strip itself : very long horizontal rectangle (approximately 6:1 to 8:1).

🚨 CRITICAL — PATTERN COMPLETION AND REPETITION 🚨
- The source image typically shows only ONE FACE of the ring — a partial view of the decorative motif visible on the front.
- You MUST imagine the full continuation of the motif around the entire ring. The motif is typically REPEATED IDENTICALLY all around the circumference.
- In the output strip, REPEAT THE EXACT SAME MOTIF AT LEAST 2 TO 3 TIMES end-to-end, continuously, with NO visible seam between repetitions.
- The strip must look like a complete unrolled band — no truncation, no empty zones, the motif covers the full length seamlessly.

CONTENT OF THE STRIP:
- Show ONLY the engraving / decorative pattern from the ring as crisp black ink lines on the metal surface.
- Keep the metal color and finish visible exactly as in the source (rose gold, white gold, silver, etc.).
- If the source shows gemstones or diamonds set into the ring : ERASE THEM ALL. Remove every stone, every diamond, every gemstone setting. The setter will add stones afterwards from a separate spec sheet.
- Output the engraving alone on the bare metal surface.

LIGHTING / STYLE:
- Even, uniform soft lighting across the entire strip. No highlights. No glints. No reflections.
- Like a flat technical drawing or a brand reference template for stone setters.
- Do NOT add any text, watermarks, dimensions, labels, or annotations.

Output as a 21:9 ultrawide image with the rectangular strip filling the canvas horizontally, minimal white space above and below.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType, data } },
          { text: prompt },
        ] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "21:9", imageSize: "2K" },
        },
      }),
    });
    const respText = await r.text();
    let respData: { candidates?: Array<{ content?: { parts?: unknown[] }; finishReason?: string }>; promptFeedback?: { blockReason?: string }; error?: { message?: string } };
    try { respData = JSON.parse(respText); }
    catch { return NextResponse.json({ error: `Gemini non-JSON (HTTP ${r.status}) : ${respText.slice(0, 200)}` }, { status: 502 }); }

    if (!r.ok) {
      return NextResponse.json({ error: `Gemini ${r.status} : ${respData?.error?.message || ""}` }, { status: 502 });
    }
    const candidate = respData?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      return NextResponse.json({ error: `Gemini a refusé (finishReason : ${candidate.finishReason}).` }, { status: 502 });
    }
    if (respData?.promptFeedback?.blockReason) {
      return NextResponse.json({ error: `Bloqué par les filtres (${respData.promptFeedback.blockReason})` }, { status: 502 });
    }
    const partsOut = (candidate?.content?.parts || []) as Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
    const imagePart = partsOut.find(p => p.inlineData?.mimeType?.startsWith?.("image/"));
    if (!imagePart?.inlineData?.data) {
      const textPart = partsOut.find(p => p.text);
      return NextResponse.json({ error: textPart?.text ? `Gemini a répondu par texte : « ${textPart.text.slice(0, 150)} »` : "Pas d'image en sortie" }, { status: 502 });
    }
    return NextResponse.json({ image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
