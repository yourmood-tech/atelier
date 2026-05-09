import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

const STYLE_MOOD_VISUEL = `STYLE PHOTOGRAPHIQUE MOOD COLLECTION (à reproduire EXACTEMENT) :

🔑 CRITÈRE #1 LE PLUS IMPORTANT : LA LARGEUR DE L'ANNEAU CENTRAL.
La bague mood est un système modulaire à clic : un anneau central (l'addon, deux tiers, medium ou mini) est clipsé entre les 2 anneaux extérieurs de la base.

PROPORTIONS RELATIVES À RESPECTER ABSOLUMENT (la largeur de l'anneau central par rapport à la largeur totale de la bague) :

ADDON       = anneau central LARGE       (~7mm = ≈75% de la largeur totale visible)
              ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌

DEUX TIERS  = anneau central MOYEN-LARGE (~4.6mm = ≈55% de la largeur totale)
              ▌▌▌▌▌▌▌▌▌▌▌▌

MEDIUM      = anneau central FIN         (~2.3mm = ≈30% de la largeur totale)
              ▌▌▌▌▌▌

MINI        = anneau central TRÈS FIN    (~1-2mm = ≈15% de la largeur totale)
              ▌▌▌

ATTENTION : NE CONFONDS PAS un addon avec un medium. Si on te demande un MEDIUM, l'anneau central doit être visiblement FIN par rapport aux 2 anneaux extérieurs de la base. Si on te demande un ADDON, il doit être visiblement LARGE.

Cadrage : vue 3/4 légère, focus net sur la bague, posée sur un support neutre.
Fond : uni clair (blanc cassé, beige neutre, gris très clair).
Lumière : douce, naturelle, légèrement directionnelle (style studio joaillerie suisse).
Pas de mannequin, pas de doigt — la bague seule sur fond uni.
Pas de texte, pas de logo, pas de watermark.
Aspect : précieux, minimaliste, contemporain, réaliste (photo, pas illustration).

📋 LES 2 PREMIÈRES IMAGES DE RÉFÉRENCE sont CRITIQUES :
- Image 1 : combinaisons base × addons (montre les 3 tailles de base : extra small / small / large + comment minis et mediums se combinent dessus)
- Image 2 : TABLEAU de comparaison des 4 formats côte à côte (Addon mini / Addon medium / Addon deux tiers / Addon) sur 3 tailles de base. RÉFÈRE-TOI à cette image pour identifier la PROPORTION EXACTE du format demandé.

Les images suivantes (3+) sont des exemples du format demandé en photo réelle. Reproduis fidèlement leur style photographique (texture, finition, éclairage, cadrage) ET la proportion vue dans le tableau de comparaison (Image 2).`;

const FORMAT_DESCRIPTION: Record<string, string> = {
  'addon': "FORMAT DEMANDÉ = ADDON. Anneau central LARGE (~7mm), occupant environ 75% de la largeur de la bague. Visible et imposant entre les 2 anneaux extérieurs.",
  'deux-tiers': "FORMAT DEMANDÉ = DEUX TIERS. Anneau central de largeur MOYENNE (~4.6mm), occupant environ 55% de la largeur. Plus fin que l'addon, plus large que le medium.",
  'medium': "FORMAT DEMANDÉ = MEDIUM. Anneau central FIN (~2.3mm), occupant seulement environ 30% de la largeur. Beaucoup plus DISCRET et FIN que l'addon. ⚠️ NE PAS générer un addon ou un deux tiers — le medium doit être nettement plus fin.",
  'mini': "FORMAT DEMANDÉ = MINI. Anneau central TRÈS FIN (~1-2mm), occupant ~15% de la largeur. Très discret, parfois empilé en pack de 2 ou 4 minis.",
  'base': "FORMAT DEMANDÉ = BASE seule. Anneau extérieur en acier ou titane, SANS addon clipsé au milieu. Largeur de base small (S) = 11mm, large (L) = 13mm, extra small (XS) = 9mm.",
  'open-mood': "FORMAT DEMANDÉ = OPEN MOOD. Format spécifique large (10mm), pas un addon clipsable mais un anneau autonome avec ouverture.",
};

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { idee } = body || {};

  if (!idee || !idee.nom)
    return NextResponse.json({ error: 'champ "idee" requis avec au moins un nom' }, { status: 400 });

  // Charger les refs Mood pertinentes : refs CRITIQUES + format + matière
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

  // 0. RÉFÉRENCES CRITIQUES (toujours en 1ère position) :
  //    - Combinaisons bases × addons (Mood lifestyle)
  //    - Tableau de comparaison des 4 formats côte à côte (addon mini / medium / deux tiers / addon)
  chargerRefs('_critique', 2);

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
    chargerRefs(formatDir, 5);  // 5 refs format (au lieu de 3) pour mieux ancrer la proportion
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

⚠️ RAPPEL CRITIQUE : reproduis EXACTEMENT la proportion de l'anneau central des images de référence ci-dessus. Si tu vois un anneau fin dans les refs, génère un anneau fin. NE GÉNÈRE PAS un addon (large) si on te demande un medium (fin) ou un mini (très fin).

Génère UNE image photoréaliste de cette bague mood dans le style des références, vue 3/4 légère, fond uni neutre clair, montrant le système Mood (anneau central clipsé sur la base avec les 2 anneaux extérieurs visibles).`;

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
