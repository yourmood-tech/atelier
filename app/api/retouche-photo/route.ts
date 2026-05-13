import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

const PROMPTS: Record<string, string> = {
  "fond-blanc": "PIXEL-PRECISE CUTOUT of the ring on pure white background. ISOLATE ONLY THE RING. Remove COMPLETELY everything else : background, surface, ground shadow, props, hands, fingers, fabric, supports, second objects, reflections.\n\nCRITICAL CUTOUT REQUIREMENTS :\n- Edges must be cut AT THE EXACT PIXEL boundary of the ring — no fuzzy edge, no soft transition, no anti-aliasing leaving colored pixels.\n- Zero halo around the ring (no light or dark glow border from the previous background).\n- Zero colored fringe (no pixels of the old background color clinging to the ring edges).\n- Zero semi-transparent pixels.\n- The ring's intricate shapes (engravings, gemstone settings, small openings, prongs, inner ring hole) must be cut precisely — preserve every detail including the hole INSIDE the ring (background must show through it as pure white).\n\nOutput : the ring ALONE, perfectly isolated, centered on a 100% pure uniform white background (#ffffff). Subject preserved : same shape, same color, same material, same finish, same gemstones, same lighting on the ring itself. The ring's own 3D self-shadow can stay (it's part of the ring's volume), but the cast shadow on the surface must be gone.",
  "fond-anthracite": "Place this subject on a clean, uniform anthracite dark gray background (color hex #292928, the same dark studio background used in Mood Collection product photography). Keep the subject exactly as is — same colors, lighting, shadows, position and composition. Only the background is replaced with the uniform anthracite color. Professional packshot style, centered, studio lighting feel.",
  "amelioration": "Professional packshot retouching of this Mood Collection ring photo. Generate a CLEANED and STRAIGHTENED version with the following corrections:\n\n1. CLEAN ALL IMPERFECTIONS on the ring surface : dust particles, fingerprints, fine scratches, surface marks, lint fibers, smudges, micro-stains. The ring must look pristine and brand new, as if it just came out of the factory polishing stage.\n\n2. STRAIGHTEN THE RING : if it's tilted or off-axis, rotate it gently so it sits perfectly aligned with the natural horizontal/vertical of the photo. Center it in the frame with comfortable margins on all sides.\n\n3. ENHANCE THE METAL/MATERIAL : preserve and highlight the natural texture (brushed, polished, anodized, etc.), keep faithful colors, boost contrast subtly to make edges crisp, sharpen reflective highlights without overdoing it.\n\n4. KEEP IDENTICAL : the background, the lighting direction, the overall composition style, the ring identity (same shape, same color, same material, same finish, same gemstones).\n\nThe result must look like a professional jewelry photographer just retouched it for a high-end e-commerce listing. Output the cleaned and straightened image, not the original.",
  "lumiere-contraste": "HIGH-QUALITY PROFESSIONAL ENHANCEMENT of this Mood Collection ring photo for luxury jewelry magazine quality. Apply the following corrections on the WHOLE image :\n\n1. LIGHTING : significantly improve exposure dynamics, recover shadow details, control highlights, add a subtle directional studio lighting feel. The ring should have crisp, well-defined highlights and rich, deep shadows for a 3D feel.\n\n2. CONTRAST : boost contrast clearly — deep blacks, bright whites, full tonal range. Avoid flat washed-out look.\n\n3. CLEAN PARASITES EVERYWHERE — both on the ring AND in the surrounding decor/background : dust particles, fingerprints, fine scratches, lint, fibers, hair strands, marks, smudges, micro-stains. The surface, fabric, support, background must look pristine.\n\n4. CLEAN DECOR IMPERFECTIONS : fix any wrinkles in fabric, dirt on surface, color inconsistency in background, dust on plant leaves, water spots, smudges on glass, any visual distraction.\n\n5. INCREASE SHARPNESS and clarity selectively on the ring edges and gemstones for that high-end magazine look.\n\n6. KEEP IDENTICAL : composition, ring identity, decor style, color palette intent.\n\nResult : a high-end luxury jewelry photography look, ready for a glossy magazine or a high-end e-commerce hero shot. Output the enhanced image.",
  "theme-printemps": "TRANSFORM the surroundings of this Mood Collection ring into an ELEGANT SPRING LUXURY scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nSpring decor :\n- Soft sakura cherry blossom petal shadows playing on the surface around the ring (silhouettes, not actual petals — like sunlight filtering through cherry blossoms casting delicate shadow patterns)\n- A few real sakura petals scattered subtly around the ring (pale pink, cream)\n- Soft warm MORNING LIGHT (golden hour just after sunrise, warm but not overly golden — fresh and gentle)\n- Light pastel palette in shadows : pale pink, cream, light peach, soft white\n- A subtle hint of out-of-focus spring greenery in the deep background (bokeh, very soft)\n- High-end luxury jewelry magazine style, like a Tiffany or Cartier spring campaign\n- Clean surface (no dust, no parasites)\n\nResult : a luxe spring editorial shot, the ring as the hero, sakura ambiance subtle and elegant. Output the transformed image.",
  "theme-ete": "TRANSFORM the surroundings of this Mood Collection ring into an ELEGANT SUMMER LUXURY scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nSummer decor :\n- Warm golden hour light (late afternoon, rich amber tones)\n- Subtle sandy/sun-bleached texture on the surface (suggested, not explicit — like fine pale sand or warm linen)\n- Soft palm leaf or tropical foliage shadows playing across the scene (silhouettes, dappled light)\n- A few subtle elements : maybe one delicate seashell or a single small pebble nearby, very subdued\n- Warm color palette : honey, cream, beige, soft coral, pale gold\n- Out-of-focus warm bokeh in deep background suggesting an outdoor summer setting\n- High-end luxury jewelry magazine style, like a summer campaign\n- Clean surface (no dust, no parasites)\n\nResult : a luxe summer editorial shot, the ring as the hero, vacation/sun-kissed ambiance subtle and elegant. Output the transformed image.",
  "theme-automne": "TRANSFORM the surroundings of this Mood Collection ring into an ELEGANT AUTUMN LUXURY scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nAutumn decor :\n- A few real autumn leaves scattered around the ring (subtle, not cluttering) : warm terracotta, ochre, burnt orange, golden yellow — fall colors\n- Soft warm afternoon light, slightly low-angle, casting long gentle shadows\n- A hint of cozy texture nearby (warm wool, cashmere, linen in autumn tones)\n- Rich warm color palette : terracotta, ochre, burnt umber, deep ruby, golden brown\n- Out-of-focus warm bokeh in deep background suggesting indoor cozy autumn setting\n- High-end luxury jewelry magazine style, like a fall campaign\n- Clean surface (no dust, no parasites)\n\nResult : a luxe autumn editorial shot, the ring as the hero, cozy fall ambiance subtle and elegant. Output the transformed image.",
  "theme-hiver": "TRANSFORM the surroundings of this Mood Collection ring into an ELEGANT WINTER LUXURY scene while keeping the ring exactly identical (same shape, color, material, finish, gemstones, exact position).\n\nWinter decor :\n- Subtle frost or fine snow crystals texture on the surface around the ring (delicate, not heavy)\n- Cool soft light (overcast winter daylight or warm candle light contrasting with cool tones)\n- Cool color palette in highlights : icy white, pale blue, silver, soft pearl — with optional warm candle/golden contrast accent\n- A few subtle elements : maybe a sprig of evergreen (pine, eucalyptus) or a small frost-bitten branch, very subdued\n- Out-of-focus cool bokeh in deep background suggesting winter ambiance\n- High-end luxury jewelry magazine style, like a winter campaign\n- Clean surface (no dust, no parasites)\n\nResult : a luxe winter editorial shot, the ring as the hero, crisp winter ambiance subtle and elegant. Output the transformed image.",
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
  "bague-portee": "1:1",
  "multi-1-1": "1:1",
  "multi-4-5": "4:5",
  "multi-9-16": "9:16",
  "multi-16-9": "16:9",
};

