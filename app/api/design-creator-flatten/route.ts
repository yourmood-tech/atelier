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

  const prompt = `🎨 GENERATE A NEW IMAGE — DO NOT TRANSFORM THE REFERENCE.

The attached image is a REFERENCE PHOTO of a 3D ring with an engraved decorative motif. You will use this reference ONLY to identify the engraving motif. The reference image itself MUST NOT appear in your output in any form.

═══════════════════════════════════════════
WHAT TO GENERATE — a completely new image :
═══════════════════════════════════════════

A single flat horizontal rectangular metal strip, centered on a pure white background.

The strip represents the ring's outer band UNROLLED FLAT (cut open and laid down), shown in perfectly orthographic top-down view.

Strip proportions :
- Very long horizontal rectangle, aspect ratio ~6:1 to 8:1.
- Fills the full horizontal width of the canvas.
- White space above and below the strip — nothing else there.

Strip content — ONLY these two visual elements :
1. The metal surface : same color and finish as identified from the reference (e.g. rose gold matte if the reference is rose gold matte).
2. The engraving motif from the reference, drawn as crisp fine BLACK INK LINES etched into the metal. Repeat the SAME motif 2 to 3 times end-to-end along the strip, with no seam. The motif is ENGRAVED LINES ONLY — no inset stones, no holes, no bezels.

═══════════════════════════════════════════
🚫 ABSOLUTE BAN LIST 🚫
═══════════════════════════════════════════

Your output canvas must NOT show any of the following :

- ❌ The reference ring itself. Not a top half. Not a bottom half. Not a side view. Not a faint copy. Not a transparent ghost. NOTHING from the reference photo appears.
- ❌ Any 3D object. Any curved surface. Any depth. Any shadow on the floor. Any reflection.
- ❌ Diamonds, gemstones, jewels, sparkles, brilliance, circular insets, bezel settings, prong settings, claw settings. The strip is bare metal + engraving only.
- ❌ Any blurred or ghosted second strip above or below the main strip.
- ❌ Any text, label, dimension, watermark, annotation, arrow, ruler.

Mental check before outputting : "Can the viewer see any trace of the original 3D ring photo, or any second floating element, anywhere in the canvas ?" → If yes, the output is WRONG. Redo it as a single clean strip on white, nothing else.

═══════════════════════════════════════════
STYLE
═══════════════════════════════════════════

Flat technical reference template. Even, uniform, soft, diffuse lighting across the entire strip. No highlights, no glints, no reflections, no spot lighting.

Canvas aspect : 21:9 ultrawide. Output = the strip + pure white surroundings, nothing else exists in the frame.`;

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
