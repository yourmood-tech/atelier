import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const STYLE_MOOD = `Tu es l'adjoint marketing de Mood Collection — marque suisse de joaillerie contemporaine, minimaliste poétique.

ÉCRIS la description produit dans le STYLE EXACT de Mood :
- 2 paragraphes courts (40-70 mots chacun)
- Minimaliste poétique, sensoriel, évocateur
- "on" inclusif, JAMAIS "nous" / "vous"
- Métaphores naturelles : lumière, eau, ciel, pierre, saison, souffle, instant
- Suggérer plutôt qu'expliquer — pas de superlatifs commerciaux
- Pas de hashtags, pas de CTA, pas de "découvrez", "n'hésitez pas"
- Banni absolu : "premium", "élégance intemporelle", "exceptionnel", "raffinement"

EXEMPLE DU STYLE ATTENDU (à reproduire exactement) :
"Le coffret PRINTEMPS DORÉ s'inspire de la douceur des premiers rayons de soleil, de la chaleur qui revient et des teintes délicates qui éveillent la saison. Une harmonie lumineuse entre ivoire, blush et nuances dorées, évoquant un renouveau doux et élégant.

Dans cette atmosphère chaleureuse, les matières captent la lumière avec subtilité : les textures sablées diffusent un éclat tendre, tandis que le rose gold apporte une touche précieuse et solaire. Une esthétique apaisante, où fraîcheur et éclat se rencontrent naturellement."

Génère la description SANS phrase d'introduction, SANS méta-commentaire — juste le texte poétique brut, deux paragraphes séparés par une ligne vide.`;

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { nom, format, matiere, finition, couleur, motsCles } = body || {};

  if (!motsCles || !motsCles.trim())
    return NextResponse.json({ error: 'champ "motsCles" requis (2-3 mots-clés)' }, { status: 400 });

  const contexte = [
    nom && `Nom du produit : ${nom}`,
    format && `Format : ${format}`,
    matiere && `Matière : ${matiere}`,
    finition && finition !== "aucune" && `Finition : ${finition}`,
    couleur && `Couleur dominante : ${couleur}`,
    `Mots-clés à intégrer : ${motsCles}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `${STYLE_MOOD}\n\n--- CONTEXTE DU PRODUIT ---\n${contexte}\n\n--- TEXTE ---\n`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    const data = await r.json();
    if (!r.ok)
      return NextResponse.json({ error: "erreur Gemini", detail: data }, { status: r.status });
    const texte = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!texte)
      return NextResponse.json({ error: "réponse Gemini vide", detail: data }, { status: 500 });
    return NextResponse.json({ texte });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
