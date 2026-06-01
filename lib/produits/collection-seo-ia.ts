// Génération IA de la description SEO d'une page collection Shopify (texte HTML court).
// Utilise Gemini 2.5 Flash avec les mots-clés Mood.

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

// Pool de mots-clés Mood (réutilise la même base que seo-ia.ts pour cohérence)
const MOTS_CLES_FR = [
  "bague mood",
  "bague interchangeable",
  "bague modulable",
  "anneau interchangeable",
  "bague personnalisable",
  "bijou suisse",
  "joaillerie",
  "bague joaillerie",
  "bague sertie",
  "haute joaillerie",
  "mood joaillerie",
  "Mood Collection",
  "système breveté",
  "alliance modulable",
  "bague à clipser",
];

const PROMPT_DESC_COLLECTION = `Tu es expert SEO et copywriter pour Mood Collection (marque suisse de bagues mood interchangeables, design contemporain minimaliste, basée à Orbe / Suisse). Objectif : maximiser le référencement Google d'une PAGE DE COLLECTION Shopify.

OBJECTIF : générer une description HTML pour cette collection, optimisée référencement, naturelle à lire pour les clientes.

CONTRAINTES STRICTES :
- HTML simple uniquement : <h2>, <p>, <ul>, <li>, <strong>
- 200 à 350 mots au total
- 2-3 paragraphes + une liste à puces (3-5 items) qui met en avant ce qu'on trouve dans la collection
- Intégrer NATURELLEMENT 5-7 mots-clés du pool (pas de stuffing — phrases lisibles)
- Ton minimaliste, contemporain, poétique — comme Stéphanie Pousaz écrit
- Mentionner "mood Collection" et "système breveté de bagues interchangeables"
- "On" inclusif autorisé ("On a imaginé...") — pas de "nous"
- AUCUN superlatif creux ("incroyable", "exceptionnel", "magnifique", "unique en son genre")
- AUCUN emoji, AUCUN hashtag, AUCUN "Bonne journée" ou "N'hésitez pas"
- INTERDIT : "design suisse" (sauf si la collection mentionne explicitement le côté suisse), "garantie à vie"
- INTERDIT : "fabriqué en Suisse" (certains produits ne le sont pas)
- INTERDIT : > 400 mots, **, ***
- Français impeccable

POOL DE MOTS-CLÉS PRIORITAIRES :
${MOTS_CLES_FR.map((k) => `- ${k}`).join("\n")}

EXEMPLE de qualité attendue (pour une collection "Coffrets de juin 2026 — On fête la musique") :
<h2>Coffrets de juin 2026 — la musique en clipsant</h2>
<p>On a imaginé une série limitée de coffrets pensés autour d'un même fil rouge : la musique du moment. Chaque coffret regroupe une base mood et deux ou trois anneaux interchangeables, à composer selon l'humeur du jour.</p>
<p>Le système breveté de bagues interchangeables Mood Collection permet de tout réassembler en un clic — une base, un addon, un medium ou un deux tiers, et on change d'esthétique en quelques secondes.</p>
<ul>
  <li>Coffrets thématiques limités juin 2026</li>
  <li>Bagues mood interchangeables, à composer à l'infini</li>
  <li>Anneaux en argent, or, aluminium, polymère, céramique</li>
  <li>Mood Collection, marque suisse de joaillerie contemporaine</li>
</ul>
<p>Une nouvelle composition à découvrir chaque semaine. À chiner pour soi, à offrir à celles et ceux qui aiment porter leur humeur au doigt.</p>

RÉPONSE OBLIGATOIRE : HTML pur uniquement, rien d'autre. Pas de méta-commentaire, pas de markdown, pas de \`\`\`html\`\`\`.`;

async function geminiCall(prompt: string): Promise<string> {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY manquante");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Gemini ${r.status} : ${err.slice(0, 200)}`);
  }
  const data = await r.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// Fonction principale : génère le HTML SEO d'une page collection.
// Fallback si l'IA échoue : un HTML minimal correct.
export async function genererDescriptionCollection(
  titre: string,
  tag: string
): Promise<string> {
  try {
    const prompt = `${PROMPT_DESC_COLLECTION}

NOM DE LA COLLECTION À DÉCRIRE : "${titre}"
TAG ASSOCIÉ (pour info, ne pas mettre dans le texte) : ${tag}`;
    const html = await geminiCall(prompt);
    // Nettoyage léger : retire ```html ... ``` si Gemini les met malgré la consigne
    return html
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
  } catch {
    // Fallback minimal — la description peut être complétée à la main dans Shopify
    return `<h2>${titre}</h2>
<p>Découvrez ${titre} chez Mood Collection — système breveté de bagues mood interchangeables.</p>`;
  }
}
