import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const PROMPT = `Tu es l'adjoint stratégique de Mood Collection. Tu reçois :
- Une formule actuelle (liste d'étapes pour traiter une condition de stat)
- Le nom de la condition concernée
- Des mots-clés ou notes ajoutées par l'utilisateur
- Le contexte de la stat (titre + catégorie)

OBJECTIF : RÉÉCRIRE la formule en intégrant les mots-clés / notes de l'utilisateur dans des étapes adaptées au contexte Mood. Tu gardes l'esprit de la formule d'origine mais tu la rends concrète, actionnable et personnalisée selon les mots-clés.

RÈGLES :
- Garde le même NOMBRE d'étapes que la formule d'origine (jamais plus, jamais moins) sauf si l'utilisateur précise explicitement dans les mots-clés
- Chaque étape = 1 phrase courte (15-25 mots max), formulée comme une consigne claire
- Vocabulaire simple, mots de tous les jours
- Pas de jargon, pas d'anglicismes, pas d'emojis dans les étapes
- Respecte la condition : ne change pas la nature des étapes (si formule = Urgence, garde la logique "promouvoir / changer la base / économiser…")

RÉPONSE OBLIGATOIRE — JSON STRICT :
{
  "formule": [
    "étape 1 réécrite",
    "étape 2 réécrite",
    "..."
  ]
}`;

async function geminiCall(parts: unknown[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
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

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const {
    formule_actuelle,
    mots_cles,
    condition_nom,
    titre,
    categorie,
  }: {
    formule_actuelle: string[];
    mots_cles: string;
    condition_nom?: string;
    titre?: string;
    categorie?: string;
  } = body;

  if (!Array.isArray(formule_actuelle) || formule_actuelle.length === 0)
    return NextResponse.json(
      { error: "formule_actuelle requise (tableau non vide)" },
      { status: 400 }
    );
  if (!mots_cles || !mots_cles.trim())
    return NextResponse.json(
      { error: "mots_cles requis" },
      { status: 400 }
    );

  try {
    const prompt = `${PROMPT}

--- CONTEXTE ---
Condition : ${condition_nom || "(non précisée)"}
Stat : ${titre || "(sans titre)"}
Catégorie : ${categorie || "générique"}

--- FORMULE ACTUELLE (${formule_actuelle.length} étapes) ---
${formule_actuelle.map((e, i) => `${i + 1}. ${e}`).join("\n")}

--- MOTS-CLÉS / NOTES DE L'UTILISATEUR ---
${mots_cles.trim()}

Réécris la formule en intégrant ces mots-clés / notes.`;

    const txt = await geminiCall([{ text: prompt }]);
    let parsed: { formule?: string[] };
    try {
      parsed = JSON.parse(txt);
    } catch {
      return NextResponse.json(
        { error: "réponse IA non parsable", raw: txt.slice(0, 500) },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed.formule) || parsed.formule.length === 0)
      return NextResponse.json(
        { error: "formule générée vide" },
        { status: 502 }
      );

    return NextResponse.json({ formule: parsed.formule });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur génération", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
