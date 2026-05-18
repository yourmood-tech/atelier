import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

// Référence d'angle hardcodée pour certaines actions (sélection aléatoire entre variantes)
// Référence d'angle hardcodée pour certaines actions
// NOTE : fond-blanc désactivé car Gemini fusionnait les designs des 2 bagues.
// L'angle est forcé via le prompt texte uniquement.
const ACTION_REFS: Record<string, { folder: string; count: number }> = {
  // "fond-blanc": { folder: "fond-blanc", count: 6 },
};

function loadActionReference(action: string): { inlineData: { mimeType: string; data: string } } | null {
  const ref = ACTION_REFS[action];
  if (!ref) return null;
  const idx = Math.floor(Math.random() * ref.count) + 1;
  const refPath = path.join(process.cwd(), "public", "refs", ref.folder, `fb-${idx}.jpg`);
  if (!existsSync(refPath)) return null;
  try {
    const buffer = readFileSync(refPath);
    return { inlineData: { mimeType: "image/jpeg", data: buffer.toString("base64") } };
  } catch {
    return null;
  }
}

const PROMPTS: Record<string, string> = {
  "fond-blanc": "Take THIS EXACT RING from the attached image and place it on a pure white catalog background, in Mood Collection signature catalog pose. Pixel-precise design preservation is the #1 priority.\n\n⛔ THE RING'S DESIGN MUST BE PRESERVED EXACTLY — IDENTICAL, PIXEL-PRECISE.\n- Same EXACT shape and silhouette.\n- Same EXACT colors and materials (steel, titanium, aluminum, gold, etc.).\n- Same EXACT decoration : count and preserve every single decoration element. If the ring has 4 rows of pavé diamonds, output 4 rows. If it has 26 gemstones, output 26 gemstones. If it has engraved mountain peaks with diamonds inside, output mountain peaks with diamonds inside.\n- Same EXACT pattern, motif, gemstones, prongs, engravings, surface finish.\n- DO NOT simplify the decoration. DO NOT reduce the number of rows / gemstones / details. DO NOT reinterpret a 3D relief as flat engraving. DO NOT change pavé to channel-set. DO NOT remove design elements to simplify.\n- DO NOT redesign anything. If you cannot perfectly reproduce a decoration element, copy it EXACTLY from the source rather than approximating.\n\n📐 ANGLE & FRAMING — Mood catalog signature :\n- Camera at near eye-level with a slight downward tilt (about 10-15° plunge).\n- The ring is laid flat horizontally on the (invisible) surface.\n- The ring is slightly tilted in 3/4 perspective so you can see :\n  · The decorated outer band-surface on TOP (visible in slight foreshortening).\n  · The polished inner hole as a HORIZONTAL OVAL visible on the right side (or left, your choice based on which side of the ring is most informative).\n  · A hint of the side profile at the front.\n- Format: SQUARE 1:1.\n- The ring fills 85-95% of the frame width, centered.\n\n✂️ PIXEL-PRECISE CUTOUT on PURE WHITE :\n- 100% pure white background (#FFFFFF) — exactly RGB 255,255,255. NOT gray, NOT off-white, NOT cream.\n- Cut at the EXACT pixel boundary of the ring. No fuzzy edge, no halo, no colored fringe, no semi-transparent pixels.\n- Preserve every intricate detail: engravings, gemstones, prongs, small openings, the inner ring hole (background shows through it as pure white).\n- NO cast shadow on the (invisible) surface. The ring's own 3D self-shadow (modeling the band's volume) stays.\n\n✨ CLEANING (apply during the re-photograph) :\n- Remove all dust, lint, fingerprints, scratches, surface marks, fluff, water spots, residues, oily traces.\n- 🔧 THE BASE RAILS (the two polished metal stripes flanking the addon) must be NICKEL-MIRROR-POLISHED CLEAN — completely flawless, like a wedding band fresh from the final polish. ZERO scratches, ZERO marks, ZERO traces, ZERO dust visible on the rails. Sharp specular highlights and smooth gradients.\n- Gemstones sparkle clean and brilliant.\n- ⛔ Cleaning does NOT mean redesigning. Only remove parasites (dust, scratches, dirt) — never alter the design.\n\n🎨 INTERIOR COLOR MATCH (Mood ring specificity) :\n- IF the base of the source ring is COLORED (titanium anodized blue, pink, violet, gold, black, etc.) → the inner band of the ring visible through the hole is the SAME COLOR as the outer base. Anodized titanium is colored all around.\n- IF the base is NEUTRAL STEEL 316L → the inner band is silver polished steel.\n- DO NOT make the interior steel/silver when the base exterior is colored titanium. They MUST match.\n\n🎯 ADDON-BASE STRUCTURE (Mood ring anatomy) :\n- The addon (decorated central band) fills the ENTIRE central groove between the two polished metal rails of the base.\n- No overflow beyond rails, no gaps between addon and rails.\n- Addon and rails are FLUSH at the same surface height (no relief / no step / no shadow groove).\n- Addon has uniform width along the entire visible length.\n- Upper rail = lower rail (mirror-symmetric widths, addon centered vertically).\n\n💡 Lighting : even soft studio illumination, subtle gradient reflections on polished metal — no harsh hotspots, no flat ringlight, just clean even product light revealing every design detail.\n\n📏 Ring proportions identical to source — same overall band thickness, same width balance between rails and addon.\n\n⛔ ABSOLUTE BANS :\n- NO gray/off-white/cream background.\n- NO cast shadow on the surface.\n- NO redesigning, simplifying, or reinterpreting the ring's decoration.\n- NO reduction in the number/complexity of design elements.\n- NO changes to gemstones, materials, colors, or engravings.",
  "fond-anthracite": "Place this subject on a clean, uniform anthracite dark gray background (color hex #292928, the same dark studio background used in Mood Collection product photography). Keep the subject exactly as is — same colors, lighting, shadows, position and composition. Only the background is replaced with the uniform anthracite color. Professional packshot style, centered, studio lighting feel.",
  "amelioration": "Professional packshot retouching of this Mood Collection ring photo. Generate a CLEANED and STRAIGHTENED version with the following corrections:\n\n1. CLEAN ALL IMPERFECTIONS on the ring surface : dust particles, fingerprints, fine scratches, surface marks, lint fibers, smudges, micro-stains. The ring must look pristine and brand new, as if it just came out of the factory polishing stage.\n\n2. STRAIGHTEN THE RING : if it's tilted or off-axis, rotate it gently so it sits perfectly aligned with the natural horizontal/vertical of the photo. Center it in the frame with comfortable margins on all sides.\n\n3. ENHANCE THE METAL/MATERIAL : preserve and highlight the natural texture (brushed, polished, anodized, etc.), keep faithful colors, boost contrast subtly to make edges crisp, sharpen reflective highlights without overdoing it.\n\n4. KEEP IDENTICAL : the background, the lighting direction, the overall composition style, the ring identity (same shape, same color, same material, same finish, same gemstones).\n\nThe result must look like a professional jewelry photographer just retouched it for a high-end e-commerce listing. Output the cleaned and straightened image, not the original.",
  "lumiere-contraste": "HIGH-QUALITY PROFESSIONAL ENHANCEMENT of this Mood Collection ring photo for luxury jewelry magazine quality. Apply the following corrections on the WHOLE image :\n\n1. LIGHTING : significantly improve exposure dynamics, recover shadow details, control highlights, add a subtle directional studio lighting feel. The ring should have crisp, well-defined highlights and rich, deep shadows for a 3D feel.\n\n2. CONTRAST : boost contrast clearly — deep blacks, bright whites, full tonal range. Avoid flat washed-out look.\n\n3. CLEAN PARASITES EVERYWHERE — both on the ring AND in the surrounding decor/background : dust particles, fingerprints, fine scratches, lint, fibers, hair strands, marks, smudges, micro-stains. The surface, fabric, support, background must look pristine.\n\n4. CLEAN DECOR IMPERFECTIONS : fix any wrinkles in fabric, dirt on surface, color inconsistency in background, dust on plant leaves, water spots, smudges on glass, any visual distraction.\n\n5. INCREASE SHARPNESS and clarity selectively on the ring edges and gemstones for that high-end magazine look.\n\n6. KEEP IDENTICAL : composition, ring identity, decor style, color palette intent.\n\nResult : a high-end luxury jewelry photography look, ready for a glossy magazine or a high-end e-commerce hero shot. Output the enhanced image.",
  "theme-printemps": "TRANSFORM the surroundings of this Mood Collection ring into an ELEGANT SPRING LUXURY scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nSpring decor :\n- Soft sakura cherry blossom petal shadows playing on the surface around the ring (silhouettes, not actual petals — like sunlight filtering through cherry blossoms casting delicate shadow patterns)\n- A few real sakura petals scattered subtly around the ring (pale pink, cream)\n- Soft warm MORNING LIGHT (golden hour just after sunrise, warm but not overly golden — fresh and gentle)\n- Light pastel palette in shadows : pale pink, cream, light peach, soft white\n- A subtle hint of out-of-focus spring greenery in the deep background (bokeh, very soft)\n- High-end luxury jewelry magazine style, like a Tiffany or Cartier spring campaign\n- Clean surface (no dust, no parasites)\n\nResult : a luxe spring editorial shot, the ring as the hero, sakura ambiance subtle and elegant. Output the transformed image.",
  "theme-ete": "TRANSFORM the surroundings of this Mood Collection ring into an ELEGANT SUMMER LUXURY scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nSummer decor :\n- Warm golden hour light (late afternoon, rich amber tones)\n- Subtle sandy/sun-bleached texture on the surface (suggested, not explicit — like fine pale sand or warm linen)\n- Soft palm leaf or tropical foliage shadows playing across the scene (silhouettes, dappled light)\n- A few subtle elements : maybe one delicate seashell or a single small pebble nearby, very subdued\n- Warm color palette : honey, cream, beige, soft coral, pale gold\n- Out-of-focus warm bokeh in deep background suggesting an outdoor summer setting\n- High-end luxury jewelry magazine style, like a summer campaign\n- Clean surface (no dust, no parasites)\n\nResult : a luxe summer editorial shot, the ring as the hero, vacation/sun-kissed ambiance subtle and elegant. Output the transformed image.",
  "theme-automne": "TRANSFORM the surroundings of this Mood Collection ring into an ELEGANT AUTUMN LUXURY scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nAutumn decor :\n- A few real autumn leaves scattered around the ring (subtle, not cluttering) : warm terracotta, ochre, burnt orange, golden yellow — fall colors\n- Soft warm afternoon light, slightly low-angle, casting long gentle shadows\n- A hint of cozy texture nearby (warm wool, cashmere, linen in autumn tones)\n- Rich warm color palette : terracotta, ochre, burnt umber, deep ruby, golden brown\n- Out-of-focus warm bokeh in deep background suggesting indoor cozy autumn setting\n- High-end luxury jewelry magazine style, like a fall campaign\n- Clean surface (no dust, no parasites)\n\nResult : a luxe autumn editorial shot, the ring as the hero, cozy fall ambiance subtle and elegant. Output the transformed image.",
  "theme-hiver": "TRANSFORM the surroundings of this Mood Collection ring into an ELEGANT WINTER LUXURY scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nWinter decor :\n- Subtle frost or fine snow crystals texture on the surface around the ring (delicate, not heavy)\n- Cool soft light (overcast winter daylight or warm candle light contrasting with cool tones)\n- Cool color palette in highlights : icy white, pale blue, silver, soft pearl — with optional warm candle/golden contrast accent\n- A few subtle elements : maybe a sprig of evergreen (pine, eucalyptus) or a small frost-bitten branch, very subdued\n- Out-of-focus cool bokeh in deep background suggesting winter ambiance\n- High-end luxury jewelry magazine style, like a winter campaign\n- Clean surface (no dust, no parasites)\n\nResult : a luxe winter editorial shot, the ring as the hero, crisp winter ambiance subtle and elegant. Output the transformed image.",
  "theme-terre-dombre": "TRANSFORM the surroundings of this Mood Collection ring into a JACQUEMUS-STYLE TERRE D'OMBRE LUXURY EDITORIAL scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nTerre d'ombre — Jacquemus-inspired editorial decor :\n- Setting : contemporary Mediterranean architecture — terracotta clay walls with textured warm-sand plaster (enduit texturé couleur sable chaud), simple sculptural architectural volumes (a corner, a step, an arch fragment, a niche, a raw clay ledge).\n- Light : LATE AFTERNOON GOLDEN LIGHT entering FROM THE SIDE (low-angle, ~25-40° from horizontal), warm and dramatic — like the last hour before sunset in a Provence/Greek island/Moroccan courtyard.\n- Shadows : DEEP, GRAPHIC, BOLD shadows projected on the surfaces — clear hard-edged shadow shapes (Jacquemus signature). HIGH CONTRAST between brightly-lit warm zones and deep shadow zones (some areas fully sunlit warm cream, others sinking into deep brown/black shadow).\n- Color palette : warm terracotta, sand beige, burnt sienna, warm brown, ochre, copper — with DEEP BLACK / dark brown shadows. NO white seamless studio backdrop.\n- Mood : cinematic, editorial, elegant, mysterious, artisanal, raw yet refined.\n- Style references : Jacquemus summer campaign, Loewe earth-tone editorial, Bottega Veneta minimalist sculptural, raw Mediterranean luxe.\n- Materials in the scene : raw natural textures — unglazed clay, sand plaster, smooth warm stone, possibly a subtle out-of-focus natural linen drape in the deep background.\n- Surface where the ring sits : a raw terracotta step / sand-plaster ledge / warm clay architectural element catching the golden light and casting a clean bold shadow.\n- NO literal sand, NO palm trees, NO sea, NO landscape — the decor is SCULPTURAL ARCHITECTURE, not nature.\n- Composition : minimalist, sculptural, sophisticated — the ring as hero, decor as elegant geometric play of light and shadow on warm earthen surfaces.\n- Clean ring surface (no dust, no parasites).\n\nResult : a luxe terre-d'ombre editorial shot in the visual language of a Jacquemus summer campaign — the ring as the hero on a warm clay/terracotta surface, dramatic side-lit golden light, deep graphic shadows, sophisticated minimalist composition. Output the transformed image.",
  "coffret": "MOOD COFFRET PRESENTATION — Re-photograph THIS EXACT RING placed inside a Mood Collection presentation coffret, in the signature Mood coffret photography style. Pixel-precise design preservation is mandatory.\n\n⛔ THE RING'S DESIGN MUST BE IDENTICAL TO THE SOURCE :\n- Same exact shape, colors, materials, finish, gemstones, engravings, pattern.\n- Count and preserve every decoration element (rows of pavé, gemstones, addon bands, motifs).\n- DO NOT simplify, redesign, reinterpret, or remove any design element.\n- If base is colored titanium (anodized blue, pink, violet, gold, black) → interior is the SAME color (titanium is anodized all around). If base is steel 316L → interior is polished silver steel.\n\n📐 ANGLE & FRAMING (Mood coffret signature — ORIENTATION LOCKED) :\n- Camera at near eye-level with a slight downward tilt (~5-15° plunge).\n- 🚨 ORIENTATION RULE (NON-NEGOTIABLE — ALWAYS THE SAME WAY, every coffret photo identical orientation) :\n  • The ring is STANDING UPRIGHT ON ITS BOTTOM EDGE on the white leatherette cushion (like a tire standing on the ground — NOT lying flat, NOT tilted on its side).\n  • The circular axis of the ring is HORIZONTAL : the ring opening (hole) faces toward the RIGHT side of the frame.\n  • The DECORATED / COLORED OUTER BAND surface is fully visible on the LEFT-FRONT, facing the camera.\n  • The POLISHED SILVER INTERIOR (inner hole) is visible on the RIGHT as a soft oval opening catching the light.\n  • Subtle 3/4 angle : outer band curves from front-left toward back-right, like looking at the side profile of a wheel from slightly in front.\n- The ring is in CRISP SHARP FOCUS at the front-center where the decorated band is most visible.\n- Format: SQUARE 1:1.\n- 🔍 RING SIZE — THE RING IS BIG, FILLING THE FRAME : the ring fills 85-95% of the frame WIDTH (the ring is wider than tall because it stands on its edge horizontally). The ring almost TOUCHES the left and right edges of the frame (within 2-5% margin). Only a thin strip of cushion is visible above and below. The cushion/coffret background is BARELY visible — the ring DOMINATES the composition. Hero shot, generous zoom — NOT a small object floating in a big empty cushion.\n\n📊 ASCII ORIENTATION SCHEMATIC (the EXACT orientation expected — every shot identical) :\n         _________\n        / DECORATED \\\\    ← outer band (colored/decorated) on LEFT\n       |  OUTER     |\n       |  BAND      |  )   ← polished silver interior opening on RIGHT\n       |  (front)   |\n        \\\\___________/\n        ─────────────       ← ring stands on its bottom edge on white cushion\n\n🪞 COFFRET BACKGROUND & SURFACE (CRITICAL — the Mood signature setting) :\n- The ring is placed inside an OPEN MOOD COFFRET (presentation box) made of soft padded white leatherette (skai blanc capitonné).\n- The surface is SOFT WHITE / OFF-WHITE LEATHERETTE with subtle quilted/padded relief — gentle curves, soft cushion-like texture visible but blurred.\n- Background : SLIGHTLY OUT-OF-FOCUS continuation of the white leatherette interior of the coffret. The atmosphere is calm, premium, clean.\n- No other props, no logos, no text. Just the coffret interior.\n\n💡 LIGHTING — soft diffused window light from the side :\n- ONE soft diffused light source from the upper-left at ~45° angle.\n- Creates a gentle highlight on the upper edge of the ring, soft gradient shadow on the lower-right side.\n- The polished metal of the inner band catches subtle reflections.\n- Mood : calm, intimate, like a jewelry presentation box opened in soft daylight.\n- NO harsh studio strobe, NO hotspots, NO ringlight, NO flat overhead.\n\n✨ CLEANING (pristine quality) :\n- Remove all dust, lint, fingerprints, scratches, surface marks, fluff, water spots, residues, oily traces.\n- 🔧 The base rails (polished metal stripes flanking the addon) must be NICKEL-MIRROR-POLISHED — flawless, no scratches, no marks, no traces.\n- Polished metal surfaces are MIRROR-CLEAN with crisp clean reflections.\n- Gemstones sparkle clean and brilliant.\n\n🎯 ADDON-BASE STRUCTURE :\n- Addon fills the entire central groove between rails, no overflow, no gaps, flush at the same surface height.\n- Addon uniform width along the entire visible length.\n- Upper rail = lower rail (mirror-symmetric, addon centered).\n\n⛔ ABSOLUTE BANS :\n- NO redesigning, simplifying, or reinterpreting the ring's decoration.\n- NO white seamless studio background — must be the textured coffret interior.\n- NO hands, no people, no other objects.\n- NO logos, no text.",

  "bague-portee": "Transform this Mood Collection ring photo into a HIGH-END EDITORIAL CLOSE-UP photograph of the ring BEING WORN on a hand, in the style of a luxury jewelry magazine campaign (Cartier / Tiffany / Bvlgari aesthetic).\n\n1. THE RING : keep it absolutely identical to the source — same shape, same colors, same material, same finish, same gemstones, same engravings if any, same proportions. The ring is the hero of the photo, perfectly sharp, well-lit.\n\n2. HAND (default if no user specification) : elegant feminine hand, well-manicured nails (subtle clean french or natural color), tan/olive skin tone, no jewelry on other fingers that distracts. Soft natural pose : the hand can be resting against the opposite arm, near the collarbone/jawline, close to the face partially veiling it, or naturally on a soft surface.\n\n3. OUTFIT in soft background focus : a simple white t-shirt OR cream/beige cashmere sweater OR delicate black blazer — never the main attention, always supportive.\n\n4. CADRAGE : tight close-up on the ring + hand, the ring takes 30-50% of frame, perfect focus on the ring (sharp), shallow depth of field (background blurred), warm directional studio light flattering the skin.\n\n5. LIGHTING : soft, warm, slightly directional — like a beauty shot. Catches the ring's highlights beautifully. Skin looks healthy and glowing.\n\n6. BACKGROUND : neutral, soft-focused, supportive of the ring (e.g., out-of-focus skin/clothing/wall). No distracting elements, no clutter, no logo, no text.\n\n7. STYLE : high-end editorial, magazine-grade, sophisticated, intimate, contemporary. Like an Instagram post from a luxury jewelry house.\n\nIf the user provides specific instructions (skin tone, nail style, hand pose, outfit, framing) in the additional instructions section, FOLLOW THEM PRECISELY as override of the defaults above. The ring stays the absolute hero. Output the worn-ring editorial photograph.",
  // Multi-formats : reframe pour un ratio précis
  "multi-1-1": "Recompose this image for a 1:1 square aspect ratio (Instagram post). Keep the main subject perfectly centered and well-framed. Extend the background intelligently (matching its existing style, color, texture and lighting) to fit the new square dimensions. The subject stays exactly the same.",
  "multi-4-5": "Recompose this image for a 4:5 portrait aspect ratio (Instagram feed portrait). Keep the main subject perfectly centered, with comfortable margin top and bottom. Extend the background intelligently (matching its existing style and lighting) to fit the new portrait dimensions. Subject preserved.",
  "multi-9-16": "Recompose this image for a 9:16 vertical aspect ratio (Instagram Story / Reel / TikTok). Keep the main subject perfectly centered, with extra space top and bottom. Extend the background intelligently (matching existing style, lighting, gradient) to fit the new tall portrait dimensions. Subject preserved.",
  "multi-16-9": "Recompose this image for a 16:9 landscape aspect ratio (Facebook cover, web banner). Keep the main subject centered with comfortable space on left and right. Extend the background intelligently (matching existing style and lighting) to fit the new wide dimensions. Subject preserved.",
};

