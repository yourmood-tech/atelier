import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

const PALETTES: Record<string, string> = {
  "rose": "soft pastel pink palette — pale rose, blush, cream, dusty pink, sakura petal tones",
  "rose-vif": "vibrant pink palette — fuchsia, hot pink, magenta with soft pastel highlights",
  "bleu-ocean": "deep ocean blue palette — navy, midnight blue, electric blue with subtle silver reflections",
  "noir-heritage": "dark luxurious palette — deep black, anthracite, gunmetal, with subtle pink or gold accents",
  "anthracite": "Mood signature anthracite palette — uniform dark grey #292928, like a Mood Collection studio packshot background",
  "creme-or": "warm cream and gold palette — beige, ivory, champagne, soft gold",
  "vert": "soft sage green palette — pistachio, eucalyptus, deep forest accents",
  "blanc-pur": "pure white luxury palette — pristine white, very subtle pearl highlights, minimalist",
};

function compositionForFormat(format: string): string {
  switch (format) {
    case "1:1":
      return "Square 1:1 composition. The ring(s) occupy the lower-right or center area. The upper-left and center-left area is LEFT INTENTIONALLY EMPTY (clean background only, soft gradient or neutral tone) to leave large room for text overlay.";
    case "4:5":
      return "Portrait 4:5 composition. The ring(s) occupy the lower half. The upper half is LEFT INTENTIONALLY EMPTY (clean background only) to leave large room for text overlay.";
    case "9:16":
      return "Vertical 9:16 story composition. The ring(s) occupy the lower third. The upper two thirds are LEFT INTENTIONALLY EMPTY (clean background only) to leave generous room for text overlay.";
    default:
      return "Square 1:1 composition with empty zone on the left or top for text overlay.";
  }
}

