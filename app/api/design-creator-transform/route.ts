import { NextResponse } from "next/server";
import { incrementGeminiImageCount } from "@/lib/gemini-counter";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante côté serveur" }, { status: 500 });
  }

  let body: { image?: string; instruction?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { image, instruction } = body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante ou invalide" }, { status: 400 });
  }
  if (!instruction || !instruction.trim()) {
    return NextResponse.json({ error: "Instruction de transformation manquante" }, { status: 400 });
  }

  const m = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Format image invalide" }, { status: 400 });
  const mimeType = m[1];
  const data = m[2];

  const prompt = `🎨 TRANSFORMATION LIBRE — Apply the following USER INSTRUCTION to the attached image. The instruction is PRIORITY — follow it strictly and literally.

═══════════════════════════════════════════
🎯 USER INSTRUCTION (priority — must be respected)
═══════════════════════════════════════════

${instruction.trim()}

═══════════════════════════════════════════
PRESERVATION RULES (unless explicitly overridden by the instruction above)
═══════════════════════════════════════════

- Preserve the ring(s) identity : same shape, color, material, finish, gemstones, engravings, decoration — pixel-faithful.
- Preserve the photographic style : same camera angle, same lighting, same background tone, same color grading.
- Do NOT add elements not requested in the instruction (no text, no logos, no watermarks, no extra rings, no extra people).
- Do NOT remove elements not mentioned in the instruction.
- If the instruction asks to DUPLICATE / MULTIPLY / ADD rings : preserve the original count + add the requested duplicates, with consistent spacing and arrangement as specified.
- If the instruction asks to REMOVE / DELETE elements : remove only what's specified.
- If the instruction is ambiguous, favor the literal interpretation.

═══════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════

A photograph that satisfies the user instruction strictly, preserving all other aspects of the source image. Magazine-print quality, ultra-sharp, no artifacts.`;

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
