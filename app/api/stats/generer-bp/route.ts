import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const JOURS = ["jeudi", "vendredi", "samedi", "dimanche", "lundi", "mardi", "mercredi"];
const CRENEAUX = ["matin", "apres-midi", "soir"];

const PROMPT_BP = `Tu es l'adjoint stratégique de Mood Collection. Tu génères un Battle Plan hebdomadaire pour aider une personne à AGIR sur sa stat.

CONTEXTE :
- La semaine Mood commence le jeudi et finit le mercredi
- Chaque jour est découpé en 3 créneaux : matin / après-midi / soir
- La personne te dit son POSTE et les CRÉNEAUX où elle travaille
- Tu dois répartir les actions sur ses créneaux SEULEMENT (pas les autres)

VERBES OBLIGATOIRES : Appeler / Envoyer email / Poster sur Insta / Photographier / Mettre en ligne / Filmer / Publier / Contacter / Vendre / Présenter / Montrer à / Tester accroche / Demander à / Imprimer / Ajuster prix / Sertir / Préparer / Finir / Livrer / Relancer
VERBES INTERDITS : Brainstormer / Réfléchir à / Évaluer / Identifier / Comprendre / Analyser / Lister / Penser à / Imaginer / Améliorer / Optimiser

- Actions COURTES (3-8 mots) avec un CHIFFRE quand possible
- Créneau "soir" : 1 action max
- Maximum 1-3 actions par créneau

RÉPONSE OBLIGATOIRE — JSON STRICT :
{
  "objectif_semaine": "1 phrase courte qui résume l'intention de la semaine",
  "planning": {
    "jeudi":     { "matin": ["..."], "apres-midi": [...], "soir": [...] },
    "vendredi":  { "matin": [...], "apres-midi": [...], "soir": [...] },
    "samedi":    { "matin": [...], "apres-midi": [...], "soir": [...] },
    "dimanche":  { "matin": [...], "apres-midi": [...], "soir": [...] },
    "lundi":     { "matin": [...], "apres-midi": [...], "soir": [...] },
    "mardi":     { "matin": [...], "apres-midi": [...], "soir": [...] },
    "mercredi":  { "matin": [...], "apres-midi": [...], "soir": [...] }
  },
  "ligne_de_conduite": ["pilier 1 (très court)", "pilier 2", "pilier 3"]
}

Si un créneau N'EST PAS coché → mets une liste VIDE [].
Tous les jours/créneaux DOIVENT être présents dans le JSON, même vides.`;

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { prenom, titreStat, condition, formule, planAction, notes, poste, creneauxTravailles } = body;

  if (!poste || !creneauxTravailles)
    return NextResponse.json({ error: "champs requis : poste, creneauxTravailles" }, { status: 400 });

  const creneauxList: string[] = [];
  for (const j of JOURS) {
    for (const c of CRENEAUX) {
      if (creneauxTravailles[`${j}-${c}`]) creneauxList.push(`${j} ${c}`);
    }
  }

  const prompt = `${PROMPT_BP}

--- CONTEXTE STAT ---
Titre de la stat : ${titreStat || "?"}
Condition identifiée : ${condition || "?"}
Formule de la condition :
${(formule || []).map((e: string, i: number) => `  ${i + 1}. ${e}`).join("\n")}

--- PLAN D'ACTION DÉJÀ DONNÉ ---
${(planAction || "").slice(0, 1000)}

--- NOTES CONTEXTUELLES ---
${notes || "(aucune)"}

--- PERSONNE ---
Prénom : ${prenom || "(non précisé)"}

--- POSTE ---
${poste}

--- CRÉNEAUX OÙ ELLE TRAVAILLE CETTE SEMAINE ---
${creneauxList.length > 0 ? creneauxList.join(", ") : "(aucun coché — utilise tous les jours par défaut)"}

Génère le Battle Plan en JSON strict.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        },
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return NextResponse.json({ error: "Gemini erreur", detail: err.slice(0, 300) }, { status: r.status });
    }
    const data = await r.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    let bp: Record<string, unknown>;
    try {
      bp = JSON.parse(txt);
    } catch {
      bp = { objectif_semaine: "?", planning: {}, ligne_de_conduite: [] };
    }
    return NextResponse.json(bp);
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