const RATIOS: Record<string, string> = {
  "fond-blanc": "1:1",
  "fond-anthracite": "1:1",
  "amelioration": "1:1",
  "lumiere-contraste": "1:1",
  "theme-printemps": "1:1",
  "theme-ete": "1:1",
  "theme-automne": "1:1",
  "theme-hiver": "1:1",
  "theme-terre-dombre": "1:1",
  "bague-portee": "1:1",
  "coffret": "1:1",
  "multi-1-1": "1:1",
  "multi-4-5": "4:5",
  "multi-9-16": "9:16",
  "multi-16-9": "16:9",
};

// Thèmes globaux — overlay ajouté à n'importe quel prompt d'action quand l'utilisateur sélectionne un thème en haut
const THEME_OVERLAYS: Record<string, string> = {
  "tropical": `

═══════════════════════════════════════════
🎨 GLOBAL THEME OVERRIDE — "TROPICAL" (luxe végétal sombre, Jacquemus / Saint Laurent tropical)
═══════════════════════════════════════════

Apply this ambiance to the scene composed above. The theme REPLACES the default neutral lighting / background / palette, but PRESERVES the action's core composition (which subject is photographed, framing, ring centrality).

VISUAL DIRECTION :
- Setting : LUSH DARK TROPICAL VEGETATION — large satin-finished tropical leaves (monstera, philodendron, banana leaves) in deep forest green, dark olive, vegetal black. Atmosphere humid, organic, mysterious.
- Light : DRAMATIC DIRECTIONAL LIGHT (low-angle natural sunlight piercing through foliage), creating intense shadow zones + precise highlights on the leaves' satin surface and on the metal/stones of the ring.
- Shadows : deep, sharp, graphic — high contrast between sunlit zones and shadow zones of vegetation.
- Color palette : deep forest green, dark olive, vegetal black, with subtle GOLDEN warm reflections accenting the leaves' satin texture and the ring's metal. NO white/pastel backdrop.
- Mood : organic luxury, mysterious, silent, contemplative, sophisticated humidity, cinematic premium.
- Style references : Jacquemus tropical campaign, Saint Laurent jungle editorial, Zara Studio premium, Bottega vegetal high-end jewelry shoot.
- Decor accents (subtle, MAX 1-2 elements) : a curved leaf where the ring rests, a few water droplets on leaves or on the ring's stones, soft out-of-focus deeper vegetation in background — NEVER cluttered, focus stays on the jewelry.
- Composition : ultra-minimalist within the lush vegetal setting, lots of dark out-of-focus negative space (deep shadowy foliage), the ring is the bright focus point.
- Depth of field : SHORT (shallow DOF), dark blurred background of distant leaves, sharp foreground on the ring + immediate leaf it rests on.

ACTION-SPECIFIC ADAPTATIONS :
- IF the action is a WORN-RING shot (hand / body model) : an ELEGANT woman in a sophisticated tropical setting, surrounded by large deep-green leaves and luxuriant natural textures. NATURAL LUMINOUS SATIN SKIN. Minimalist but modern fashion stylism : open-knit / crochet mesh, fluid natural fabric, modern silhouettes. Hair styled naturally. Warm contrasted light creates strong graphic shadows on the skin. Tones : forest green, olive, vegetal black, subtle gold light. Composition aesthetic and premium, Jacquemus/Saint Laurent tropical mood — mysterious, sensual, refined, NOT kitsch or excessive glamour.
- IF the action is a COFFRET / BOX shot : the white leatherette coffret sits on or near tropical leaves, warm contrasted directional light catches both the coffret and the surrounding deep vegetation, dark blurred jungle background.
- IF the action is a STUDIO / OBJECT shot (Fond blanc, Fond anthracite, Amélioration, Lumière contraste, Style photographe Mood) : replace the neutral background with a large satin tropical leaf or layered dark green foliage, ring resting on a curved leaf or floating in front, dramatic directional natural light, water droplets optional on the leaf.
- The ring itself is NEVER modified — same shape, color, material, finish, gemstones.

🔍 FRAMING — RING IS THE HERO, BIG IN THE FRAME (CRITICAL) :
- The ring DOMINATES the composition — it fills 70-85% of the frame width.
- This is a TIGHT MACRO / CLOSE-UP shot, like a luxury jewelry magazine product hero shot. NOT a wide vegetal scene with a small ring inside.
- The tropical leaves / dark foliage are a SUPPORTING BACKDROP, occupying ONLY the corners, edges, and negative space around the ring.
- The ring is the absolute focus subject — perfectly sharp, perfectly lit, with crisp golden highlights on metal and stones.
- For worn-ring shots : the ring + hand + portion of skin/fabric near the ring fill the frame ; the model's body, leaves, and tropical context are supporting, partially out of frame, soft-focused — the RING REMAINS THE HERO.
- Camera : zoom in tight, macro precision on the ring details. Background vegetation is silent luxury organic, never competing.`,

  "terre-olive": `

═══════════════════════════════════════════
🎨 GLOBAL THEME OVERRIDE — "TERRE OLIVE" (Jacquemus / Bottega editorial — silent luxury)
═══════════════════════════════════════════

Apply this ambiance to the scene composed above. The theme REPLACES the default neutral lighting / background / palette, but PRESERVES the action's core composition (which subject is photographed, framing, ring centrality).

VISUAL DIRECTION :
- Setting : ultra-minimalist editorial backdrop — uniform textured surface in soft OLIVE / warm BEIGE SAND / IVORY tones (smooth plaster, raw paper, matte wall). Just one calm tone.
- Light : LATE AFTERNOON NATURAL DIRECTIONAL LIGHT from the side, warm and cinematographic, creating DEEP GRAPHIC SHADOWS on the surface.
- Shadows : signature Jacquemus / Bottega — bold hard-edged shadow shapes projected on the backdrop. High contrast between sunlit zones and shadow zones. Often a SOFT BLURRED LEAF SHADOW or vegetal silhouette in the background acts as the only decorative element.
- Color palette : olive doux / muted olive green, warm beige sand, ivory, warm cream, soft brown — with deep shadow zones. NO white seamless studio backdrop.
- Mood : SILENT LUXURY, calm, organic, modern, cinematic, contemplative, sophisticated minimalism.
- Style references : Jacquemus campaign, Bottega Veneta editorial, Khaite minimal, The Row silent luxury, high-end jewelry magazine.
- Decor accent (subtle, blurred, MAX ONE element per shot) : an out-of-focus leaf, a vegetal shadow on the wall, a smooth matte surface with relief, a water reflection, or just a play of light. NEVER cluttered.
- Composition : ULTRA MINIMALIST, lots of negative space, total focus on the jewelry.

ACTION-SPECIFIC ADAPTATIONS :
- IF the action is a WORN-RING shot (hand / body model) : the model is ASIAN, with LONG SMOOTH BLACK HAIR, BARE SHOULDER VISIBLE, wearing a FLUID FLOWING WHITE COTTON BLOUSE (like a soft scarf — drape, soft movement, off-shoulder). NATURAL CLEAN MANICURE (subtle nude polish). Skin lit warmly by late afternoon directional light, deep graphic shadows on the body and blouse. Hand gracefully posed near the collarbone / shoulder, the RING is the absolute focus. Hair drapes naturally on one side.
- IF the action is a COFFRET / BOX shot : the coffret interior catches warm directional light, deep clean shadow on one side of the box, olive/beige tinted highlights. White leatherette interior is still white but warmly lit.
- IF the action is a STUDIO / OBJECT shot (Fond blanc, Fond anthracite, Amélioration, Lumière contraste, Style photographe Mood) : replace the neutral background with a textured olive / beige / ivory wall surface, optional out-of-focus leaf shadow on the wall, ring resting on a matching matte surface in the foreground, warm directional side light, deep graphic shadow cast by the ring.
- The ring itself is NEVER modified — same shape, color, material, finish, gemstones.

🔍 FRAMING — RING IS THE HERO, BIG IN THE FRAME (CRITICAL) :
- The ring DOMINATES the composition — it fills 70-85% of the frame width.
- This is a TIGHT MACRO / CLOSE-UP shot, like a luxury jewelry magazine product hero shot. NOT a wide editorial portrait with a small ring inside.
- The olive/beige decor is a SUPPORTING BACKDROP, occupying ONLY the corners, edges, and negative space around the ring.
- The ring is the absolute focus subject — perfectly sharp, perfectly lit.
- For worn-ring shots : the ring + hand + portion of skin/blouse near the ring fill the frame ; the model's body/shoulder/hair are supporting, partially out of frame, soft-focused — the RING REMAINS THE HERO.
- Camera : zoom in tight on the ring. The decor is silent luxury minimalism, never competing.`,

  "terre-dombre": `

═══════════════════════════════════════════
🎨 GLOBAL THEME OVERRIDE — "TERRE D'OMBRE" (Jacquemus editorial)
═══════════════════════════════════════════

Apply this ambiance to the scene composed above. The theme REPLACES the default neutral lighting / background / palette, but PRESERVES the action's core composition (which subject is photographed, framing, ring centrality).

VISUAL DIRECTION :
- Setting : contemporary Mediterranean architecture — terracotta clay walls with textured warm-sand plaster, simple sculptural architectural volumes (corner / step / arch fragment / niche / raw clay ledge).
- Light : LATE AFTERNOON GOLDEN LIGHT entering from the SIDE (low-angle, ~25-40° from horizontal), warm and dramatic — like the last hour before sunset in a Provence / Greek island / Moroccan courtyard.
- Shadows : DEEP, GRAPHIC, BOLD shadows projected on surfaces (hard-edged shadow shapes — Jacquemus signature). HIGH CONTRAST between brightly-lit warm zones and deep shadow zones (some areas fully sunlit warm cream, others sinking into deep brown / black shadow).
- Color palette : terracotta, sand beige, burnt sienna, warm brown, ochre, copper — with DEEP BLACK / dark brown in shadows. NO white seamless studio backdrop, NO cool studio strobes.
- Mood : cinematic, editorial, elegant, mysterious, artisanal, raw yet refined.
- Style references : Jacquemus summer campaign, Loewe earth-tone editorial, Bottega Veneta minimalist sculptural, raw Mediterranean luxe.

ACTION-SPECIFIC ADAPTATIONS :
- IF the action is a WORN-RING shot (hand / body model) : the model has BRONZED/TAN skin, bare shoulder visible, golden side light grazes the shoulder / collarbone / arm, deep graphic shadows fall across the skin and body. Hair and pose remain editorial. Drape of natural linen / silk in warm tones if visible.
- IF the action is a COFFRET / BOX shot : the coffret interior catches warm golden side light, deep shadows on one side of the box, terracotta-tinted highlights instead of cool studio light. White leatherette interior is still white but warmly lit.
- IF the action is a STUDIO / OBJECT shot (Fond blanc, Fond anthracite, Amélioration, Lumière contraste, Style photographe Mood) : replace the neutral background with terracotta clay surface / sand plaster ledge, golden side light, bold shadow cast by the ring on the warm clay.
- The ring itself is NEVER modified — same shape, color, material, finish, gemstones.

🔍 FRAMING — RING IS THE HERO, BIG IN THE FRAME (CRITICAL) :
- The ring DOMINATES the composition — it fills 70-85% of the frame width.
- This is a TIGHT MACRO / CLOSE-UP shot, like a luxury jewelry magazine product hero shot. NOT a wide architectural shot with a small ring inside.
- The terracotta architecture / clay decor is a SUPPORTING BACKDROP, occupying ONLY the corners, edges, and negative space around the ring.
- The ring is the absolute focus subject — perfectly sharp, perfectly lit.
- For worn-ring shots : the ring + hand + portion of skin near the ring fill the frame ; the model's body/shoulder are supporting, partially out of frame, soft-focused — the RING REMAINS THE HERO.
- Camera : zoom in tight on the ring. If a wider context is shown, the ring still dominates ; never let the decor take over the frame.`,
};

