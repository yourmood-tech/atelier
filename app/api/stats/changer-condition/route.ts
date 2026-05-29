import { NextResponse } from "next/server";
import { CONDITIONS, CATEGORIES } from "@/lib/conditions";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const PROMPT_PLAN = `Tu es l'adjoint stratégique de Mood Collection. Tu reçois :
1. Une stat hebdomadaire avec sa tendance et la condition identifiée
2. La formule générale de cette condition
3. Des notes contextuelles données par l'utilisateur
4. La catégorie de la stat

OBJECTIF : générer un plan d'action personnalisé Mood, qui suit la formule mais l'adapte au contexte. Lisible par toute l'équipe (pas que les experts).

FORMAT DE SORTIE — markdown PROPRE :
- Titres de niveau 2 (##) pour chaque étape de la formule, ex : "## 1. Économiser" — GARDE LES TITRES TELS QUELS
- Sous chaque titre : 2-3 phrases courtes en langage de TOUS LES JOURS
- Listes à puces (- ) pour les actions concrètes — pas plus de 4 puces par section
- Emojis sobres : 👉 pour action / 💡 pour insight / 🎯 pour priorité
- À la fin : section "## 🚀 Ligne de conduite" avec 3-4 piliers en liste

VOCABULAIRE OBLIGATOIRE — TRÈS SIMPLE. Phrases courtes (max 15-20 mots). Mots de tous les jours.
INTERDIT : ROI, KPI, "segmenter", "leverage", "synergie", "optimiser", "drive", "boost"
INTERDIT : plus de 500 mots. ** ou *** dans le texte.

RÉPONDS DIRECTEMENT EN MARKDOWN — pas de méta-commentaire.`;

async function geminiCall(parts: unknown[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2048,
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

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const {
    condition_cle,
    categorie,
    titre,
    valeurs,
    variation_pct,
    notes,
  }: {
    condition_cle: string;
    categorie?: string;
    titre?: string;
    valeurs?: { date: string; valeur: number }[];
    variation_pct?: number;
    notes?: string;
  } = body;

  const condition = CONDITIONS[condition_cle];
  if (!condition)
    return NextResponse.json(
      {
        error: "condition inconnue",
        valides: Object.keys(CONDITIONS),
      },
      { status: 400 }
    );

  try {
    const cat = CATEGORIES.find((c) => c.id === categorie);
    const valeursStr = (valeurs || [])
      .map((v) => Number(v.valeur))
      .filter((n) => !isNaN(n))
      .join(" → ");

    const promptPersonnalise = `${PROMPT_PLAN}

--- STAT ANALYSÉE ---
Titre : ${titre || "Stat sans titre"}
Catégorie : ${cat ? cat.nom : "générique"}
Valeurs lues : ${valeursStr || "(non transmises)"}
Variation semaine sur semaine : ${variation_pct ?? 0}%
Condition CHOISIE PAR L'UTILISATEUR (à appliquer telle quelle) : ${condition.nom}
Description condition : ${condition.description}

--- FORMULE GÉNÉRALE À ADAPTER ---
${condition.formule.map((e, i) => `${i + 1}. ${e}`).join("\n")}

--- NOTES CONTEXTUELLES UTILISATEUR ---
${notes || "(aucune note)"}

Génère le plan d'action complet adapté à cette catégorie et ces notes.`;

    const planAction = await geminiCall([{ text: promptPersonnalise }]);

    return NextResponse.json({
      condition: {
        nom: condition.nom,
        emoji: condition.emoji,
        description: condition.description,
        formule: condition.formule,
      },
      plan_action: planAction,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur régénération", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
