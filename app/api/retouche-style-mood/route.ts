import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

// Référence d'angle hardcodée par preset (nombre de variantes disponibles)
// NOTE : désactivé pour lea/face car Gemini fusionnait les designs des 2 bagues.
// L'angle est forcé via le prompt texte uniquement (descriptions géométriques précises).
const ANGLE_REFS_COUNT: Record<string, number> = {
  // "lea": 4,
  // "face": 9,
};

function loadAngleReference(cameraAngle: string): { inlineData: { mimeType: string; data: string } } | null {
  const count = ANGLE_REFS_COUNT[cameraAngle];
  if (!count || count < 1) return null;
  // Sélection aléatoire entre les variantes disponibles
  const idx = Math.floor(Math.random() * count) + 1;
  const refPath = path.join(process.cwd(), "public", "refs", "angles", `${cameraAngle}-${idx}.jpg`);
  if (!existsSync(refPath)) return null;
  try {
    const buffer = readFileSync(refPath);
    return { inlineData: { mimeType: "image/jpeg", data: buffer.toString("base64") } };
  } catch {
    return null;
  }
}

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

🚨🚨 PRIORITY #2 — ADDON-BASE STRUCTURE (the second most common failure)

A Mood Collection ring has a SPECIFIC structure that you MUST render correctly. Picture the ring band as 3 horizontal stripes wrapping around the ring (from top edge to bottom edge of the band) :

   ╔════════════════════════════════════╗ ← top edge of the band
   ║  UPPER POLISHED METAL STRIPE       ║ ← rail (constant width)
   ╠════════════════════════════════════╣
   ║                                    ║
   ║  DECORATED CENTRAL STRIPE (ADDON)  ║ ← addon (decoration / gemstones)
   ║                                    ║
   ╠════════════════════════════════════╣
   ║  LOWER POLISHED METAL STRIPE       ║ ← rail (constant width)
   ╚════════════════════════════════════╝ ← bottom edge of the band

CRITICAL CONSTRAINTS for these 3 stripes (output WILL be wrong without these) :

✅ ALL 3 STRIPES HAVE CONSTANT WIDTH from one end of the ring to the other (never tapering, never varying).
✅ UPPER RAIL = LOWER RAIL (mirror-symmetric widths) — the addon is centered between them.
✅ ADDON COMPLETELY FILLS the space between the rails. Its TOP edge touches the upper rail line. Its BOTTOM edge touches the lower rail line. NO empty band of metal between addon and rails.
✅ ADDON AND RAILS ARE FLUSH (same surface height). The outer surface of all 3 stripes is one continuous curve. NO step / NO bump / NO ledge / NO ridge between them. NO dark shadow groove between them — only a clean material-transition line where polish meets decoration.
✅ EVERYTHING IS WITHIN THE BAND. No part of the addon or rails extends beyond the top or bottom edge of the band's profile.

PICTURE IT THIS WAY : Imagine a cylinder (the ring band). Wrap 3 paper stripes around it — top rail, addon, bottom rail. The stripes touch edge-to-edge with no gaps, have uniform widths, and the surface is continuous. THAT is the correct structure.

If the addon overflows, has gaps, is raised in relief, has shadow grooves, or has variable width — YOU HAVE FAILED. Check before producing.

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

🔧 THE BASE RAILS — MUST BE NICKEL-MIRROR-POLISHED CLEAN (CRITICAL) :
- The two metal rails of the base (steel 316L or titanium) are POLISHED MIRROR FINISH — completely clean, completely flawless, completely free of any trace.
- ⛔ NO scratches, NO marks, NO traces, NO dust, NO smudges visible on the rails. They are PERFECT mirror surfaces.
- The rails reflect light cleanly with sharp specular highlights and smooth gradients — like a wedding band fresh from the polish.
- If the source shows scratched/marked/traced rails → output PRISTINE polished rails.

🎨 RING INTERIOR COLOR — MATCH THE BASE COLOR (Mood specificity) :
Mood Collection rings have specific anatomy for the inner band color :
- ✅ IF the base is COLORED (titanium anodized blue, pink, violet, gold, black, etc.) → the inner band of the ring (the polished interior visible through the hole) is the SAME COLOR as the outside of the base. Anodized titanium is colored all around — not just outside.
- ✅ IF the base is NEUTRAL STEEL 316L (silver-grey polished) → the inner band is silver polished steel.
- ⛔ DO NOT make the interior steel/silver when the base exterior is colored titanium. They MUST match.

💎 GEMSTONES sparkle clean and brilliant — no dust trapped under prongs, no fingerprint film.
🎯 ADDON (the decorated central band) is impeccable — every engraving line crisp, every gemstone setting clean, every color zone uniform.

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

