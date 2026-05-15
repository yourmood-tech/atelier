import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

const PROMPT_BASE = `RE-PHOTOGRAPH the Mood Collection ring from the source image, as if it were freshly shot by Mood Collection's signature in-house photographer (Léa) on her macro setup.

THE SOURCE IMAGE MAY BE AN E-COMMERCE PACKSHOT (ring standing upright in profile). IGNORE THAT POSE COMPLETELY. Re-stage the ring exactly as described below — Léa would never shoot it like a Shopify packshot.

⛔ RING IDENTITY — PIXEL-PRECISE PRESERVATION
- Same shape, exact same colors, exact same materials, exact same finish, exact same gemstones, exact same engravings/patterns as the source. DO NOT invent. DO NOT change colors. DO NOT add or remove anything.

═══════════════════════════════════════════════════════════════════
LÉA'S SIGNATURE — 6 NON-NEGOTIABLE RULES
═══════════════════════════════════════════════════════════════════

1️⃣ CAMERA ANGLE — slightly elevated 3/4 view from above
   - The camera is positioned ABOVE the table at roughly a 30-45° downward angle (NOT top-down, NOT horizontal/eye-level).
   - The lens looks slightly DOWN onto the ring.
   - This reveals: the curved upper band-surface (decoration / engravings / gemstones), the polished inner hole of the ring at one end, AND the side profile of the band.

2️⃣ RING POSITION — laid FLAT and HORIZONTAL on its side
   - The ring lies on the surface with the BAND-CIRCLE LAYING HORIZONTALLY (like a small donut on a table viewed slightly from above).
   - The inner polished hole of the ring is visible at one end (left or right end of the ring).
   - The band's decorated outer surface curves up and over toward the camera.
   - NEVER standing vertical/upright like a Shopify packshot. NEVER perfectly profile-only.

3️⃣ COMPOSITION — TIGHT CROP, VARIED placement
   - EXTREME MACRO CLOSE-UP. The ring must be BIG in the frame.
   - The ring fills **75-90% of the frame width** (and a comparable share of the height). The ring is huge — like a magazine editorial macro shot, not a small object in a wide scene.
   - Tight crop: the ring may slightly touch or be very close to the frame edges on the side it leans towards. There is NO wide negative space all around — only a single area of soft bokeh on ONE side.
   - Varied placement (avoid rigid centering):
     • Off-center right with breathing space on the LEFT
     • Off-center left with breathing space on the RIGHT
     • Almost centered with subtle asymmetry
   - Think: "the ring fills my viewfinder". Like a macro Canon 5D + 100mm lens at minimum focusing distance. Not a wide product shot.

4️⃣ DEPTH OF FIELD — classic macro shallow but NOT extreme
   - Imagine a 100mm macro lens at f/3.5–f/5.6 (NOT f/2.8, NOT f/1.4).
   - The front-facing portion of the ring (where the camera looks most directly) is in PERFECT sharp focus.
   - The far side of the ring gently falls off into soft creamy bokeh.
   - The background is in heavy soft bokeh.
   - This is REAL macro photography — not the "everything-magically-blurred-except-one-pixel" look of cheap AI generators.

5️⃣ LIGHTING — single soft window from one side, north-facing morning light
   - ONE soft directional source from upper-left OR upper-right (choose one based on the theme).
   - Creates a gentle highlight on the upper edge of the ring and a soft delicate shadow on the lower edge.
   - The polished metal interior catches a subtle reflection of the light source.
   - NEVER hard studio strobe. NEVER ring-light. NEVER overhead flat. NEVER hot specular hotspots.
   - Mood: 9am morning light through a north-facing window. Soft, calm, intimate, editorial.
   - The shadow side of the ring is gently illuminated, not pitch black.

6️⃣ BACKGROUND — minimalist, often a single deep matte color
   - Léa often shoots on a single deep-color seamless paper or matte textured surface (cuir noir mat, gris dégradé, pastel pink, etc.).
   - The atmosphere of the theme is evoked through COLOR + TEXTURE + LIGHT QUALITY only — never through literal themed objects.
   - The background is in heavy bokeh and reads as ambiance, not as a defined scene.
   - Optionally: ONE single out-of-focus complementary material element (a fold of dark fabric, a corner of paracord blurred, a hint of feathers) — but always blurred and never the focal point.

═══════════════════════════════════════════════════════════════════
⛔ ABSOLUTE BANS — DO NOT INCLUDE
═══════════════════════════════════════════════════════════════════
- NO ring standing upright vertical like a Shopify catalog packshot.
- NO horizontal eye-level view (no looking AT the ring from the side at zero angle).
- NO top-down 90° overhead view.
- NO literal themed objects: militaire = NO bullets/guns/helmets; marine = NO seashells/anchors/fish; safari = NO live animals; chine = NO dragons/lanterns; neige = NO snowmen/Christmas trees. ONLY color + texture + light.
- NO text, NO logo, NO watermark, NO letters, NO numbers, NO branding.
- NO faces, NO hands, NO body parts, NO people.
- NO white catalog seamless background, NO flat clinical studio light.
- NO hard ring-light or strobe specular hotspots.
- NO everything-in-focus 3D-render look.
- NO altering the ring's geometry, colors, gemstones, engravings.
- NO small ring in wide scene — the ring MUST be huge, filling 75-90% of the frame.
- NO excessive negative space around the ring — only ONE direction has breathing space (left OR right OR top), the other sides crop tight.

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
    return NextResponse.json({ error: "Le champ Thème est obligatoire" }, { status: 400 });
  }

  const m = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Format image invalide" }, { status: 400 });
  const mimeType = m[1];
  const data = m[2];

  const themeText = `THEME: "${theme.trim()}"

Translate the theme into Léa's signature aesthetic — interpret through:
- 1 dominant background color (deep matte color, often dark or pastel — see examples below)
- 1 background texture/material (smooth, fabric, grainy, sparkly — choose ONE)
- 1 optional out-of-focus accent (a fold of fabric, a paracord, feathers) — heavily blurred, never literal
- Light quality (warm/cool, direction)

Examples of correct Léa-style interpretation:
- "militaire" → deep matte black or olive khaki seamless + heavy blurred paracord at edge + warm soft directional light from upper-left
- "marine" → deep royal blue or pale sand seamless + soft draped texture + cool diffused morning light
- "désert / sahara" → warm cream/beige seamless + soft sand grain texture + warm golden directional light
- "neige / hiver" → soft pale blue or white seamless + dust of sparkling powder heavily blurred + cool clean morning light
- "papillon" → black matte seamless + warm golden glitter bokeh in background + soft directional light
- "chine / dragon" → deep red matte seamless + heavily blurred draped silk at edge + warm light
- "automne" → warm rust/ochre seamless + raw linen texture + soft directional warm light
- "velours noir / sombre" → deep matte black textured leather + dramatic single side window light + subtle reflection on surface
- "sparkling doré" → black matte foreground + warm golden bokeh of out-of-focus sparkles in background + warm light
- "romantique / saint-valentin" → soft pink pastel seamless + blurred pink feathers + warm soft window light

${note && note.trim() ? `\n\nADDITIONAL USER NOTE (priority — respect strictly): ${note.trim()}` : ""}

Output: ${format} aspect ratio.

PRODUCE THE IMAGE NOW following ALL 6 Léa rules above strictly. The ring is laid flat horizontally, slight elevated 3/4 camera angle, **TIGHT CROP filling 75-90% of the frame**, soft single window light, classic macro DOF, minimalist colored seamless background interpreting the theme through color+texture+light only.`;

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
