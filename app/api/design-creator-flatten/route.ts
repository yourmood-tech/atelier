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

  const prompt = `TASK : Transform the source ring photo into a FLAT UNROLLED TECHNICAL VIEW for an engraver. The output is a reference template that will be combined later with a SEPARATE stone-setting spec sheet.

═══════════════════════════════════════════
🚫 ABSOLUTE BAN LIST — VIOLATING ANY OF THESE = FAILED OUTPUT 🚫
═══════════════════════════════════════════

1. NO DIAMONDS anywhere in the output. Not one.
2. NO GEMSTONES anywhere. Not one.
3. NO STONE SETTINGS, NO BEZELS, NO PRONGS, NO CIRCULAR CUT-OUTS where a stone could go.
4. NO original 3D ring visible. Not in the background. Not in the corners. Not at the bottom. The original ring photo MUST disappear entirely.
5. NO perspective. NO depth. NO shadows. NO curved edges. NO reflections. NO highlights.
6. NO text, NO watermark, NO dimensions, NO labels.

If you can see anything that could be interpreted as a diamond, a stone, a sparkle, a bezel, or a hole for setting — REMOVE IT.

═══════════════════════════════════════════
✅ OUTPUT REQUIRED
═══════════════════════════════════════════

A single long horizontal rectangular strip on a pure white background.

- The strip = the ring's outer surface UNROLLED COMPLETELY FLAT.
- Strip aspect ratio approximately 6:1 to 8:1 (very long horizontal rectangle).
- Strip fills the full horizontal width of the canvas.
- Above and below the strip : pure white. Nothing else.
- Perfectly orthographic top-down view. No 3D whatsoever.

═══════════════════════════════════════════
CONTENT OF THE STRIP — METAL + ENGRAVING ONLY
═══════════════════════════════════════════

ON THE STRIP, show ONLY two things :
(a) The metal surface (same color and finish as the source — rose gold, white gold, silver, etc.).
(b) The decorative ENGRAVING pattern as crisp black ink lines etched into the metal.

NOTHING ELSE. No diamonds. No stones. No settings.

═══════════════════════════════════════════
PATTERN REPETITION (engraving only, NEVER stones)
═══════════════════════════════════════════

The source photo shows only ONE FACE of the ring. The engraving motif typically repeats identically around the full circumference.

→ In the output, repeat the SAME ENGRAVING MOTIF 2 to 3 times end-to-end along the full length of the strip, with no visible seam.
→ When repeating the motif : copy ONLY the engraved lines. Do NOT copy any stones, holes, or settings from the source. Even if the source shows stones inside the motif, the output strip's motif must be PURELY ENGRAVED LINES on bare metal.

═══════════════════════════════════════════
STYLE
═══════════════════════════════════════════

Even, uniform, soft, diffuse lighting across the entire strip. Like a flat reference template.

Output canvas : 21:9 ultrawide. The strip fills the canvas horizontally. The original 3D ring photo does NOT appear in the output — it has been completely replaced by the flat unrolled strip.`;

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