async function appelGemini(imageDataUrl: string, action: string, note?: string | null): Promise<{ image?: string; error?: string }> {
  const basePrompt = PROMPTS[action];
  if (!basePrompt) return { error: `Action inconnue : ${action}` };
  const prompt = note && note.trim()
    ? `${basePrompt}\n\n=== INSTRUCTIONS SUPPLÉMENTAIRES DE L'UTILISATEUR (à respecter en priorité) ===\n${note.trim()}`
    : basePrompt;

  // Extraire mimeType et data depuis dataUrl
  const m = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { error: "Image invalide (doit être data:image/...;base64,...)" };
  const mimeType = m[1];
  const data = m[2];

  const parts = [
    { inlineData: { mimeType, data } },
    { text: prompt },
  ];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: RATIOS[action] || "1:1" },
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

  let body: { image?: string; action?: string; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { image, action, note } = body;
  if (!image || !action) {
    return NextResponse.json({ error: "Champs requis : image (dataUrl), action" }, { status: 400 });
  }

  // Cas spécial : multi-formats = 4 appels parallèles
  if (action === "multi-formats") {
    const ratios = ["multi-1-1", "multi-4-5", "multi-9-16", "multi-16-9"];
    const labels: Record<string, string> = {
      "multi-1-1": "Carré 1:1 (Insta post)",
      "multi-4-5": "Portrait 4:5 (Insta feed)",
      "multi-9-16": "Vertical 9:16 (Story/Reel)",
      "multi-16-9": "Paysage 16:9 (FB cover)",
    };
    const results = await Promise.all(ratios.map(r => appelGemini(image, r, note).then(res => ({ ...res, ratio: r, label: labels[r] }))));
    return NextResponse.json({ resultats: results });
  }

  // Cas simple : 1 appel
  const res = await appelGemini(image, action, note);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ image: res.image });
}
