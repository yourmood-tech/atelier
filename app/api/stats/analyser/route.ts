import { NextResponse } from "next/server";
import { CONDITIONS, determinerCondition, CATEGORIES } from "@/lib/conditions";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const PROMPT_LECTURE = `Tu es un analyste qui lit des graphiques de stats hebdomadaires Mood Collection (statistiques de vente sur courbe MasterTech).

OBJECTIF : extraire les valeurs ET déterminer la condition qui s'applique.

INSTRUCTIONS LECTURE :
- Lis le titre de la stat (ex : "Ventes Joaillerie", "Coffret du mois")
- Lis chaque date visible sur l'axe X et la valeur correspondante sur la courbe
- Les valeurs sont des chiffres avec ou sans espaces (ex : 18 598 = 18598)
- Ignore les annotations 1 division = X (c'est juste l'échelle)

INSTRUCTIONS CONDITION — règle EXACTE selon le système Mood :
Évalue la TENDANCE RÉCENTE (3-4 dernières semaines), pas la moyenne globale.

- **PUISSANCE** : stat très haute en hausse continue forte sur 3+ semaines, atteint un nouveau pic
- **AFFLUENCE** : dernière variation forte hausse (+10% ou plus), stat globalement bonne
- **NORMAL** : stat stable autour d'une moyenne (±5-10%), OU stat qui REMONTE après une baisse récente (rebond), OU légère hausse régulière
- **URGENCE** : tendance descendante claire sur 2-3 semaines, baisse de -5% à -25%
- **DANGER** : chute brutale (>50% en 1 semaine) OU baisse continue forte (>-25% sur la moyenne) sur plusieurs semaines
- **NON-EXISTENCE** : stat à zéro ou très basse de manière chronique

RÈGLE D'OR : si la dernière variation est en HAUSSE (>0%), tu ne peux PAS être en Urgence ni en Danger. Au pire Normal, mieux Affluence.

RÉSUMÉ : 1-2 phrases qui expliquent simplement la tendance et pourquoi cette condition.

RÉPONSE OBLIGATOIRE — JSON STRICT :
{
  "titre_stat": "...",
  "designer": "... (si visible)",
  "valeurs": [
    {"date": "25 mars", "valeur": 7702},
    {"date": "1 avril", "valeur": 18598}
  ],
  "condition_detectee": "PUISSANCE | AFFLUENCE | NORMAL | URGENCE | DANGER | NON_EXISTENCE",
  "resume": "1-2 phrases simples qui résument la stat et pourquoi c'est cette condition"
}`;

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

async function geminiCall(
  parts: unknown[],
  config: Record<string, unknown> = {}
) {
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
        ...config,
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
  const { categorie, nomStat, imageBase64, mimeType, notes } = body;

  if (!imageBase64)
    return NextResponse.json({ error: "image requise" }, { status: 400 });

  try {
    const imagePart = {
      inlineData: { mimeType: mimeType || "image/png", data: imageBase64 },
    };
    const lectureText = await geminiCall(
      [{ text: PROMPT_LECTURE }, imagePart],
      { responseMimeType: "application/json" }
    );

    let lecture: Record<string, unknown>;
    try {
      lecture = JSON.parse(lectureText);
    } catch {
      lecture = { titre_stat: nomStat || "?", valeurs: [] };
    }

    const valeurs = ((lecture.valeurs as { valeur: unknown }[]) || [])
      .map((v) => Number(v.valeur))
      .filter((v) => !isNaN(v));

    const conditionGemini = lecture.condition_detectee
      ? CONDITIONS[lecture.condition_detectee as string]
      : null;
    const condition: import("@/lib/conditions").Condition =
      conditionGemini || determinerCondition({ valeurs }) || CONDITIONS.NORMAL;

    const courante = valeurs[valeurs.length - 1] || 0;
    const precedente = valeurs[valeurs.length - 2] || courante;
    const variationPct =
      precedente > 0
        ? ((courante - precedente) / precedente * 100).toFixed(1)
        : "0";

    const cat = CATEGORIES.find((c) => c.id === categorie);
    const promptPersonnalise = `${PROMPT_PLAN}

--- STAT ANALYSÉE ---
Titre : ${lecture.titre_stat || nomStat || "Stat sans titre"}
Catégorie : ${cat ? cat.nom : "générique"}
Valeurs lues : ${valeurs.join(" → ")}
Variation semaine sur semaine : ${variationPct}%
Condition identifiée : ${condition.nom}
Description condition : ${condition.description}

--- FORMULE GÉNÉRALE À ADAPTER ---
${condition.formule.map((e, i) => `${i + 1}. ${e}`).join("\n")}

--- NOTES CONTEXTUELLES UTILISATEUR ---
${notes || "(aucune note)"}

Génère le plan d'action complet adapté à cette catégorie et ces notes.`;

    const planAction = await geminiCall([{ text: promptPersonnalise }]);

    return NextResponse.json({
      titre: lecture.titre_stat || nomStat,
      designer: lecture.designer || null,
      valeurs: lecture.valeurs || [],
      variation_pct: Number(variationPct),
      resume:
        (lecture.resume as string) ||
        `${valeurs.length} semaines lues, variation S-1 → S de ${variationPct}%.`,
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
      { error: "erreur analyse", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
