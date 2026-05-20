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

  let body: { addon?: string; base?: string; note?: string | null; addonMm?: number | null; baseMm?: number | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { addon, base, note, addonMm, baseMm } = body;
  if (!addon || !base) {
    return NextResponse.json({ error: "Il faut une image d'addon ET une image de base." }, { status: 400 });
  }
  const a = parseDataUrl(addon);
  const b = parseDataUrl(base);
  if (!a || !b) return NextResponse.json({ error: "Format image invalide (data URL attendue)" }, { status: 400 });

  // Si l'utilisateur a précisé les largeurs, on calcule le ratio exact
  let dimensionsNote = "";
  if (addonMm && baseMm && addonMm > 0 && baseMm > 0) {
    const ratioPct = Math.round((addonMm / baseMm) * 100);
    dimensionsNote = `\n🎯 LARGEURS EXACTES (à respecter strictement) :\n- Base = ${baseMm}mm de large.\n- Addon = ${addonMm}mm de large.\n- Ratio visuel CIBLE : l'addon doit faire exactement ${ratioPct}% de la largeur visible de la base. La base doit déborder de l'addon de (${baseMm - addonMm}mm) au total, répartis également au-dessus et en-dessous.\n`;
  }

  const prompt = `🔗 COMPOSITION ADDON + BASE — Mood Collection.${dimensionsNote}

═══════════════════════════════════════════
CONTEXTE PRODUIT (Mood Collection)
═══════════════════════════════════════════

Mood Collection est une marque suisse de joaillerie qui fabrique des bagues à système modulaire breveté : un "addon" (anneau décoré, fin) qui se clipse sur une "base" (anneau plus large qui se porte au doigt).

- IMAGE 1 = l'ADDON (anneau décoré, le plus souvent fin, parfois avec gravure, pierres, motif, finition mate ou brillante)
- IMAGE 2 = la BASE (anneau plus large, en acier 316L ou titane, finition lisse ou texturée)

═══════════════════════════════════════════
PROPORTIONS — RÈGLE CRITIQUE (à respecter ABSOLUMENT)
═══════════════════════════════════════════

⚠️ DIMENSIONS RÉELLES MOOD (à scaler dans la composition finale) :
- La BASE (Image 2) est TOUJOURS PLUS LARGE que l'ADDON. Largeurs standards : 11mm ou 13mm.
- L'ADDON (Image 1) est TOUJOURS PLUS FIN que la base. Largeurs standards : 7mm (addon plein) ou moins (deux tiers 4.85mm, medium 2.45mm, mini 1.22mm).
- Ratio cible final : l'addon occupe entre 40% et 70% de la largeur visible de la base. JAMAIS plus large que la base.
- La base DÉBORDE des deux côtés de l'addon (haut et bas). On voit clairement un anneau de base au-dessus de l'addon ET un anneau de base en-dessous de l'addon — comme un sandwich où l'addon est la garniture centrale.

❌ ERREUR INTERDITE : l'addon NE DOIT JAMAIS être plus large que la base. Si le résultat montre l'addon qui dépasse la base ou qui cache complètement la base, le résultat est RATÉ. Refaire avec un addon visiblement plus fin que la base.

✅ COMPOSITION CORRECTE : base bien visible avec ses 2 bords (haut + bas) clairement présents, addon centré au milieu et nettement plus étroit.

═══════════════════════════════════════════
TÂCHE
═══════════════════════════════════════════

Compose une SEULE photo produit qui montre l'addon (Image 1) CLIPSÉ sur la base (Image 2), comme on le ferait dans le catalogue Mood. La base se porte au doigt (anneau large), l'addon (anneau plus fin) vient se poser DESSUS, centré.

RÈGLES STRICTES :
- Préserver la FORME, la COULEUR, la MATIÈRE, la FINITION, le DÉCOR/GRAVURE de l'addon (Image 1) — fidélité pixel.
- Préserver la FORME, la COULEUR, la MATIÈRE, la FINITION de la base (Image 2) — fidélité pixel.
- Scaler les 2 pièces aux proportions Mood : base plus large, addon plus fin, addon ≈ 40-70% de la largeur de la base, base débordant haut+bas (voir section PROPORTIONS).
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
