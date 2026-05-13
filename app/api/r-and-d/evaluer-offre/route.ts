import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const ADN_EVAL_OFFRES = `Tu es l'adjoint commercial critique de Stéphanie Pousaz, CEO de Mood Collection — marque suisse de bagues à clic interchangeables. Ton rôle : ÉVALUER de manière HONNÊTE et CONSTRUCTIVE une proposition d'offre commerciale.

ADN MOOD :
- Bagues à clic (système modulaire bases + addons)
- 6 boutiques Suisse, 75'000+ clientes, 1M+ bagues vendues
- 2 nouveautés/semaine, panier moyen ~120 CHF
- Clientèle = femmes 25-55 ans, sensibles au design, prix accessible

CRITÈRES D'ÉVALUATION D'UNE OFFRE :
1. **Clarté** : l'offre est-elle compréhensible en 5 secondes ?
2. **Urgence** : y a-t-il une raison d'agir maintenant (deadline, quantité limitée) ?
3. **Valeur perçue** : le client a-t-il l'impression de faire une bonne affaire sans dévaloriser la marque ?
4. **Cohérence Mood** : compatible avec le positionnement minimaliste-poétique-premium-accessible ?
5. **Faisabilité opérationnelle** : peut-on l'exécuter (stock, équipe, IT) ?
6. **Potentiel de conversion** : combien de clients sont susceptibles d'agir ?
7. **Risque image** : peut-elle dévaloriser la marque (trop d'agressivité commerciale, promo trop fréquente, etc.) ?
8. **Saisonnalité / timing** : la date est-elle pertinente (Saint-Valentin, fête des mères, Black Friday) ?

PATTERNS GAGNANTS chez Mood :
- Packs "starter" (base + 1 addon)
- Bundles thématiques (Noël, Saint-Valentin)
- "1 acheté = 1 mini offert"
- Édition limitée numérotée
- Cadeau d'achat à partir d'un seuil
- Exclusif newsletter / VIP

ANTI-PATTERNS à éviter :
- Promo sèche sans story (juste -X%)
- Réduction sur best-seller (marge sacrifiée pour rien)
- Trop fréquent (les clients attendent les promos = casse le plein tarif)
- Bundle complexe à comprendre
- Offre sans deadline (urgence absente = pas d'action)
- Mismatch avec saisonnalité

FORMAT DE RÉPONSE (JSON STRICT) :
{
  "score": 1-5,
  "verdict": "1 phrase punchy qui dit si l'offre vaut la peine ou pas",
  "atouts": ["atout 1", "atout 2", ...],         // 2-5 atouts concrets
  "risques": ["risque 1", "risque 2", ...],       // 1-3 risques
  "ameliorations": ["amelioration 1", ...],        // 2-4 suggestions concrètes pour booster l'offre
  "verdict_final": "GO | TWEAK | NOGO",            // GO=lancer tel quel · TWEAK=lancer après ajustements · NOGO=ne pas lancer
  "timing_adapte": true|false                       // la date est-elle bien choisie ?
}`;

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { offre, date, produitNom, contexte } = body || {};

  if (!offre || !offre.trim())
    return NextResponse.json({ error: 'champ "offre" requis' }, { status: 400 });

  let dateHint = "";
  if (date) {
    try {
      const d = new Date(date + "T12:00:00");
      const NOMS_MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
      dateHint = `Date prévue : ${d.getDate()} ${NOMS_MOIS[d.getMonth()]} ${d.getFullYear()}`;
    } catch { /* skip */ }
  }

  const briefParts = [
    `OFFRE PROPOSÉE :\n${offre.trim()}`,
    dateHint,
    produitNom ? `Nouveauté liée : « ${produitNom} »` : null,
    contexte && `Contexte : ${contexte}`,
  ].filter(Boolean).join("\n\n");

  const prompt = `${ADN_EVAL_OFFRES}

--- OFFRE À ÉVALUER ---
${briefParts}

--- ÉVALUATION ---
RÉPONSE OBLIGATOIRE — JSON STRICT, RIEN D'AUTRE.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1500,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        },
      }),
    });
    if (!r.ok) {
      const data = await r.json();
      return NextResponse.json({ error: "erreur Gemini", detail: data }, { status: r.status });
    }
    const data = await r.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!txt) return NextResponse.json({ error: "réponse Gemini vide" }, { status: 500 });
    const parsed = JSON.parse(txt);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
