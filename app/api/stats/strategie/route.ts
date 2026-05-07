import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/conditions";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const PROMPT_STRATEGIE = `Tu es l'adjoint stratégique de Mood Collection (joaillerie suisse, bagues mood interchangeables).

OBJECTIF : générer 5-7 idées CRÉATIVES et CONCRÈTES pour améliorer la stat analysée. Pas de vagues conseils — des actions précises adaptées au contexte.

CONTEXTE MOOD COLLECTION :
- Marque suisse, design suisse, bagues interchangeables (système breveté addon + base)
- 6 boutiques physiques (Carouge, Martigny, Fribourg, Zermatt, Zurich, Orbe)
- Vente en ligne yourmood.net + Shopify Plus
- Réseau Mood Lovers (communauté fidèle)
- ~75'000 clientes, ~17'800 avis (4.8★)
- Ton minimaliste poétique, "on" inclusif

FORMAT MARKDOWN :
- Chaque idée = un titre niveau 3 (### avec emoji)
- Sous chaque titre : 2-3 phrases COURTES en langage de tous les jours
- 1 ligne "👉 Action concrète :" avec exactement quoi faire
- À la fin : section "## ⚠️ À garder en tête" avec 1-2 phrases de bon sens

VOCABULAIRE OBLIGATOIRE — TRÈS SIMPLE. Phrases courtes (max 15-20 mots).
INTERDIT : ROI, KPI, "segmenter", "leverage", "synergie", "optimiser", "drive", "boost", "scale"
INTERDIT : Idées vagues type "communiquer plus". Plus de 600 mots.

RÉPONDS DIRECTEMENT EN MARKDOWN.`;

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { categorie, titreStat, valeurs, condition, notes, planAction } = body;

  const cat = CATEGORIES.find((c) => c.id === categorie);
  const valeursTxt = Array.isArray(valeurs)
    ? valeurs.map((v: { date: string; valeur: unknown }) => `${v.date}: ${v.valeur}`).join(" | ")
    : "";

  const prompt = `${PROMPT_STRATEGIE}

--- STAT ANALYSÉE ---
Titre : ${titreStat || "?"}
Catégorie : ${cat ? cat.nom : "générique"}
Description catégorie : ${cat ? cat.desc : ""}
Valeurs : ${valeursTxt}
Condition : ${condition || "?"}

--- NOTES CONTEXTUELLES ---
${notes || "(aucune)"}

--- PLAN D'ACTION DÉJÀ GÉNÉRÉ ---
${(planAction || "").slice(0, 800)}

Génère maintenant 5-7 idées de stratégie concrètes.`;

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
    if (!r.ok) {
      const err = await r.text();
      return NextResponse.json({ error: "Gemini erreur", detail: err.slice(0, 300) }, { status: r.status });
    }
    const data = await r.json();
    const strategie =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return NextResponse.json({ strategie });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
