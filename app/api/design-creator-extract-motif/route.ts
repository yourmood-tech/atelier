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

  const prompt = `TASK : Extract ONE UNIT of the decorative motif from the attached ring reference (a sketch or a 3D render) and redraw it as PURE LINE ART, ready to be tiled horizontally to recreate the full unrolled band.

🎯 OUTPUT : a square image, pure white background (#FFFFFF), with ONE UNIT of the engraving motif drawn centered, as crisp fine BLACK INK LINES.

═══════════════════════════════════════════
WHAT IS "ONE UNIT" ?
═══════════════════════════════════════════

The reference ring shows a decorative pattern that repeats around its circumference. You must identify and extract ONE SINGLE REPETITION UNIT of that pattern.

Examples :
- If the ring shows 8 identical sunflowers around it → ONE UNIT = ONE SUNFLOWER (with the small surrounding ornaments around it, if any).
- If the ring shows a repeating leaf-and-vine motif → ONE UNIT = ONE LEAF with the vine segment between it and the next leaf.
- If the ring shows a 2-element alternating pattern (flower → star → flower → star) → ONE UNIT = the FLOWER + STAR pair.

The unit you extract will be tiled horizontally by software afterwards to reconstruct the full unrolled band. So pick the smallest meaningful repeating block.

═══════════════════════════════════════════
🚫 ABSOLUTE BAN LIST 🚫
═══════════════════════════════════════════

- ❌ NO ring. NO band. NO metal surface. NO 3D shape.
- ❌ NO perspective, NO depth, NO shadows, NO reflections, NO highlights, NO gradients.
- ❌ NO diamonds, gemstones, stones, sparkles, bezels, prongs, circular settings, holes, dots that look like stone placement.
- ❌ NO text, watermarks, dimensions, labels, frames, borders.
- ❌ NO color other than pure black ink lines on pure white background.
- ❌ NO copy of the reference photo, even partial, even faint, even ghost.
- ❌ NO inventing a motif that is not on the reference. If the reference has NO engraving motif (only a smooth or hammered metal surface with set stones), output a completely blank pure white square.

═══════════════════════════════════════════
✅ WHAT THE OUTPUT MUST LOOK LIKE
═══════════════════════════════════════════

Imagine the artist who designed the engraving sat down with a pen on white paper and drew JUST ONE UNIT of the motif — flat, pure linework, no shading.

The unit fills most of the square frame (~75-85% of canvas, centered, small white margin all around).

Lines are clean, even, professional — like a vector illustration ready for engraving and tiling.

═══════════════════════════════════════════
STYLE
═══════════════════════════════════════════

Pure line art. Tattoo flash style. Hand-drawn pen-and-ink illustration. Flat, no 3D, no realism.

The reference is used ONLY to identify the motif's design — do not reproduce the reference, do not include any ring, do not include any 3D element.

Output canvas : 1:1 square, pure white background, ONE UNIT of the motif as black lines centered.`;

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