async function appelGemini(imageDataUrl: string, action: string, note?: string | null, formatOverride?: string | null, theme?: string | null): Promise<{ image?: string; error?: string }> {
  const basePrompt = PROMPTS[action];
  if (!basePrompt) return { error: `Action inconnue : ${action}` };
  // Overlay thème global (si actif) — modifie l'ambiance/lumière/palette de l'action
  const themeOverlay = (theme && THEME_OVERLAYS[theme]) ? THEME_OVERLAYS[theme] : "";
  let prompt = basePrompt + themeOverlay;
  if (note && note.trim()) {
    prompt += `\n\n=== INSTRUCTIONS SUPPLÉMENTAIRES DE L'UTILISATEUR (à respecter en priorité) ===\n${note.trim()}`;
  }
  const aspectRatio = (formatOverride && /^\d+:\d+$/.test(formatOverride)) ? formatOverride : (RATIOS[action] || "1:1");

  // Extraire mimeType et data depuis dataUrl
  const m = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { error: "Image invalide (doit être data:image/...;base64,...)" };
  const mimeType = m[1];
  const data = m[2];

  // Ordre : bague source EN PREMIER (IMAGE 1 = identité préservée),
  // puis référence d'angle si présente (IMAGE 2 = angle uniquement)
  const refPart = loadActionReference(action);
  const parts = refPart
    ? [{ inlineData: { mimeType, data } }, refPart, { text: prompt }]
    : [{ inlineData: { mimeType, data } }, { text: prompt }];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio, imageSize: "2K" },
        },
      }),
    });
    const respText = await r.text();
    let respData: { candidates?: Array<{ content?: { parts?: unknown[] }; finishReason?: string }>; promptFeedback?: { blockReason?: string }; error?: { message?: string } };
    try {
      respData = JSON.parse(respText);
    } catch {
      return { error: `Réponse Gemini non-JSON (HTTP ${r.status}): ${respText.slice(0, 200)}` };
    }
    if (!r.ok) {
      const msg = respData?.error?.message || JSON.stringify(respData).slice(0, 300);
      return { error: `Gemini ${r.status}: ${msg}` };
    }
    const candidate = respData?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      return { error: `Gemini a refusé (finishReason: ${candidate.finishReason}). Essaye avec une autre photo ou une action différente.` };
    }
    if (respData?.promptFeedback?.blockReason) {
      return { error: `Image bloquée par les filtres Gemini (${respData.promptFeedback.blockReason}). Essaye avec une autre photo.` };
    }
    const partsOut = (candidate?.content?.parts || []) as Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
    const imagePart = partsOut.find(p => p.inlineData?.mimeType?.startsWith?.("image/"));
    if (!imagePart?.inlineData?.data) {
      // Si Gemini a renvoyé du texte au lieu d'une image
      const textPart = partsOut.find(p => p.text);
      const msg = textPart?.text ? `Gemini a répondu par texte au lieu d'image : « ${textPart.text.slice(0, 150)} »` : "Pas d'image en sortie. La requête a peut-être été bloquée ou refusée.";
      return { error: msg };
    }
    return { image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` };
  } catch (e) {
    return { error: String((e as Error)?.message || e) };
  }
}

export async function POST(req: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante côté serveur" }, { status: 500 });

  let body: { image?: string; action?: string; note?: string | null; format?: string | null; theme?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { image, action, note, format, theme } = body;
  if (!image || !action) {
    return NextResponse.json({ error: "Champs requis : image (dataUrl), action" }, { status: 400 });
  }

  // Cas spécial : multi-formats = 4 appels parallèles (le format global est ignoré, on génère les 4)
  if (action === "multi-formats") {
    const ratios = ["multi-1-1", "multi-4-5", "multi-9-16", "multi-16-9"];
    const labels: Record<string, string> = {
      "multi-1-1": "Carré 1:1 (Insta post)",
      "multi-4-5": "Portrait 4:5 (Insta feed)",
      "multi-9-16": "Vertical 9:16 (Story/Reel)",
      "multi-16-9": "Paysage 16:9 (FB cover)",
    };
    const results = await Promise.all(ratios.map(r => appelGemini(image, r, note, null, theme).then(res => ({ ...res, ratio: r, label: labels[r] }))));
    return NextResponse.json({ resultats: results });
  }

  // Cas simple : 1 appel — le format choisi par l'utilisateur override le ratio par défaut de l'action
  const res = await appelGemini(image, action, note, format, theme);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ image: res.image });
}