⛔⛔⛔ RING IDENTITY — PIXEL-PRECISE PRESERVATION — ABSOLUTE TOP PRIORITY ⛔⛔⛔

You MUST output THE EXACT RING from the attached source image. Not a similar ring, not a simplified version, not an "improved" version — THE EXACT SAME RING.

📋 BEFORE GENERATING, LOOK CAREFULLY AT THE SOURCE IMAGE AND IDENTIFY :
- How many addon bands are visible? (1, 2, 3...) → output the EXACT same number.
- How many rows of pavé diamonds? (1 row, 2 rows, 4 rows...) → output the EXACT same count.
- How many gemstones in total? → output the EXACT same count.
- What is the exact pattern? (mountain peaks, hearts, geometric, abstract, etc.) → output the EXACT same pattern.
- What is the exact metal color? (silver, rose gold, yellow gold, titanium blue, anthracite...) → output the EXACT same color.
- What is the exact finish? (polished, brushed, satin, hammered, matte...) → output the EXACT same finish.
- What setting type? (pavé, channel, bezel, prong, flush-set...) → output the EXACT same setting.

⛔ ABSOLUTE BANS :
- DO NOT simplify the decoration. If source has 4 rows → output 4 rows. If source has 2 addon bands → output 2 addon bands. NEVER merge/combine bands.
- DO NOT reduce complexity. NEVER remove decoration elements.
- DO NOT reinterpret the design. NEVER replace one motif with another.
- DO NOT change colors, materials, or finishes.
- DO NOT change the number/arrangement/size of gemstones.
- DO NOT change pavé to engraving, or 3D relief to flat, or vice versa.

If the source ring has 2 different addon bands (e.g., one white textured + one gold pavé), you MUST output 2 different addon bands. If the source has multiple rows of small diamonds, you MUST output multiple rows of small diamonds. COUNT and PRESERVE every element.

Cleaning and alignment are the ONLY allowed corrections. Everything else = IDENTICAL.

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

3️⃣ COMPOSITION — EXTREME MACRO, RING TOUCHES THE FRAME EDGES
   - The ring is SO BIG it almost touches the top and bottom edges of the frame (or left/right depending on orientation).
   - Specifically: the ring's outer edges come within 2-5% of the frame edges on at least 2 sides (top+bottom, or left+right).
   - There is NO wide margin. NO "comfortable space". The ring is CROPPED TIGHT.
   - Think of it as : you zoomed in with your phone camera until the ring just barely fits in the frame with no space to spare.
   - Decor : only a TINY SLIVER visible at the corners — like a hint of fabric peeking from behind the ring.
   - 📏 Concrete test : if you can fit a SECOND ring of the same size in the frame next to the first one, the zoom is WRONG — too far. Crop tighter so only ONE ring fits with edges almost touching the frame.
   - Reference : Léa's tightest macro shots — the ring is HUGE and EATS the frame.
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

