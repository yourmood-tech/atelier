import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

const PROMPT_BASE = `RE-PHOTOGRAPH the Mood Collection ring from the source image, AT A USER-SELECTED CAMERA ANGLE (see directive below — this is the #1 priority of this prompt).

⚠️⚠️⚠️ IGNORE THE POSE / ANGLE / ORIENTATION OF THE RING IN THE SOURCE IMAGE.
The source is just to identify the ring (shape, color, materials, gemstones, engravings, pattern). You must RE-SHOOT the ring from a new camera angle as specified in the USER-SELECTED ANGLE DIRECTIVE below. The geometry the ring shows in the output MUST match the directive — if the source shows the ring in side profile but the directive says "top-down", you MUST output a top-down view (ring as a circle).

⛔ RING IDENTITY — PIXEL-PRECISE PRESERVATION
- Same shape, exact same colors, exact same materials, exact same finish, exact same gemstones, exact same engravings/patterns as the source. DO NOT invent. DO NOT change colors. DO NOT add or remove anything.

═══════════════════════════════════════════════════════════════════
LÉA'S SIGNATURE — 6 NON-NEGOTIABLE RULES
═══════════════════════════════════════════════════════════════════

1️⃣ CAMERA ANGLE — USER-SELECTED (see angle directive below)
   - {{CAMERA_ANGLE_DIRECTIVE}}

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

3️⃣ COMPOSITION — RING IS HERO, DECOR IS MINIMAL HINT
   - The ring fills **55-75% of the frame width** (prominent and bold).
   - The ring is INTEGRATED in a scene, but the decor is MINIMAL and SUGGESTIVE — a single surface texture, one corner of fabric, or just an out-of-focus color gradient.
   - Around the ring: 15-25% of the frame area is filled with soft-focus DECOR — a tiny hint, not a full scene. Prefer ONE single surface/texture, not multiple materials.
   - Often: just a colored seamless surface beneath the ring + soft bokeh of one material in the corner is enough.
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

6️⃣ DECOR — MINIMAL HINT, NOT FULL SCENE
   - The decor is a single THEMATIC SURFACE TEXTURE the ring rests on, with optional ONE small corner of complementary material in soft bokeh.
   - Examples (kept minimal, never multi-element scenes):
     • army theme → ring on khaki canvas surface; optional tiny corner of olive paracord blurred in one corner
     • marine theme → ring on smooth wet pebble or soft sand; optional hint of blue cloth in corner
     • neige theme → ring on soft white fabric; optional sparkling dust blurred in corner
     • chine theme → ring on deep red silk surface; optional silk fold in corner
   - Decor fills 15-25% of the frame area (in heavy bokeh, never sharp).
   - The decor uses ONLY: textiles (canvas, silk, linen, fur, knit), cords (paracord, rope), natural materials (sand, pebbles, petals, feathers, dust), surfaces (leather, stone, wood, paper).
   - NEVER literal themed objects: NO bullets/guns for military, NO shells/anchors for marine, NO animals for safari, NO snowflakes for winter, NO dragons for chinese.
   - Often: just a single colored surface beneath + soft color gradient bokeh = enough.

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
- NO ring filling more than 75% of the frame — leave bokeh/decor space around.
- NO ring filling less than 55% of the frame — the ring is the hero and dominates.
- NO isolated ring on a clean studio background — the ring is integrated in a scene with visible blurred decor materials around it.
- NO multi-layered / segmented / stacked interior. The inside of the ring is ONE smooth continuous polished metal surface (mirror-polished, no decoration, no division).
- NO camera angle that deviates from the USER-SELECTED angle directive (see rule 1️⃣).
- NO vertical-packshot pose. The ring rests naturally in the scene (laid on its side, leaning against decor, half-cradled).

═══════════════════════════════════════════════════════════════════
USER-PROVIDED THEME
═══════════════════════════════════════════════════════════════════
`;

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });
  }

  let body: { image?: string; theme?: string; note?: string | null; format?: string; cameraAngle?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

  const { image, theme, note, format = "3:2", cameraAngle = "lea" } = body;
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

⚠️ FINAL REMINDER : THE CAMERA ANGLE FROM RULE 1️⃣ IS THE #1 PRIORITY.
   - If you keep the source pose instead of applying the user-selected angle, the output is WRONG.
   - Look at the geometry directive : does the ring appear as a circle (top-down), oval (Léa), or rectangle (front)? Match it strictly.
   - Re-imagine the ring from scratch at the specified angle — don't preserve the source's angle.

PRODUCE THE IMAGE NOW. The ring is re-shot at the user-selected camera angle (rule 1️⃣), ring fills 55-75% of the frame, decor is a minimal thematic surface hint (15-25% of frame in soft bokeh), soft single window light, classic macro DOF, ring interior is one smooth polished metal surface.`;

  const CAMERA_DIRECTIVES: Record<string, string> = {
    "top-down": `🔝 TOP-DOWN VIEW (90° pure overhead — looking straight DOWN onto the ring).
   GEOMETRY THE RING MUST SHOW :
   - The ring is a PERFECT CIRCLE shape (a donut viewed from directly above).
   - The inner hole is a SMALLER CIRCLE inside the circle.
   - The ENTIRE upper band-surface decoration is fully visible and undistorted across the full circle.
   - ZERO side profile visible (no thickness of the band edge visible at all).
   - If you can see the band's side profile, you are NOT shooting top-down. The ring must look like a flat ring shape, not a tilted one.`,
    "haute": `🔭 HIGH PLUNGE (60-70° from above — almost overhead).
   GEOMETRY THE RING MUST SHOW :
   - The ring is a FLATTENED CIRCLE / wide oval (slightly squished circle).
   - The inner hole is a wide oval (almost a circle).
   - ~90% of the upper band-surface decoration is visible across the ring.
   - Only a tiny strip of side profile visible at the far edge.
   - If the ring looks like a side profile rectangle, the angle is WRONG.`,
    "lea": `📐 STYLE LÉA — STRONG PLUNGE (60-75° from above — almost top-down but tilted).
   GEOMETRY THE RING MUST SHOW :
   - The ring is a clear OVAL SHAPE (elongated horizontally, ~2:1 ratio width:height).
   - The inner hole is a wide OVAL.
   - ~80% of the upper band-surface decoration is visible across the ring top.
   - Only a small sliver of side profile visible at the bottom edge.
   - Reference: Léa's signature angle — looking down at the ring from standing height.
   - If you produce a ring shown in side profile (band rectangle visible), you got the angle WRONG.`,
    "legere": `📷 LIGHT PLUNGE (15-25° from above — gentle downward tilt).
   GEOMETRY THE RING MUST SHOW :
   - The ring is a NARROW OVAL / horizontal capsule shape (much wider than tall, ~4:1 ratio).
   - Most of what you see is the SIDE band profile (the thick side of the ring).
   - The upper band decoration appears as a thin strip along the top edge of the ring.
   - The inner hole appears as a narrow horizontal slit.
   - More side-view than top-view.`,
    "face": `👁 EYE-LEVEL FRONT VIEW (0° — pure horizontal side shot).
   GEOMETRY THE RING MUST SHOW :
   - The ring is a RECTANGLE shape (the side profile of the band — purely flat horizontal).
   - The inner hole is a very thin vertical slot at the center (or invisible behind the band).
   - NO upper band-surface decoration visible (looking from the side, you see only the side profile of the band).
   - Reference: a classic horizontal jewelry side-shot like a wedding-band catalog side view.
   - If you see the top of the ring or the inner hole as an oval, you are WRONG — only side band rectangle visible.`,
    "contre-plongee": `⬆️ LOW-ANGLE / UNDER-VIEW (-15° to -25° looking UP at the ring).
   GEOMETRY THE RING MUST SHOW :
   - The ring band appears as a CURVED RECTANGLE (band visible from below, curving slightly).
   - The bottom edge of the ring is closer/larger; the top edge falls away/smaller.
   - The inner hole may show as a faint oval at the TOP of the ring (not bottom).
   - The ring feels monumental, shot from a low angle looking up.
   - Dramatic, slightly unusual perspective.`,
  };
  const cameraDirective = CAMERA_DIRECTIVES[cameraAngle] || CAMERA_DIRECTIVES["lea"];
  const prompt = (PROMPT_BASE + themeText).replace("{{CAMERA_ANGLE_DIRECTIVE}}", cameraDirective);

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
