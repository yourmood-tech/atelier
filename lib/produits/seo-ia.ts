import keywords from "./keywords.json";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

interface SeoInfos {
  nom?: string;
  format?: string;
  matiere?: string;
  finition?: string;
  couleur?: string;
  collection?: string;
  texteInspiration?: string;
  // Champs supplémentaires pour Mood Joaillerie
  mode?: 'collection' | 'joaillerie';
  pierres?: Array<{ type?: string; taille?: string; quantite?: number }>;
  carat?: string;
  type_sertissage?: string;
  sous_type_piece?: string;
}

function buildPrompt(infos: SeoInfos, motsClesFR: string[]) {
  const { nom, format, matiere, finition, couleur, collection, texteInspiration,
          mode, pierres, carat, type_sertissage, sous_type_piece } = infos;
  const isJoaillerie = mode === 'joaillerie';

  const pierresTxt = Array.isArray(pierres) && pierres.length > 0
    ? pierres.map(p => `${p.quantite || 1}× ${p.type || ''} ${p.taille || ''}mm`).join(', ')
    : '';

  const contexte = [
    nom && `Nom du produit : ${nom}`,
    format && `Format : ${format}`,
    matiere && `Matière : ${matiere}${carat && matiere.startsWith('or ') ? ' ' + carat : ''}`,
    finition && finition !== "aucune" && `Finition : ${finition}`,
    couleur && `Couleur : ${couleur}`,
    collection && `Collection : ${collection}`,
    pierresTxt && `Pierres serties : ${pierresTxt}`,
    type_sertissage && `Type de sertissage : ${type_sertissage}`,
    sous_type_piece && `Sous-type : ${sous_type_piece === 'projet-unique' ? 'projet unique' : 'pièce d\'exception'}`,
    texteInspiration && `Esprit du produit : ${texteInspiration.substring(0, 250)}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (isJoaillerie) {
    return `Tu es expert SEO pour Mood Joaillerie (gamme haute joaillerie suisse de Mood Collection, basée à Orbe / Suisse).

OBJECTIF : générer un méta-titre + une méta-description qui maximisent le référencement Google pour cette pièce de joaillerie.

POOL DE MOTS-CLÉS PRIORITAIRES (intègre les 3-5 plus pertinents) :
${motsClesFR.map((k) => `- ${k}`).join("\n")}
- haute joaillerie suisse
- bague joaillerie
- bague sertie
- pierre précieuse
- design suisse
- mood joaillerie

CONTRAINTES STRICTES :
- Méta-titre : 50 à 60 caractères MAX
- Méta-description : 140 à 155 caractères MAX
- Inclure obligatoirement : nom du produit, type de pierre principale (si présente), "mood joaillerie"
- Mentionner les caratages si or, taille mm si pierres
- Pas de superlatifs creux ("incroyable", "magnifique"), pas de point d'exclamation
- Français impeccable

EXEMPLE DE QUALITÉ ATTENDUE (medium serti d'émeraudes 1.6mm en or rose 18K) :
{
  "title": "Medium serti émeraudes 1.6mm or rose 18K | mood joaillerie",
  "description": "Medium en or rose 18K serti d'émeraudes 1.6mm sertissage grain. Pièce signée mood joaillerie, design suisse. Sertissage joaillier."
}

PRODUIT À RÉFÉRENCER :
${contexte}

RÉPONSE OBLIGATOIRE — JSON STRICT, RIEN D'AUTRE :
{"title": "...", "description": "..."}`;
  }

  return `Tu es expert SEO pour Mood Collection (marque suisse de bagues mood interchangeables, design contemporain minimaliste, basée à Orbe / Suisse).

OBJECTIF : générer un méta-titre + une méta-description qui maximisent le référencement naturel Google pour ce produit, sans publicité payante. Les gens doivent nous trouver quand ils cherchent des bagues, des bijoux, des alliances.

POOL DE MOTS-CLÉS PRIORITAIRES À INTÉGRER (sélectionne les 3-5 plus pertinents pour CE produit, intègre-les naturellement) :
${motsClesFR.map((k) => `- ${k}`).join("\n")}

CONTRAINTES STRICTES :
- Méta-titre : 50 à 60 caractères MAX (Google coupe au-delà)
- Méta-description : 140 à 155 caractères MAX (Google coupe au-delà)
- Inclure obligatoirement : nom du produit, format, matière, "mood" ou "Mood Collection"
- Mentionner "design suisse" si pertinent (NE JAMAIS écrire "fabriqué en Suisse" ni "joaillerie suisse Mood Collection" — certains produits ne sont pas fabriqués en Suisse, seul le design est suisse)
- 3-5 mots-clés du pool intégrés NATURELLEMENT (pas de stuffing — phrases lisibles)
- Ton attractif qui donne envie de cliquer (minimaliste contemporain)
- Pas de superlatifs creux ("incroyable", "exceptionnel", "magnifique")
- Pas de point d'exclamation
- Français impeccable

EXEMPLE DE QUALITÉ ATTENDUE (pour un deux tiers Nirvana en argent poli) :
{
  "title": "Bague mood Nirvana — deux tiers argent | Mood Collection",
  "description": "Anneau deux tiers Nirvana en argent 925 poli. Bague interchangeable Mood Collection, design suisse. Garantie à vie."
}

PRODUIT À RÉFÉRENCER :
${contexte}

RÉPONSE OBLIGATOIRE — JSON STRICT, RIEN D'AUTRE :
{"title": "...", "description": "..."}`;
}

export async function genererSeoViaIA(infos: SeoInfos): Promise<{ title: string; description: string } | null> {
  if (!GEMINI_KEY) return null;
  const motsClesFR = (keywords as { fr?: string[] }).fr || [];
  const prompt = buildPrompt(infos, motsClesFR);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 512,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        },
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!txt) return null;
    const parsed = JSON.parse(txt);
    if (!parsed.title || !parsed.description) return null;
    return {
      title: parsed.title.slice(0, 70),
      description: parsed.description.slice(0, 160),
    };
  } catch {
    return null;
  }
}

export function genererNomImageSeo(
  infos: SeoInfos,
  position: number,
  extension?: string
): string {
  const slug = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const parts = [
    "bague-mood",
    slug(infos.nom || ""),
    slug(infos.format || ""),
    slug(infos.matiere || ""),
    infos.finition && infos.finition !== "aucune" ? slug(infos.finition) : null,
    String(position || 1),
  ].filter(Boolean);
  return `${parts.join("-")}.${extension || "jpg"}`;
}

export function genererAltImageSeo(infos: SeoInfos, position: number): string {
  const finitionTxt =
    infos.finition && infos.finition !== "aucune" ? ` ${infos.finition}` : "";
  return `Bague mood ${infos.nom} ${infos.format} en ${infos.matiere}${finitionTxt} — Mood Collection${position > 1 ? ` (vue ${position})` : ""}`;
}
