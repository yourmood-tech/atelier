import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

const PROMPT_BASE = `Apply a thematic atmosphere to this Mood Collection ring photo, in the SIGNATURE STYLE of Mood Collection's in-house photographer (Léa).

═══════════════════════════════════════════════════════════════════
⛔ ABSOLUTE RULE — RING POSITION IS PRESERVED
═══════════════════════════════════════════════════════════════════
- The ring's POSITION, ORIENTATION, ANGLE, FRAMING from the source image MUST BE PRESERVED EXACTLY.
- If the ring lies FLAT on a surface in the source → it stays FLAT in the output. Do NOT stand it up.
- If the ring is TILTED at an angle in the source → it stays at the SAME tilt in the output.
- If the ring is shown SIDE-VIEW / SLIGHTLY FROM ABOVE → it stays in that view in the output.
- DO NOT REPOSITION, DO NOT REORIENT, DO NOT MAKE IT "STAND UP", DO NOT ROTATE.
- The ring's exact placement in the frame (off-center left, off-center right, etc.) is also preserved.

⛔ ABSOLUTE RULE — RING IDENTITY IS PRESERVED
- Same shape, same colors, same material, same finish, same gemstones, same engravings as the source. Pixel-precise preservation.

═══════════════════════════════════════════════════════════════════
SIGNATURE STYLE — WHAT TO PRODUCE
═══════════════════════════════════════════════════════════════════

1. MACRO COMPOSITION (preserved from source if already macro)
   - Very tight close-up — the ring fills 50-70% of the frame.
   - Off-center placement (left or right side), generous breathing space on the opposite side.
   - VERY shallow depth of field: only a thin slice of the ring is in perfect focus. The rest of the ring and the entire background is in heavy, creamy bokeh.

2. LIGHTING — soft natural directional
   - Strong directional light from one side (typically upper-left or upper-right).
   - Soft fill on the opposite side.
   - Warm intimate mood, never harsh studio. No clinical e-commerce flat light.

3. BACKGROUND — SUBTLE & SUGGESTIVE (CRITICAL)
   - The atmosphere is evoked through 3 ELEMENTS ONLY:
     • COLOR PALETTE (warm khaki for army, royal blue for marine, soft cream for desert, etc.)
     • TEXTURE / MATERIAL (woven canvas, raw linen, soft sand, draped silk, paracord blurred, leather grain, wool knit, rough stone, fresh snow)
     • LIGHT QUALITY (warm/cool, soft/dramatic)
   - The background is HEAVILY out of focus (creamy bokeh) — it reads as ATMOSPHERE, never as a defined scene.
   - Optionally: ONE single out-of-focus complementary material (a fold of fabric, a corner of canvas, a blurred paracord, scattered sand) — but NEVER a literal themed object.

═══════════════════════════════════════════════════════════════════
⛔ BANNED — DO NOT INCLUDE ANY OF THESE
═══════════════════════════════════════════════════════════════════
- NO literal themed objects. NEVER. For example:
  • "military" theme → NO bullets, NO ammunition, NO knives, NO firearms, NO dog tags, NO helmets, NO uniforms. ONLY khaki canvas texture + paracord blurred + earthy palette.
  • "marine / ocean" theme → NO seashells in focus, NO anchor, NO fishnet, NO boat, NO fish. ONLY blue/teal palette + soft wet stone texture + cool light.
  • "safari / lion" theme → NO live animals, NO actual fur of an animal in focus, NO leopard print fabric. ONLY warm earth palette + raw linen texture + golden light.
  • "winter / snow" theme → NO snowflake stickers, NO snowman, NO Christmas tree, NO pine cones in focus. ONLY soft white-blue palette + sparkling powder texture blurred.
  • "Chinese / dragon" theme → NO actual dragon, NO Chinese characters, NO lantern. ONLY draped red silk texture + warm light.
- NO text, NO logo, NO watermark, NO letters, NO numbers, NO branding.
- NO faces, NO hands, NO body parts, NO people. Pure still-life only.
- NO white catalog background. NO flat studio light. NO clinical packshot.
- NO repositioning the ring. NO making it stand on edge.
- NO inventing details on the ring. NO adding gemstones. NO changing colors.

═══════════════════════════════════════════════════════════════════
USER-PROVIDED THEME
═══════════════════════════════════════════════════════════════════
`;

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });
  }

  let body: { image?: string; theme?: string; note?: string | null; format?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

  const { image, theme, note, format = "3:2" } = body;
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

  const themeText = `THEME (interpret as Mood's photographer would — through COLOR + TEXTURE + MATERIAL + LIGHT QUALITY only, NEVER through literal themed objects):
"${theme.trim()}"

Translate this theme into:
- 1 COLOR PALETTE (in harmony or in elegant contrast with the ring colors)
- 1 BACKGROUND TEXTURE/MATERIAL (woven, draped, scattered, blurred — choose ONE, keep it soft and out of focus)
- 1 LIGHT QUALITY (warm/cool, direction, intensity)
- Optionally 1 single out-of-focus material accent (a fold of fabric, a paracord, scattered powder, water droplets) — never a literal themed object.

Examples of correct interpretation (NEVER deviate from this minimalism):
- "militaire" → khaki canvas texture + olive paracord blurred in background + warm soft directional light
- "marine" / "marco" → royal blue palette + soft sand or stone texture + cool diffused light  OR  pale sand + soft white light + blue accent
- "désert" / "sahara" → warm cream/beige sand texture + golden warm directional light
- "neige" → soft white-blue palette + dusting of out-of-focus sparkling powder + cool clean light
- "papillon" → warm golden glitter texture blurred + soft directional light + neutral palette
- "chine" → draped deep red silk blurred + warm light + cinnamon/black palette
- "automne" → warm rust/ochre palette + raw linen texture + soft directional warm light
- "velours noir" → deep black matte fabric + dramatic single side light + subtle mirror reflection
- "sparkling doré" → bokeh of golden sparkling lights blurred + warm light + black or cream foreground

${note && note.trim() ? `ADDITIONAL USER NOTE (priority — respect strictly): ${note.trim()}\n\n` : ""}

Output format: ${format} aspect ratio (landscape if 3:2 or 16:9, portrait if 2:3 or 4:5, square if 1:1).

PRODUCE THE TRANSFORMED IMAGE NOW. Ring identity + position preserved exactly. Background reimagined per theme with COLOR + TEXTURE + LIGHT ONLY.`;

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
          imageConfig: { aspectRatio: format },
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
