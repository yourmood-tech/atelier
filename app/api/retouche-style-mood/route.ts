import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

const PROMPT_BASE = `RE-PHOTOGRAPH this Mood Collection ring in the SIGNATURE STYLE of Mood Collection's in-house editorial photographer (Léa) — soft window-light macro still-life.

⛔ ABSOLUTE RULE — RING IDENTITY PRESERVED (PIXEL-PRECISE)
- Same shape, same colors, same material, same finish, same gemstones, same engravings, same pattern as the source image. Do NOT invent details, do NOT change colors, do NOT add or remove gemstones.

═══════════════════════════════════════════════════════════════════
RING ANGLE & POSITION — CRITICAL, DIFFERENT FROM E-COMMERCE PACKSHOT
═══════════════════════════════════════════════════════════════════
The source image may show the ring as a vertical e-commerce packshot (standing upright, perfect profile view). DO NOT keep that pose.

INSTEAD, RE-POSITION the ring as Léa would shoot it:
- Lay the ring DOWN or TILT it dynamically — 3/4 view from above AND slightly from the side.
- We must see BOTH the OUTER decorated band (engravings, gemstones, color) AND a hint of the INNER metal interior of the ring (the polished hole through the ring should be visible at an angle).
- The ring rests on the surface or is balanced on its side at an angle, NEVER standing perfectly vertical like a catalog product.
- The ring fills 55-75% of the frame — bold and bigger than a packshot.
- Off-center placement (typically slightly right or slightly left of center), generous breathing space on the opposite side for bokeh atmosphere.

═══════════════════════════════════════════════════════════════════
LIGHTING — SOFT WINDOW LIGHT, NEVER STUDIO STROBE
═══════════════════════════════════════════════════════════════════
- Source: SOFT DIFFUSED NATURAL DAYLIGHT, like a north-facing window at 45° from one side (typically upper-left).
- Light is gentle and wraps around the ring smoothly. Soft shadow gradient on the opposite side.
- NO ring light. NO hard studio strobe. NO clinical flat overhead light. NO hot specular hotspots.
- The reflections on polished metal are SOFT and SUBTLE — not bright burning highlights.
- Mood: intimate, calm, editorial. Like a luxury magazine still-life shot in available light.

═══════════════════════════════════════════════════════════════════
DEPTH OF FIELD — VERY SHALLOW MACRO
═══════════════════════════════════════════════════════════════════
- Imagine 100mm macro lens at f/2.8 or wider.
- ONLY a thin slice of the ring (front edge, key gemstone, or decorated band) is in PERFECT FOCUS.
- The far side of the ring, the inner interior, and the ENTIRE BACKGROUND are in CREAMY HEAVY BOKEH.
- The bokeh is dreamy and painterly — never sharp, never readable as a clear scene.
- No "everything in focus" 3D-render look.

═══════════════════════════════════════════════════════════════════
BACKGROUND — MINIMAL, SUGGESTIVE, NEVER LITERAL
═══════════════════════════════════════════════════════════════════
- The atmosphere is evoked through 3 ELEMENTS ONLY:
  • COLOR PALETTE (in harmony or elegant contrast with the ring)
  • TEXTURE / MATERIAL (one only — woven canvas, raw linen, soft sand, draped silk, paracord blurred, leather grain, wool knit, fur, etc.)
  • LIGHT QUALITY (warm/cool)
- Background is HEAVILY out of focus — reads as atmosphere, never as readable scene.
- Optionally: ONE single out-of-focus complementary material (a fold of fabric, paracord blurred, a feather, draped silk). NEVER a themed object.
- Often: a simple flat colored surface is enough (pink for romantic, black matte for elegant, gray gradient for editorial). No need for fancy decor — Léa often shoots on a single colored seamless paper.

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
- NO ring standing perfectly vertical like a catalog packshot (Shopify-style profile view).
- NO sharp focus everywhere (3D-render look) — heavy bokeh on background is mandatory.
- NO hard ring-light or studio strobe with hot specular hotspots.
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
