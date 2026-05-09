import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

const STYLE_MOOD_VISUEL = `STYLE PHOTOGRAPHIQUE MOOD COLLECTION (à reproduire exactement) :
- Bague mood : SYSTÈME modulaire à clic = un anneau central (l'addon ou medium ou deux-tiers ou mini) clipsé entre deux anneaux extérieurs (la base en acier ou titane). La base est OBLIGATOIRE pour montrer le système. Pas une bague joaillerie classique solo.
- Cadrage : vue 3/4 légère, focus net sur la bague, posée sur un support neutre.
- Fond : uni clair (blanc cassé, beige neutre, gris très clair).
- Lumière : douce, naturelle, légèrement directionnelle (style studio joaillerie suisse).
- Pas de mannequin, pas de doigt — la bague seule sur fond uni.
- Pas de texte, pas de logo, pas de watermark.
- Aspect : précieux, minimaliste, contemporain, réaliste (photo, pas illustration).

Les images de référence ci-dessous montrent le STYLE EXACT à reproduire (texture, finition, éclairage, cadrage).`;

const FORMAT_DESCRIPTION: Record<string, string> = {
  'addon': "ADDON = anneau central de largeur ~7mm, large, clipsé entre les 2 anneaux extérieurs de la base.",
  'deux-tiers': "DEUX TIERS = anneau central de largeur ~4.6mm (medium et 2/3 de l'addon), entre les 2 anneaux extérieurs de la base.",
  'medium': "MEDIUM = anneau central FIN de largeur ~2.3mm, plus discret, entre les 2 anneaux extérieurs de la base.",
  'mini': "MINI = anneau central très fin (~1-2mm), encore plus discret. Souvent en pack de 2 ou 4 minis empilés.",
  'base': "BASE seule = anneau extérieur en acier ou titane, sans addon clipsé. Largeur de base small (S) = 11mm, large (L) = 13mm, extra small (XS) = 9mm.",
  'open-mood': "OPEN MOOD = format spécifique large (10mm), pas un addon clipsable mais un anneau autonome.",
};

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { idee } = body || {};

  if (!idee || !idee.nom)
    return NextResponse.json({ error: 'champ "idee" requis avec au moins un nom' }, { status: 400 });

  // Charger les refs Mood pertinentes : 2-3 images de FORMAT + 1-2 de MATIÈRE
  const refsDir = path.join(process.cwd(), "public/refs-mood");
  const refsBase64: { mimeType: string; data: string }[] = [];

  function chargerRefs(sousDir: string, n: number) {
    try {
      const dir = path.join(refsDir, sousDir);
      const files = readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
      const shuffled = files.sort(() => Math.random() - 0.5).slice(0, n);
      for (const f of shuffled) {
        const buf = readFileSync(path.join(dir, f));
        const mimeType = f.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
        refsBase64.push({ mimeType, data: buf.toString("base64") });
      }
    } catch {
      /* dossier inexistant ou vide, on skip */
    }
  }

  // 1. FORMAT — 2 ou 3 refs du bon format (priorité absolue)
  const typeNorm = (idee.type || '').toLowerCase().trim();
  const formatMap: Record<string, string> = {
    'addon': 'addon',
    'deux-tiers': 'deux-tiers',
    'deux tiers': 'deux-tiers',
    'medium': 'medium',
    'mini': 'mini',
    'open-mood': 'open-mood',
    'open mood': 'open-mood',
    'coffret': 'coffret',
    'starter-pack': 'starter-pack',
    'pack': 'starter-pack',
    'boucles': 'clip-drop',
    'clip-drop': 'clip-drop',
  };
  const formatDir = formatMap[typeNorm];
  if (formatDir) {
    chargerRefs(formatDir, 3);
  } else if (typeNorm === 'base') {
    // Base : utiliser sub-folder selon largeur (par défaut small)
    chargerRefs('base/small', 2);
    chargerRefs('base/large', 1);
  } else {
    // Format inconnu — fallback sur addons + deux-tiers
    chargerRefs('addon', 2);
    chargerRefs('deux-tiers', 1);
  }

  // 2. MATIÈRE — 1 ref de la matière dominante
  const mat = (idee.matiere || '').toLowerCase();
  if (mat.includes('or ')) chargerRefs('matiere/or', 1);
  else if (mat.includes('argent')) chargerRefs('matiere/argent', 1);
  else if (mat.includes('acier')) chargerRefs('matiere/acier', 1);
  else if (mat.includes('titane')) chargerRefs('matiere/titane', 1);
  else if (mat.includes('aluminium') || mat.includes('alu')) chargerRefs('matiere/aluminium', 1);
  else if (mat.includes('polymère') || mat.includes('polymere')) chargerRefs('matiere/polymere', 1);

  // 3. PIERRES — si zircons, 1 ref zircons
  const pierre = (idee.pierre || '').toLowerCase();
  if (pierre.includes('zircon')) chargerRefs('matiere/zircons', 1);
  else if (pierre.includes('email') || mat.includes('email') || pierre.includes('émail')) chargerRefs('matiere/email', 1);

  // Description précise du format
  const formatDesc = FORMAT_DESCRIPTION[idee.type] || `Format : ${idee.type}.`;

  const composantes = [
    `Bague mood "${idee.nom}"`,
    `Type : ${idee.type || 'addon'}`,
    idee.matiere && `Matière : ${idee.matiere}`,
    idee.pvd && `Coloration PVD : ${idee.pvd}`,
    idee.couleur && !idee.pvd && `Couleur : ${idee.couleur}`,
    idee.pierre && `Pierres serties : ${idee.pierre}`,
    idee.description && `Description : ${idee.description}`,
  ].filter(Boolean).join('\n- ');

  const prompt = `${STYLE_MOOD_VISUEL}

${formatDesc}

PRODUIT À VISUALISER :
- ${composantes}

Génère UNE image photoréaliste de cette bague mood dans le style des références, vue 3/4 légère, fond uni neutre clair. La bague doit montrer le système Mood (addon clipsé sur la base avec les 2 anneaux extérieurs visibles).`;

  // Construire les parts : images de référence d'abord, puis prompt texte
  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];
  for (const ref of refsBase64) {
    parts.push({ inlineData: ref });
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
          imageConfig: { aspectRatio: "1:1" },
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: "erreur Gemini Image", detail: data }, { status: r.status });
    }
    const partsOut = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = partsOut.find((p: { inlineData?: { mimeType?: string; data?: string } }) =>
      p.inlineData?.mimeType?.startsWith?.("image/")
    );
    if (!imagePart?.inlineData?.data) {
      return NextResponse.json(
        { error: "réponse sans image", detail: data },
        { status: 500 }
      );
    }
    const dataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    return NextResponse.json({ image: dataUrl });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