5️⃣ LIGHTING — LÉA SIGNATURE : warm window light + dramatic chiaroscuro
   - ONE soft DIFFUSED directional source from upper-left (or upper-right) at ~45° elevation.
   - The light is WARM (slight golden/tungsten warmth, like late morning sun through window glass) — not cold studio white.
   - Creates SOFT GRADIENT shadows : highlights wrap around the ring smoothly, shadows fall gradually into deep but readable darkness.
   - CHIAROSCURO MOOD : the lit side is luminous and bright, the shadow side is rich and deep but still has texture/detail visible. NOT flat lit, NOT pitch black.
   - The polished metal interior catches a SUBTLE soft reflection — a gentle gradient, NOT a hard mirror highlight.
   - Specular reflections on polished metal are SOFT and ROLLING (not sharp white hotspots, not blown-out).
   - Mood reference : think Léa's army3 / heart8 / large.paillettes2 shots — luxe magazine still-life, warm intimate, dramatic but gentle.

   ⛔ ABSOLUTE BANS ON LIGHTING :
   - NO hard studio strobe (sharp shadows with crisp edges).
   - NO ring-light (uniform front-lit, no shadows).
   - NO overhead clinical flat light (uniform from above, no drama).
   - NO hot blown-out specular hotspots on polished metal.
   - NO completely dark unlit shadows (always some detail visible in shadows).
   - NO cold blue-white sterile light (always warm or neutral).

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
- NO wide margin around the ring. The ring almost touches the frame edges (within 2-5%).
- NO "comfortable spacing" — this is extreme macro, the ring is HUGE in the frame.
- NO room for a second ring of the same size to fit in the frame — only ONE ring fits.
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

  let body: { image?: string; theme?: string; note?: string | null; format?: string; cameraAngle?: string; referenceDecor?: string | null; referenceAngle?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

  const { image, theme, note, format = "3:2", cameraAngle = "lea", referenceDecor = null, referenceAngle = null } = body;
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
  // Optionnel : image de référence d'angle (pose de la bague)
  let refAnglePart: { inlineData: { mimeType: string; data: string } } | null = null;
  if (referenceAngle && referenceAngle.startsWith("data:image/")) {
    const refM = referenceAngle.match(/^data:([^;]+);base64,(.+)$/);
    if (refM) refAnglePart = { inlineData: { mimeType: refM[1], data: refM[2] } };
  }
  // Si aucun upload utilisateur, charge la référence hardcodée du preset (si elle existe)
  if (!refAnglePart) {
    refAnglePart = loadAngleReference(cameraAngle);
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
4. RING is HUGE — its outer edges almost touch the frame edges on at least 2 sides (within 2-5%). Only ONE ring fits in the frame. Decor = tiny sliver at the corners.
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

  // Si référence d'angle fournie, instruction PRIORITAIRE avec labelling clair
  if (refAnglePart) {
    prompt = `🎯🎯🎯 MULTIPLE IMAGES PROVIDED — READ IDENTIFICATION CAREFULLY 🎯🎯🎯

You are receiving multiple images. Each has a SPECIFIC ROLE — do not confuse them.

⚠️ THE MOST COMMON FAILURE : using the wrong ring from the wrong image. DO NOT confuse the images. The ring you must photograph is IMAGE 1 (first attached). The other images are ONLY references for angle/decor.

💎 IMAGE 1 (FIRST attached) = THE RING TO PHOTOGRAPH ⭐ THIS IS THE RING
   → This is THE RING whose IDENTITY you must preserve EXACTLY : exact shape, exact colors, exact materials, exact gemstones, exact engravings, exact pattern.
   → THE OUTPUT MUST SHOW THIS EXACT RING. Not a similar ring, not the angle reference's ring, not the decor reference's ring — THIS RING.
   → IGNORE this ring's current pose/angle/orientation in the source — you will re-photograph it at IMAGE 2's angle.

📷 IMAGE 2 (SECOND attached) = ANGLE REFERENCE ONLY (do NOT use this ring)
   → Look at IMAGE 2 ONLY to understand the EXACT CAMERA ANGLE / RING POSE / framing / perspective.
   → COPY ONLY the angle/pose/perspective from IMAGE 2 in your output.
   → ⛔ DO NOT use IMAGE 2's ring design — that ring is NOT in the output.
   → ⛔ DO NOT use IMAGE 2's colors, materials, engravings, decoration — those are NOT in the output.
   → ⛔ DO NOT use IMAGE 2's lighting style — apply Léa's signature lighting instead.
   → ⛔ DO NOT use IMAGE 2's decor/background — use the theme or IMAGE 3 instead.

${refDecorPart ? `🖼️ IMAGE 3 (THIRD attached) = DECOR REFERENCE ONLY (do NOT use this ring)
   → Use ONLY the materials, palette, lighting mood, and background style from IMAGE 3 for your output's scene.
   → The actual arrangement can vary slightly (different fold, different angle of decor) — this is a "same photo session" consistency, not pixel-perfect copy.
   → ⛔ DO NOT use IMAGE 3's ring — that ring is NOT in the output.
   → ⛔ DO NOT change to NEW materials/colors that weren't in IMAGE 3 — stay within its visual world.
` : ""}

YOUR TASK :
- The RING IN THE OUTPUT = the ring from IMAGE 1 (preserved identity, pixel-precise).
- The CAMERA ANGLE in the output = the angle from IMAGE 2 (reproduced exactly).${refDecorPart ? `
- The DECOR / BACKGROUND in the output = same materials/palette/lighting as IMAGE 3.` : ""}

⛔ ABSOLUTE BAN : DO NOT swap rings. The output ring identity comes ONLY from IMAGE 1.${refDecorPart ? " The decor consistency comes ONLY from IMAGE 3." : ""} If you produce a ring that looks like IMAGE 2's ring (e.g., zebra-pattern rose gold when IMAGE 1 is a diamond mountain band, or vice versa), YOU HAVE FAILED.

═══════════════════════════════════════════════════════════════════

` + prompt;
  }

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
          // Ordre : bague source EN PREMIER (la plus prioritaire — son identité doit être préservée)
          // Puis angle ref, puis décor ref
          { inlineData: { mimeType, data } },
          ...(refAnglePart ? [refAnglePart] : []),
          ...(refDecorPart ? [refDecorPart] : []),
          { text: prompt },
        ] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: format, imageSize: "2K" },
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
