import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

const PROMPT_BASE = `🚨🚨🚨 ABSOLUTE TOP PRIORITY — READ FIRST 🚨🚨🚨

THE CAMERA ANGLE FOR THIS SHOT IS USER-SELECTED. You MUST output an image where the ring's geometry matches the user's selected camera angle (see directive at the bottom of this prompt).

⚠️ THE SOURCE IMAGE SHOWS THE RING IN AN ARBITRARY POSE. You MUST DISREGARD that pose. Re-stage the ring from scratch at the camera angle specified. Specifically :
- If user selected TOP-DOWN → the ring MUST appear in the output as a FLAT CIRCLE/RING shape (a donut viewed from directly above). The ring's axis (the line through the center of the hole) is VERTICAL and points UP to the camera. You see ONLY the top face of the band, no side profile.
- If user selected HIGH PLUNGE → the ring is a slightly squashed circle (oval ~1.5:1).
- If user selected STYLE LÉA → the ring is a clear oval (2:1).
- If user selected LIGHT PLUNGE → the ring is a narrow oval (4:1), mostly side band visible.
- If user selected FRONT VIEW → the ring is a rectangle (pure side band, no top visible).
- If user selected LOW-ANGLE → the ring is a curved rectangle viewed from below.

If your output does NOT match the geometry above for the selected angle, YOU HAVE FAILED. Check before producing.

═══════════════════════════════════════════════════════════════════

You are a professional luxury jewelry post-production retoucher creating a high-end editorial photograph for Mood Collection — to magazine print quality standards (Vogue / Harper's Bazaar level).

═══════════════════════════════════════════════════════════════════
🏆 OUTPUT QUALITY MANDATE — TOP PRIORITY, NON-NEGOTIABLE
═══════════════════════════════════════════════════════════════════

The final image MUST look like a high-end retouched jewelry photograph at magazine print quality. This means:

📷 IMAGE QUALITY :
- ULTRA-SHARP focus on the ring (every micro-detail of metal/gemstones/engravings crisp and crystal clear).
- HIGH-RESOLUTION feel — like a Hasselblad H6D 100MP medium-format capture.
- Perfect exposure: highlights controlled, shadows rich with detail, no banding, no noise.
- Color accuracy: precise rendering of metal tones (silver, rose gold, titanium blue, etc.), gemstones (CZ sparkle, diamond fire), and surface finishes (brushed/satin/polished).
- Professional retouching pass — every imperfection removed, every reflection clean.

💎 THE RING MUST BE FLAWLESS — FACTORY-FRESH PRISTINE :
The ring in the output looks like it just came out of the workshop, fresh from the final polish, photographed for a luxury catalog. SPECIFICALLY :
- ✂️ REMOVE ALL DUST, lint fibers, microscopic hairs, fluff particles. NONE remain anywhere on the ring.
- ✂️ REMOVE ALL FINGERPRINTS, smudges, oily traces, breath marks. The metal looks mirror-clean.
- ✂️ REMOVE ALL FINE SCRATCHES, micro-rayures, surface marks, brush marks (unless brushed/satin finish is the intentional design — in which case keep the brush pattern intentional and clean).
- ✂️ REMOVE all water spots, residue, discoloration, oxidation.
- ✨ POLISHED METAL SURFACES (the base's two rails and the inner band of the ring) must be MIRROR-PERFECT with crisp clean reflections — no dust dots, no fingerprint smears.
- 💎 GEMSTONES sparkle clean and brilliant — no dust trapped under prongs, no fingerprint film.
- 🎯 ADDON (the decorated central band) is impeccable — every engraving line crisp, every gemstone setting clean, every color zone uniform.

🔧 MOOD RING STRUCTURE — STRICT ADDON-BASE GEOMETRY :
Mood Collection rings have TWO PARTS visible from outside :
- THE BASE (steel 316L or titanium) — structural ring with TWO POLISHED METAL RAILS framing a central groove of CONSTANT WIDTH.
- THE ADDON (decorated interchangeable band) — colored/patterned/gemstone band that CLIPS INTO the central groove and FILLS IT COMPLETELY.

CRITICAL GEOMETRY RULES (the most common AI mistake — pay extreme attention) :

📏 PRESERVE THE RING'S OVERALL PROPORTIONS FROM THE SOURCE :
- ✅ THE TOTAL VISIBLE BAND THICKNESS (top-to-bottom height of the entire ring profile) is IDENTICAL to the source. DO NOT make the ring thinner. DO NOT make it slimmer. The ring's overall thickness (épaisseur) must match the source exactly.
- ✅ THE WIDTH PROPORTIONS between rails and addon are IDENTICAL to the source. If the source shows a wide addon and thin rails, the output shows the same ratio. If the source shows balanced rails and addon, the output respects that balance.

📐 ADDON IS CENTERED BETWEEN THE TWO RAILS :
- ✅ The addon (decorated central band) is positioned EXACTLY IN THE MIDDLE of the ring's height — equidistant from the top edge of the band and the bottom edge.
- ✅ The UPPER RAIL (between addon and top edge of the ring) and the LOWER RAIL (between addon and bottom edge of the ring) have EXACTLY THE SAME WIDTH/THICKNESS. They are MIRROR-symmetric across the addon's center.
- ⛔ The addon must NOT be positioned higher (closer to the top edge) or lower (closer to the bottom edge). It is centered vertically on the band.

📏 ADDON GEOMETRY :
- ✅ THE ADDON HAS A UNIFORM, CONSTANT WIDTH along its ENTIRE visible length. It does NOT shrink, NOT taper, NOT vary anywhere.
- ✅ THE ADDON FILLS THE ENTIRE GROOVE between the two rails. Top edge touches upper rail, bottom edge touches lower rail. NO empty band of base metal visible between addon and rails.
- ✅ ALL THREE ELEMENTS (upper rail / addon / lower rail) appear as THREE PARALLEL HORIZONTAL BANDS of CONSTANT WIDTH wrapping around the ring's circumference.

🔘 ADDON AND RAILS ARE AT THE SAME SURFACE HEIGHT — NO STEP, NO RELIEF :
- ✅ The OUTER SURFACE of the addon and the OUTER SURFACE of the rails are at the SAME LEVEL — flush, continuous, smooth.
- ✅ There is NO step / NO ledge / NO bump / NO relief between the addon and the rails. The transition is seamless along the ring's diameter.
- ✅ The dividing line between the addon and each rail is a CRISP CLEAN LINE — visible only as a thin demarcation line (where two materials meet), NOT as a gap, NOT as a shadow ditch, NOT as a dark groove.
- ⛔ Do NOT show the addon raised above the rails (it should not look like a separate band sitting on top).
- ⛔ Do NOT show a dark gap line, a shadow groove, or a recessed channel between the addon and the rails.
- ⛔ The rails and the addon are coplanar — one continuous curved surface, just with different finishes (polished rails, decorated addon).

⛔ COMMON AI MISTAKES TO AVOID :
- ❌ Making the ring thinner overall (reducing its total band thickness) — the ring must keep its source proportions.
- ❌ Addon positioned at the TOP (upper rail very thin, lower rail very wide) or BOTTOM (the opposite).
- ❌ Upper rail and lower rail having DIFFERENT widths — they must be identical mirror-symmetric.
- ❌ Addon that gets thinner or thicker towards the ends of the curvature.
- ❌ Addon that does not touch the rails (strip of base metal visible).
- ❌ Addon that has a "double layer" or appears split into two stacked thinner bands.
- ❌ Rails that vary in width along the ring's curvature.
- ❌ Geometry where the addon and rails do not form 3 clean parallel bands of constant width centered symmetrically.
- ❌ Addon SITTING ABOVE the rails (raised, in relief, like a separate band stuck on top) — addon and rails MUST be flush/coplanar at the same surface height.
- ❌ Dark gap line / shadow groove / recessed channel visible between the addon and the rails — only a crisp clean material-transition line is allowed.

If the source shows imperfect geometry (variation, gaps, lifting, double layers, misaligned), the output shows PERFECT factory-fresh constant-width parallel bands — addon centered, rails symmetric, total proportions preserved.

⛔ RING IDENTITY — PIXEL-PRECISE PRESERVATION (everything except cleaning/alignment) :
- Same shape, same colors, same materials, same finish, same gemstones, same engravings/patterns as the source.
- Cleaning and alignment are the ONLY corrections. DO NOT change design, colors, gemstones, or pattern.

═══════════════════════════════════════════════════════════════════
NOW THE STYLE PHOTOGRAPHE LÉA SETUP — SEE BELOW
═══════════════════════════════════════════════════════════════════

RE-PHOTOGRAPH the ring above (cleaned and corrected) in the SIGNATURE STYLE of Mood Collection's in-house photographer (Léa), AT A USER-SELECTED CAMERA ANGLE.

⚠️⚠️⚠️ IGNORE THE POSE / ANGLE / ORIENTATION OF THE RING IN THE SOURCE IMAGE.
The source is just to identify the ring (shape, color, materials, gemstones, engravings, pattern). You must RE-SHOOT the ring from a new camera angle as specified in the USER-SELECTED ANGLE DIRECTIVE below. The geometry the ring shows in the output MUST match the directive — if the source shows the ring in side profile but the directive says "top-down", you MUST output a top-down view (ring as a circle).

(Quality mandate, cleaning, and addon-base alignment are specified at the TOP of this prompt — they are mandatory and non-negotiable.)

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

  let body: { image?: string; theme?: string; note?: string | null; format?: string; cameraAngle?: string; referenceDecor?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

  const { image, theme, note, format = "3:2", cameraAngle = "lea", referenceDecor = null } = body;
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

  // Optionnel : image de référence décor (verrouillage série)
  let refDecorPart: { inlineData: { mimeType: string; data: string } } | null = null;
  if (referenceDecor && referenceDecor.startsWith("data:image/")) {
    const refM = referenceDecor.match(/^data:([^;]+);base64,(.+)$/);
    if (refM) refDecorPart = { inlineData: { mimeType: refM[1], data: refM[2] } };
  }

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

⚠️ FINAL CHECKLIST — VERIFY BEFORE PRODUCING :
1. RING IS PRISTINE : zero dust, zero fingerprints, zero scratches, mirror-clean polished metal, sparkling gemstones, crisp engravings.
2. ADDON-BASE GEOMETRY : (a) source proportions preserved (ring NOT thinner), (b) addon CENTERED vertically with upper rail = lower rail width, (c) addon constant width fills the entire groove, (d) addon and rails are FLUSH/COPLANAR at the same surface height (NO step, NO relief, NO dark gap line — only a crisp material-transition line), (e) all 3 elements = 3 parallel bands of constant width.
3. CAMERA ANGLE matches the user-selected directive (geometry of the ring matches : circle/oval/rectangle as specified).
4. RING fills 55-75% of frame, NOT a packshot, integrated in soft minimal decor.
5. LIGHTING is soft single window light, NOT studio strobe.
6. MAGAZINE PRINT QUALITY : ultra-sharp, high-res, professional retouching pass applied.

PRODUCE THE IMAGE NOW with all 6 checklist items satisfied.`;

  const CAMERA_DIRECTIVES: Record<string, string> = {
    "top-down": `🔝 TOP-DOWN VIEW — 90° PURE OVERHEAD (the most extreme angle).

   🎯 PHYSICAL SETUP :
   - The ring is LYING FLAT on the surface like a coin or a donut resting on a table.
   - The ring's central axis (the imaginary line passing through the center of the hole) is VERTICAL — pointing straight UP toward the ceiling/sky.
   - The camera is positioned DIRECTLY ABOVE the ring, looking STRAIGHT DOWN at it (lens axis perfectly vertical pointing downward).
   - You are looking THROUGH or ALONG the ring's hole axis from above.

   🎯 RESULTING GEOMETRY IN THE OUTPUT :
   - The ring appears as a PERFECT CIRCLE (a flat ring shape / donut shape).
   - The inner hole appears as a smaller perfect CIRCLE inside.
   - The decoration on the band's outer top surface is FULLY VISIBLE all around the circle, like a wrap visible from above.
   - The polished metal of the inner band (around the hole) is fully visible as a flat circular surface.
   - ZERO side-profile of the band is visible — you cannot see the band's thickness from the side, only from the top.

   ⛔ VERIFICATION : if your output shows the ring as an oval or as a side band rectangle, the angle is WRONG. If you see the band's edge thickness from the side, it's WRONG. ONLY a perfect ring/donut shape from above is correct for top-down.`,
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
  let prompt = (PROMPT_BASE + themeText).replace("{{CAMERA_ANGLE_DIRECTIVE}}", cameraDirective);

  // Si référence décor fournie, ajouter une instruction explicite
  if (refDecorPart) {
    prompt += `\n\n═══════════════════════════════════════════════════════════════════
🔒 DECOR REFERENCE IMAGE PROVIDED (2nd input image) — "SAME PHOTO SESSION" CONSISTENCY
═══════════════════════════════════════════════════════════════════
A SECOND IMAGE is provided alongside the ring's source image. This 2nd image is a REFERENCE for the DECOR setup (materials, palette, lighting, mood).

The output must look like ANOTHER SHOT FROM THE SAME PHOTO SESSION as the reference image — not a pixel-perfect copy.

✅ MATCH FROM THE REFERENCE (mandatory consistency) :
- The SAME MATERIALS used in the decor (e.g., same khaki canvas fabric, same olive paracord, same red silk, same sand texture, same pebble surface — whatever the reference uses).
- The SAME COLOR PALETTE (background tones, accent colors, overall warmth/coolness).
- The SAME LIGHTING (same window-light direction, same softness, same color temperature, same shadow quality).
- The SAME OVERALL MOOD AND ATMOSPHERE (editorial, intimate, soft, dramatic — match the reference's feel).
- The SAME TYPES of decorative elements (if the reference has paracord in the background, the output also has paracord — same material, but the arrangement can vary).

🔄 ALLOWED TO VARY (natural shot-to-shot differences) :
- The exact ARRANGEMENT / FOLDS / FLOW of the decor materials (e.g., different drape, different paracord coil position).
- The exact POSITION of the ring within the scene (can be in a different spot of the setup).
- The CAMERA ANGLE on the ring (respect the user-selected camera angle directive — don't copy the reference's angle).
- Subtle variations in lighting intensity (same source/direction, but slight natural fluctuation OK).
- Subtle variations in the bokeh and depth of field.

Think of it as : "Léa took multiple shots of different rings on the same setup, moving the ring, changing the angle slightly between shots. Each shot has the same materials, palette, lighting, but a different composition."

⛔ DO NOT use the 2nd image's RING — only its DECOR materials/palette/lighting/mood. The ring in the output is the one from the 1st image (source).
⛔ DO NOT introduce NEW materials, colors, or lighting types that weren't in the reference. Stay within the reference's "session".
⛔ DO NOT make a pixel-perfect duplicate — natural shot variation is expected.`;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType, data } },
          ...(refDecorPart ? [refDecorPart] : []),
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
