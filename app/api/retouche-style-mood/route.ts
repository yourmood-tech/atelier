import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

const PROMPT_BASE = `Transform this Mood Collection ring photo into a HIGH-END EDITORIAL MACRO STILL-LIFE in the signature style of Mood Collection's in-house photographer (Léa).

═══════════════════════════════════════════════════
SIGNATURE STYLE — ABSOLUTE REQUIREMENTS
═══════════════════════════════════════════════════

1. THE RING IS PRESERVED IDENTICALLY
   - Same shape, same color, same material, same finish, same gemstones, same engravings as the source image. Pixel-precise preservation.
   - The ring is the HERO of the shot — perfectly sharp, exquisitely lit.

2. MACRO COMPOSITION
   - Tight close-up of the ring filling 50-70% of the frame.
   - Ring positioned OFF-CENTER (typically left third or center-left), with generous breathing space on one side (top-right or right) for the camera to "see" depth.
   - Shallow depth of field (very narrow DOF, like macro lens at f/2.8) — only a thin slice of the ring is in perfect focus, with creamy bokeh in front and behind.
   - Subtle reflection or surface beneath the ring if the surface allows.

3. LIGHTING
   - Strong DIRECTIONAL light (key light from one side, typically upper-left or upper-right) creating dramatic highlights on the metal edges.
   - Soft fill on the opposite side keeping the ring readable.
   - The light SCULPTS the 3D form of the ring — reflections on polished metal, soft glow on satin finishes.
   - Mood is warm and intimate, never harsh studio.

4. THEMATIC BACKGROUND (CRITICAL)
   - The background is NEVER neutral or empty — it is a NARRATIVE SCENE that echoes the personality of the ring.
   - The background is highly out-of-focus (heavy bokeh), so it reads as ATMOSPHERE rather than a defined object. The ring stays sharp; the background is a painterly blur of color, texture and suggestion.
   - The atmosphere supports the ring's mood: a winter ring sits on a dreamy field of soft blue snowflakes; a butterfly ring on a bed of golden sparkling sand; a Chinese-themed ring on draped red silk; a dark elegant ring on a black matte surface with mirror reflection.

5. COLOR HARMONY
   - The background palette is in CONVERSATION with the ring colors — either echoing them (a pink ring on a softly pink-glittered surface) or contrasting elegantly (a vivid red ring against a deep matte black to make it pop).
   - No clashing colors. Always cohesive, always intentional.

6. SUBTLE ENVIRONMENTAL DETAILS
   - Optionally, the background can hint at the theme with one out-of-focus element (a real feather, a petal, a snowflake icon, draped fabric, scattered glitter, etc.) — but NEVER busy or competing with the ring.

═══════════════════════════════════════════════════
WHAT TO AVOID — ABSOLUTE BANS
═══════════════════════════════════════════════════
- NO text, NO logo, NO watermark, NO letters, NO numbers, NO branding.
- NO flat / clinical / e-commerce neutral white background (this is editorial, not catalog).
- NO sharp background — the ring is ALWAYS the only sharp element.
- NO altered ring identity — never invent details, never change the geometry, never add or remove gemstones.
- NO faces, NO hands, NO body parts — pure still-life only.

═══════════════════════════════════════════════════
USER-PROVIDED THEME
═══════════════════════════════════════════════════
`;

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });
  }

  let body: { image?: string; theme?: string; note?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

  const { image, theme, note } = body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante ou invalide" }, { status: 400 });
  }
  if (!theme || !theme.trim()) {
    return NextResponse.json({ error: "Le champ Thème est obligatoire (ex : 'neige', 'sombre', 'papillon', 'chine')" }, { status: 400 });
  }

  const m = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Format image invalide" }, { status: 400 });
  const mimeType = m[1];
  const data = m[2];

  const themeText = `THEME (the user wants the background and atmosphere to evoke this theme — interpret it as the in-house Mood photographer would, with subtlety and elegance, not literally):
"${theme.trim()}"

The background should evoke this theme through:
- Color palette
- Optional out-of-focus suggestive object (real, not graphic) that hints at the theme
- Surface texture (smooth, glittery, fabric, water, sand, etc.)
- Light quality (warm, cool, soft, dramatic)

But the background remains HEAVILY out of focus — the theme is felt, not displayed literally.${note && note.trim() ? `\n\nADDITIONAL USER NOTE (priority): ${note.trim()}` : ""}

Output: the transformed editorial macro still-life photograph, ready for catalog/social use.`;

  const prompt = PROMPT_BASE + themeText;

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
          imageConfig: { aspectRatio: "1:1" },
        },
      }),
    });
    const respText = await r.text();
    let respData: { candidates?: Array<{ content?: { parts?: unknown[] }; finishReason?: string }>; promptFeedback?: { blockReason?: string }; error?: { message?: string } };
    try { respData = JSON.parse(respText); }
    catch { return NextResponse.json({ error: `Gemini non-JSON (HTTP ${r.status}): ${respText.slice(0, 200)}` }, { status: 502 }); }

    if (!r.ok) {
      return NextResponse.json({ error: `Gemini ${r.status}: ${respData?.error?.message || ""}` }, { status: 502 });
    }
    const candidate = respData?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      return NextResponse.json({ error: `Gemini a refusé (finishReason: ${candidate.finishReason}). Essaye avec un autre thème ou une autre photo.` }, { status: 502 });
    }
    if (respData?.promptFeedback?.blockReason) {
      return NextResponse.json({ error: `Bloqué par filtres (${respData.promptFeedback.blockReason})` }, { status: 502 });
    }
    const partsOut = (candidate?.content?.parts || []) as Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
    const imagePart = partsOut.find(p => p.inlineData?.mimeType?.startsWith?.("image/"));
    if (!imagePart?.inlineData?.data) {
      const textPart = partsOut.find(p => p.text);
      return NextResponse.json({ error: textPart?.text ? `Gemini a répondu en texte : « ${textPart.text.slice(0, 150)} »` : "Pas d'image en sortie" }, { status: 502 });
    }
    return NextResponse.json({ image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
