import { NextResponse } from "next/server";
import { incrementGeminiImageCount } from "@/lib/gemini-counter";

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

  const prompt = `TASK : Convert the attached ring photo into a PURE LINE ART illustration of the engraving motif visible on the ring.

🎯 OUTPUT : a square image, PURE WHITE background (#FFFFFF), with the engraving motif drawn as CRISP FINE BLACK INK LINES — nothing else.

═══════════════════════════════════════════
🚫 ABSOLUTE BAN LIST 🚫
═══════════════════════════════════════════

- ❌ NO ring shape. NO band. NO 3D object of any kind.
- ❌ NO perspective, NO depth, NO shadows, NO reflections, NO gradients.
- ❌ NO gray tones whatsoever — ONLY pure black (#000000) and pure white (#FFFFFF). 1-bit only.
- ❌ NO diamonds, gemstones, stones, sparkles, settings, bezels, prongs, holes.
- ❌ NO text, labels, frames, borders, watermarks.
- ❌ NO inventing a motif not present on the ring.

═══════════════════════════════════════════
✅ OUTPUT STYLE
═══════════════════════════════════════════

Like a TATTOO FLASH SHEET or a COLORING BOOK page : flat, pure 2D line drawing with sharp black ink lines on a pure white page. Hand-drawn pen-and-ink illustration style.

Reproduce the engraving motif as faithfully as possible from the reference photo. If the ring shows sunflowers → draw sunflowers in pure line art. If it shows geometric patterns → draw the geometric patterns in pure line art. Keep the original shape and arrangement.

The output must be ready for digital vectorization : sharp edges, no anti-aliasing artifacts in mid-gray, no soft transitions.

Output canvas : 1:1 square. Pure 1-bit black on pure white.`;

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
          imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
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
    await incrementGeminiImageCount();
    return NextResponse.json({ image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
