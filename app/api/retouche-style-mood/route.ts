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

1️⃣ CAMERA ANGLE — moderate plunge from above
   - The camera is positioned ABOVE and SLIGHTLY in front of the ring, at roughly a **30-45° downward angle** (more plunged than horizontal eye-level, but NOT pure top-down).
   - The lens looks DOWN-AND-FORWARD onto the ring.
   - This reveals: the upper band-surface decoration, the polished inner hole of the ring visible at one end (oval-shaped due to the angle), AND a hint of the side profile.
   - Reference: classic editorial jewelry macro angle, like a magazine still-life shot from a chest-high position looking down onto a low table.

2️⃣ RING POSITION — rested naturally in the scene, slightly tilted
   - The ring is NATURALLY POSED in the scene — either:
     • Lying on its side on a soft surface with the open hole visible at one end (most common Léa pose)
     • Leaning against a fold of fabric, a coil of paracord, or a soft cushion at a slight angle
     • Half-buried / half-hidden in soft material (sand, fabric folds)
   - The ring is NOT floating in space. NOT a packshot on a clean white seamless. NOT perfectly vertical like a Shopify catalog product.
   - The inner polished hole is visible at one end (left or right) as an oval shape.
   - The decorated outer band-surface is visible on top, even if partly in perspective.

⚠️ CRITICAL — RING INTERIOR IS ONE SMOOTH POLISHED METAL SURFACE
   - The inside of a Mood Collection ring (visible through the ring's hole, on the inner edge of the band) is **ONE SINGLE CONTINUOUS SMOOTH POLISHED METAL SURFACE** — like the inside of a wedding band: uniform, mirror-polished, no decoration, no division, no pattern.
   - DO NOT render the interior as multiple stacked rings, multiple layered bands, segmented sections, or split parts. The interior is **MONOLITHIC and SMOOTH**.
   - The ring is a SINGLE band with decoration only on the OUTER top surface — the inner surface (the hole side) is uniformly polished metal, period.

3️⃣ COMPOSITION — RING IN A SCENE, NOT A PACKSHOT
   - The ring fills **45-65% of the frame width** (NOT more — leave generous bokeh / decor space around it).
   - The ring is INTEGRATED in a scene, not isolated like a product catalog shot. The viewer sees the ring AND the soft blurred decor around it (paracord, draped fabric, surface, sand, petals, etc.).
   - Around the ring: at least 35-55% of the frame area is filled with soft-focus DECOR — visible but heavily blurred. NEVER a clean isolated background.
   - The ring is RESTING ON or LEANING AGAINST something in the scene: a fold of fabric, a coil of paracord, a soft cushion, a textured surface — never floating on a clean studio backdrop.
   - Varied placement of the ring in the frame:
     • Off-center right with the scene's decor flowing on the LEFT
     • Off-center left with decor on the RIGHT
     • Center with decor around (top and/or sides)
   - Think editorial still-life: "the ring lives in this little world". Not a product packshot.

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

6️⃣ DECOR / BACKGROUND — SCENE WITH MATERIAL, NOT JUST FLAT BACKDROP
   - The scene includes 1-2 thematic MATERIALS visible in heavy bokeh AROUND the ring (not just a flat colored backdrop). Examples:
     • army theme → ring rests on canvas khaki fabric + blurred paracord coil in background
     • marine theme → ring on wet pebbles + blurred draped blue cloth in background
     • neige theme → ring on soft white fabric + blurred sparkling dust in background
     • chine theme → ring on draped red silk + blurred silk folds in background
   - The decor fills 35-55% of the frame area (in soft bokeh, never sharp).
   - The decor uses ONLY: textiles (canvas, silk, linen, fur, knit), cords (paracord, rope), natural materials (sand, pebbles, petals, feathers, dust), surfaces (leather, stone, wood, paper).
   - NEVER includes literal themed objects: NO bullets/guns for military, NO shells/anchors for marine, NO animals for safari, NO snowflakes for winter, NO dragons for chinese.
   - The decor is a "still-life nest" for the ring — it cradles or surrounds the ring naturally.

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
- NO ring filling more than 65% of the frame — leave generous bokeh/decor space around.
- NO isolated ring on a clean studio background — the ring is integrated in a scene with visible blurred decor materials around it.
- NO multi-layered / segmented / stacked interior. The inside of the ring is ONE smooth continuous polished metal surface (mirror-polished, no decoration, no division).
- NO low/horizontal eye-level camera angle. The camera plunges from above at 30-45°.
- NO vertical-packshot pose. The ring rests naturally in the scene (laid on its side, leaning against decor, half-cradled).

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

PRODUCE THE IMAGE NOW following ALL 6 Léa rules above strictly. The ring rests naturally in a still-life scene (NOT a packshot), camera plunges 30-45° from above, ring fills 45-65% of the frame, decor materials (textiles, cords, natural materials) cradle and surround the ring in heavy bokeh, soft single window light, classic macro DOF, ring interior is one smooth polished metal surface.`;

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
