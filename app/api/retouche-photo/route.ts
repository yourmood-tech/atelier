import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

const PROMPTS: Record<string, string> = {
  "fond-blanc": "PIXEL-PRECISE CUTOUT of the ring on pure white background. ISOLATE ONLY THE RING. Remove COMPLETELY everything else : background, surface, ground shadow, props, hands, fingers, fabric, supports, second objects, reflections.\n\nCRITICAL CUTOUT REQUIREMENTS :\n- Edges must be cut AT THE EXACT PIXEL boundary of the ring — no fuzzy edge, no soft transition, no anti-aliasing leaving colored pixels.\n- Zero halo around the ring (no light or dark glow border from the previous background).\n- Zero colored fringe (no pixels of the old background color clinging to the ring edges).\n- Zero semi-transparent pixels.\n- The ring's intricate shapes (engravings, gemstone settings, small openings, prongs, inner ring hole) must be cut precisely — preserve every detail including the hole INSIDE the ring (background must show through it as pure white).\n\nOutput : the ring ALONE, perfectly isolated, centered on a 100% pure uniform white background (#ffffff). Subject preserved : same shape, same color, same material, same finish, same gemstones, same lighting on the ring itself. The ring's own 3D self-shadow can stay (it's part of the ring's volume), but the cast shadow on the surface must be gone.",
  "fond-anthracite": "Place this subject on a clean, uniform anthracite dark gray background (color hex #292928, the same dark studio background used in Mood Collection product photography). Keep the subject exactly as is — same colors, lighting, shadows, position and composition. Only the background is replaced with the uniform anthracite color. Professional packshot style, centered, studio lighting feel.",
  "amelioration": "Professional packshot retouching of this Mood Collection ring photo. Generate a CLEANED and STRAIGHTENED version with the following corrections:\n\n1. CLEAN ALL IMPERFECTIONS on the ring surface : dust particles, fingerprints, fine scratches, surface marks, lint fibers, smudges, micro-stains. The ring must look pristine and brand new, as if it just came out of the factory polishing stage.\n\n2. STRAIGHTEN THE RING : if it's tilted or off-axis, rotate it gently so it sits perfectly aligned with the natural horizontal/vertical of the photo. Center it in the frame with comfortable margins on all sides.\n\n3. ENHANCE THE METAL/MATERIAL : preserve and highlight the natural texture (brushed, polished, anodized, etc.), keep faithful colors, boost contrast subtly to make edges crisp, sharpen reflective highlights without overdoing it.\n\n4. KEEP IDENTICAL : the background, the lighting direction, the overall composition style, the ring identity (same shape, same color, same material, same finish, same gemstones).\n\nThe result must look like a professional jewelry photographer just retouched it for a high-end e-commerce listing. Output the cleaned and straightened image, not the original.",
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
