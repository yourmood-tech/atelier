import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

function parseDataUrl(s: string) {
  const m = s.match(/^data:([^;]+);base64,(.+)$/);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

export async function POST(req: Request) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante côté serveur" }, { status: 500 });
  }

  let body: { addon?: string; base?: string; note?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { addon, base, note } = body;
  if (!addon || !base) {
    return NextResponse.json({ error: "Il faut une image d'addon ET une image de base." }, { status: 400 });
  }
  const a = parseDataUrl(addon);
  const b = parseDataUrl(base);
  if (!a || !b) return NextResponse.json({ error: "Format image invalide (data URL attendue)" }, { status: 400 });

  const prompt = `🔗 COMPOSITION ADDON + BASE — Mood Collection.

═══════════════════════════════════════════
CONTEXTE PRODUIT (Mood Collection)
═══════════════════════════════════════════

Mood Collection est une marque suisse de joaillerie qui fabrique des bagues à système modulaire breveté : un "addon" (anneau décoré, fin) qui se clipse sur une "base" (anneau plus large qui se porte au doigt).

- IMAGE 1 = l'ADDON (anneau décoré, le plus souvent fin, parfois avec gravure, pierres, motif, finition mate ou brillante)
- IMAGE 2 = la BASE (anneau plus large, en acier 316L ou titane, finition lisse ou texturée)

Largeurs Mood standards : XS = 9mm, S = 11mm, L = 13mm. L'addon se clipse DESSUS la base, centré dans la largeur. L'addon est légèrement plus fin que la base (effet visuel d'un anneau qui se pose sur l'autre).

═══════════════════════════════════════════
TÂCHE
═══════════════════════════════════════════

Compose une SEULE photo produit qui montre l'addon (Image 1) CLIPSÉ sur la base (Image 2), comme on le ferait dans le catalogue Mood. La base se porte au doigt, l'addon vient se poser dessus en se clipsant sur le dessus.

RÈGLES STRICTES :
- Préserver la FORME, la COULEUR, la MATIÈRE, la FINITION, le DÉCOR/GRAVURE de l'addon (Image 1) — fidélité pixel.
- Préserver la FORME, la COULEUR, la MATIÈRE, la FINITION de la base (Image 2) — fidélité pixel.
- L'addon est posé SUR la base, centré dans la largeur. La base dépasse légèrement en-dessous de l'addon (visible des deux côtés haut/bas du système). Si l'addon a une largeur visible plus petite que la base, on doit voir un peu de base au-dessus et en-dessous de l'addon.
- Angle de vue trois-quarts, identique à une photo catalogue Mood (légèrement de côté pour voir la profondeur de l'anneau + un peu du dessus pour voir l'épaisseur de la combo).
- Éclairage studio doux, fond blanc seamless, ombre douce au sol.
- Qualité photo magazine, ultra-net, sans artéfact.
- Pas de main, pas de doigt, pas de modèle — uniquement le système addon+base flottant sur fond blanc, comme une photo catalogue.
- Pas de texte, pas de logo, pas de watermark.

${note && note.trim() ? `\n📝 NOTE ADDITIONNELLE DE L'UTILISATEUR (à respecter) :\n${note.trim()}\n` : ""}

═══════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════

Une seule photo : le système Mood complet (addon clipsé sur base) sur fond blanc, vue trois-quarts catalogue, qualité magazine.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: a.mimeType, data: a.data } },
          { inlineData: { mimeType: b.mimeType, data: b.data } },
          { text: prompt },
        ] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
        },
      }),
    });
    const respText = await r.text();
    let respData: { candidates?: Array<{ content?: { parts?: unknown[] }; finishReason?: string }>; promptFeedback?: { blockReason?: string }; error?: { message?: string } };
    try { respData = JSON.parse(respText); }
    catch { return NextResponse.json({ error: `Gemini non-JSON (HTTP ${r.status}) : ${respText.slice(0, 200)}` }, { status: 502 }); }

    if (!r.ok) {
      return NextResponse.json({ error: `Gemini ${r.status} : ${respData?.error?.message || ""}` }, { status: 502 });
    }
    const candidate = respData?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      return NextResponse.json({ error: `Gemini a refusé (finishReason : ${candidate.finishReason}).` }, { status: 502 });
    }
    if (respData?.promptFeedback?.blockReason) {
      return NextResponse.json({ error: `Bloqué par les filtres (${respData.promptFeedback.blockReason})` }, { status: 502 });
    }
    const partsOut = (candidate?.content?.parts || []) as Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
    const imagePart = partsOut.find(p => p.inlineData?.mimeType?.startsWith?.("image/"));
    if (!imagePart?.inlineData?.data) {
      const textPart = partsOut.find(p => p.text);
      return NextResponse.json({ error: textPart?.text ? `Gemini a répondu par texte : « ${textPart.text.slice(0, 150)} »` : "Pas d'image en sortie" }, { status: 502 });
    }
    return NextResponse.json({ image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