function promptForTemplate(template: string, palette: string, format: string, nbPhotos: number, baguePortee: boolean, duoStyle: string = "split"): string {
  const paletteDesc = PALETTES[palette] || PALETTES["rose"];
  const compo = compositionForFormat(format);
  // Le template "bague-portee" et "duo-portee-packshot" forcent baguePortee = true
  if (template === "bague-portee" || template === "duo-portee-packshot") baguePortee = true;
  const ringWord = nbPhotos > 1 ? `${nbPhotos} rings` : "ring";
  const sourceWord = nbPhotos > 1 ? "source images" : "source image";

  const STRICT_NO_TEXT = `ABSOLUTELY NO TEXT in the generated image. NO LOGO. NO WORDS. NO LETTERS. NO NUMBERS. NO LABELS. NO BRAND MARKS. NO WATERMARKS. The image must be 100% visual — purely the ring(s) and the scenic atmosphere. Any text will be added afterwards in overlay by another tool.`;

  const PRESERVE = baguePortee
    ? `THE RING IS WORN ON A REAL HUMAN MODEL (not just an isolated hand). Show a FULL FEMININE MODEL — elegant woman, age 25-40, visible at portrait/half-body framing : you must see her hand wearing the ring, her forearm, her shoulder/neckline, AND part of her face (the face can be in soft focus or partially turned away, but it must be visible to convey "real model" feel — NOT an anonymous floating hand). She is dressed in a refined understated outfit (white t-shirt, cream cashmere, delicate black blazer, silk top — neutral & supportive). Her pose is natural and elegant — hand near collarbone, by the jawline, brushing hair, or resting near the face. The ring from the 1st source image is naturally worn on her finger, perfectly visible as the focal point.

${nbPhotos >= 2 ? "USE THE 2ND SOURCE IMAGE as the model/hand reference (pose, skin tone, manicure, framing, hairstyle, outfit hint) — preserve characteristics from the 2nd image as faithfully as possible." : "Default model: tan/olive skin, elegant feminine, soft natural manicure, soft natural pose."}

PRESERVE THE RING IDENTITY ABSOLUTELY — same shape, same colors, same material, same finish, same gemstones, same engravings as the 1st source image. The ring is pristine, sharp, perfectly lit. Style: high-end luxury jewelry editorial (Cartier / Tiffany / Bvlgari magazine campaign aesthetic).`
    : `Preserve the ${ringWord} from the ${sourceWord} EXACTLY — identical shape, identical colors, identical material, identical finish, identical gemstones, identical engravings. The ring(s) are the absolute hero — pristine, perfectly lit, sharp.${nbPhotos > 1 ? ` Arrange the ${nbPhotos} rings elegantly together — gentle lineup, soft cluster, fan, or arc — without clutter, each ring fully visible and clearly identifiable, never overlapping in a way that hides details.` : ""}`;

  switch (template) {
    case "promo-flash":
      return `Generate a luxury jewelry PROMOTIONAL background scene. High-end editorial style like a Tiffany or Cartier ad campaign.

${PRESERVE}

PALETTE & ATMOSPHERE: ${paletteDesc}. Soft directional studio lighting. Magazine-quality depth.

${compo}

Optionally include subtle scene props matching the palette (e.g., soft floral shadows, delicate petals, soft fabric draping, gentle bokeh) — but kept minimal and never busy.

${STRICT_NO_TEXT}

Output: a clean, evocative promotional background photo with the ring(s) integrated, ready for text overlay.`;

    case "collection-lancee":
      return `Generate a luxury jewelry COLLECTION LAUNCH cinematic scene. Atmospheric, evocative — like a Cartier, Bvlgari or Tiffany collection reveal.

${PRESERVE}

PALETTE & ATMOSPHERE: ${paletteDesc}.
- If ocean-themed: ring resting on dark wet rock with sea spray, deep blue ambient light, dramatic mood
- If rose/spring: ring on soft pink surface with subtle floral context, warm dreamy light
- If heritage/dark: ring on velvet or dark stone, low-key dramatic lighting with single key light
- Match the palette mood faithfully.

${compo}

Cinematic depth, deep tones, premium luxury feel. Empty space top is for the collection name overlay.

${STRICT_NO_TEXT}

Output: a cinematic collection-launch background with the ring(s) integrated.`;

    case "date-butoir":
      return `Generate a luxury jewelry LIMITED EDITION background visual. Style: elegant, refined, slight urgency without screaming.

${PRESERVE}

PALETTE & ATMOSPHERE: ${paletteDesc}. Refined, sophisticated, soft.

COMPOSITION: ring(s) positioned slightly off-center (right side or lower-right), surrounded by SUBTLE soft botanical shadow patterns on a neutral elegant surface. Empty space on the left for limited-edition tag and percentage overlay.

Soft natural daylight, slight foliage shadows playing across the surface (subtle, not heavy). Premium minimalist aesthetic.

${STRICT_NO_TEXT}

Output: a refined limited-edition background with the ring(s) elegantly placed.`;

    case "multi-bagues":
      return `Generate a luxury jewelry MULTI-RING composition. Style: clean e-commerce hero shot with editorial flair.

${PRESERVE} All ${nbPhotos} rings must appear in the final image — all identical to their respective source images.

PALETTE & ATMOSPHERE: ${paletteDesc}.

COMPOSITION: arrange the ${nbPhotos} rings in an elegant lineup — either a gentle curve, a row, or a balanced cluster around the edges, leaving a clean empty center zone for the offer text overlay. Subtle scene elements matching the palette (e.g., seashells and sand for ocean, petals for rose, leaves for green) but very restrained.

Soft uniform studio lighting. Premium e-commerce vibe.

${STRICT_NO_TEXT}

Output: a multi-ring composition with empty central zone for text overlay.`;

    case "duo-portee-packshot":
      if (duoStyle === "fusion") {
        return `Generate a luxury jewelry LIFESTYLE STILL-LIFE visual where BOTH the ring being worn on a model AND the SAME ring shown alone as a packshot COEXIST naturally in the SAME unified scene (a single coherent decor, NOT two separated frames or cases).

${PRESERVE}

PALETTE & ATMOSPHERE: ${paletteDesc}. A single unified decor that integrates both elements naturally.

COMPOSITION — UNIFIED SCENE (CRITICAL) :
- One single coherent decor (e.g., elegant marble table with petals for rose, dark wet rock with sea spray for ocean, velvet cushion under soft directional light for heritage, sandy surface with seashells for warm cream-gold).
- ELEMENT 1 : the SAME ring resting alone on the surface as a beautiful packshot still-life detail (could be near the foreground, on a small cushion, on a stone, on petals…).
- ELEMENT 2 : in the same continuous scene, the elegant feminine model is visible (her hand wearing the same ring extending into the frame — could be her hand reaching toward the packshot, her hand resting near it, or her half-body in the background with the worn ring visible).
- The two elements share THE SAME lighting, THE SAME palette, THE SAME atmosphere — they are part of ONE scene, not two zones. No visible frames, circles, or dividers between them.
- Soft natural composition like a high-end editorial still-life with figure.
- Leave breathing space for text overlay (typically top portion or empty corner).

THE RING IN BOTH PLACES MUST BE IDENTICAL — same shape, color, material, finish, gemstones. Clearly the SAME piece.

${STRICT_NO_TEXT}

Output: a unified lifestyle still-life with the ring shown twice (worn by model + posed alone) in the same coherent decor, ready for text overlay.`;
      }
      return `Generate a luxury jewelry SPLIT COMPOSITION visual showing the ring in TWO distinct zones — one worn on a model, one as a clean packshot.

${PRESERVE}

PALETTE & ATMOSPHERE: ${paletteDesc}.

COMPOSITION — TWO ZONES (CRITICAL) :
- LARGER ZONE (~60% area) : the model wearing the ring (half-body portrait of an elegant feminine model, hand visible with ring, face visible, refined outfit). This is the lifestyle / editorial zone.
- SMALLER ZONE (~30% area) : the SAME ring shown ALONE as a clean packshot, inside a CIRCULAR or rounded-square frame (well-defined visual container — the frame itself can be subtle border, glow, soft shadow, or color gradient — not heavy).
- The two zones must read as ONE cohesive visual (unified palette, complementary lighting, harmonious composition).
- Position the two zones based on format:
  ${format === "1:1" ? "* Square 1:1 : model on the LEFT (larger), packshot circle on the RIGHT (smaller, offset)" : ""}
  ${format === "4:5" ? "* Portrait 4:5 : model TOP (larger, ~65% height), packshot BOTTOM-CENTER (smaller circle)" : ""}
  ${format === "9:16" ? "* Story 9:16 : model TOP (larger, ~70% height), packshot BOTTOM (smaller, centered in a circle)" : ""}
- Leave generous empty space for text overlay (top of composition or between the two zones).

THE RING IN BOTH ZONES MUST BE IDENTICAL — same shape, color, material, finish, gemstones. They are clearly the SAME piece, just shown twice in different contexts.

${STRICT_NO_TEXT}

Output: a split-composition visual with the ring shown twice (worn + packshot), ready for text overlay.`;

    case "bague-portee":
      return `Generate a luxury jewelry EDITORIAL PORTRAIT visual. Style: high-end fashion magazine campaign (Cartier / Tiffany / Bvlgari editorial aesthetic).

${PRESERVE}

PALETTE & ATMOSPHERE: ${paletteDesc}. The atmosphere should ENVELOP the model (e.g., soft sakura petals around her for spring/pink, ocean breeze and blue ambient for ocean, golden hour warmth for cream/gold, dramatic dark velvet for heritage). Not just background — atmospheric immersion.

${compo}

The model is the central focal point. Empty zone (top/side per format) for the title overlay — give generous breathing space in the upper third for the title and at the bottom for the CTA pill.

Mood: refined, intimate, sophisticated, contemporary. Think modern luxury woman, confident yet natural.

${STRICT_NO_TEXT}

Output: an editorial portrait visual with the model wearing the ring(s), ready for text overlay.`;

    default:
      return `Generate a clean luxury jewelry background with the ring from the source image preserved exactly. Empty space for text overlay. ${STRICT_NO_TEXT}`;
  }
}

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });
  }

  let body: { template?: string; palette?: string; format?: string; photos?: string[]; note?: string | null; baguePortee?: boolean; duoStyle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { template = "promo-flash", palette = "rose", format = "1:1", photos, note, baguePortee = false, duoStyle = "split" } = body;
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json({ error: "Aucune photo de bague fournie" }, { status: 400 });
  }

  const validPhotos = photos.filter(p => typeof p === "string" && p.startsWith("data:image/"));
  if (validPhotos.length === 0) {
    return NextResponse.json({ error: "Photos invalides (attendu : data:image/...;base64,...)" }, { status: 400 });
  }

  const basePrompt = promptForTemplate(template, palette, format, validPhotos.length, baguePortee, duoStyle);
  const prompt = note && note.trim()
    ? `${basePrompt}\n\n=== USER ADDITIONAL INSTRUCTIONS (priority override) ===\n${note.trim()}`
    : basePrompt;

  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];
  for (const photo of validPhotos) {
    const m = photo.match(/^data:([^;]+);base64,(.+)$/);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  parts.push({ text: prompt });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: format },
        },
      }),
    });
    const respText = await r.text();
    let respData: { candidates?: Array<{ content?: { parts?: unknown[] }; finishReason?: string }>; promptFeedback?: { blockReason?: string }; error?: { message?: string } };
    try { respData = JSON.parse(respText); }
    catch { return NextResponse.json({ error: `Réponse Gemini non-JSON (HTTP ${r.status}): ${respText.slice(0, 200)}` }, { status: 502 }); }

    if (!r.ok) {
      const msg = respData?.error?.message || JSON.stringify(respData).slice(0, 300);
      return NextResponse.json({ error: `Gemini ${r.status}: ${msg}` }, { status: 502 });
    }
    const candidate = respData?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      return NextResponse.json({ error: `Gemini a refusé (finishReason: ${candidate.finishReason}). Essaye avec d'autres photos ou un autre template.` }, { status: 502 });
    }
    if (respData?.promptFeedback?.blockReason) {
      return NextResponse.json({ error: `Bloqué par filtres Gemini (${respData.promptFeedback.blockReason})` }, { status: 502 });
    }
    const partsOut = (candidate?.content?.parts || []) as Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
    const imagePart = partsOut.find(p => p.inlineData?.mimeType?.startsWith?.("image/"));
    if (!imagePart?.inlineData?.data) {
      const textPart = partsOut.find(p => p.text);
      const msg = textPart?.text ? `Gemini a répondu en texte : « ${textPart.text.slice(0, 150)} »` : "Pas d'image en sortie";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    return NextResponse.json({ image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
