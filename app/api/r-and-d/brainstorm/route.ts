import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const ADN_MOOD = `Tu es l'adjoint créatif d'Amila Pousaz, designer chez Mood Collection — marque suisse de bagues à clic interchangeables, fondée en 2004 à Orbe. Ton rôle : aider Amila à TROUVER des idées de NOUVEAUTÉS qui cartonnent.

ADN MOOD :
- Minimalisme poétique, sensoriel, contemporain
- "Choose your mood" : système de bases (acier, titane) + addons (anneaux clipsables) interchangeables
- 6 boutiques en Suisse, 75'000+ clientes, 1M+ bagues vendues
- 2 nouveautés/semaine — la cadence est tendue
- Designer : Amila

PATTERNS GAGNANTS (à reproduire) :
- NOUVEAUTÉ RADICALE : matériau jamais utilisé, format jamais vu, design inédit
- DÉCLINABLE : permet plusieurs versions (couleurs, pierres, finitions)
- ACCESSIBLE : prix attrapable, pas que pour clients VIP
- Exemples de HITS confirmés :
  • Aura authentique : 1er zircons full serti = chic à petit prix → décliné en plusieurs couleurs
  • Minis : nouveau format jamais vu → 6+ versions sorties, vendu en pack 2 minis ou 4 minis
  • Mini Aura : déclinaison à succès

ANTI-PATTERNS (à éviter) :
- Trop similaire à un produit existant
- Pas assez nouveau (variation cosmétique d'un hit existant)
- Mix de 2 hits existants (recombinaison sans réelle nouveauté)
- Trop spécifique / trop niche
- Exemples de FLOPS confirmés :
  • Hanibara : trop spécifique, perdu dans la cadence
  • Vertige : mix cœur + zircons sans réelle nouveauté

LEXIQUE MOOD (à utiliser dans tes propositions) :
- "addon" / "deux tiers" / "medium" / "mini" / "open mood" / "pack" / "base" / "coffret"
- "pepites créatives" (pour parler de nouveautés — JAMAIS le mot "nouveauté")
- Matières : acier 316L, titane, argent 925, or 9K/18K (rose, jaune, gris), céramique, tantale, aluminium anodisé, polymère, bronze, carbone
- Pierres précieuses : diamants (blanc/noir/brun/champagne), saphirs (toutes couleurs), émeraudes, rubis, topazes, améthystes, grenats, tsavorites
- Sertissages : full / semi / un côté / deux côtés / grain / invisible / neige

FORMAT DE TES PROPOSITIONS :
Génère exactement 5 idées de pépites créatives mood, chacune avec :
- nom : nom évocateur poétique (ex: "Aurora", "Onde", "Cocon Doré", "Mille Lumières")
- description : 1-2 phrases qui décrivent l'esprit, pourquoi c'est beau, pourquoi c'est nouveau
- type : un parmi addon | deux-tiers | medium | mini | base | open-mood | coffret | pack | starter-pack | boucles
- matiere : matière dominante
- couleur : couleur dominante (peut être null)
- pierre : type de pierre serti si applicable (peut être null)
- potentiel : score 1 à 5 — 5 = potentiel HIT confirmé (radical + déclinable + accessible)
- raisonnement : 1 phrase qui explique pourquoi cette idée a du potentiel selon les patterns Mood

Sois CRÉATIF mais réaliste : reste dans l'univers Mood, pas de propositions absurdes ou hors-marque.`;

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { theme, saison, contraintes } = body || {};

  if (!theme || !theme.trim())
    return NextResponse.json({ error: 'champ "theme" requis' }, { status: 400 });

  const contexte = [
    `Thème ou inspiration : ${theme}`,
    saison && `Saison / période : ${saison}`,
    contraintes && `Contraintes ou préférences : ${contraintes}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `${ADN_MOOD}

--- BRIEF AMILA ---
${contexte}

--- 5 IDÉES PÉPITES MOOD ---
RÉPONSE OBLIGATOIRE — JSON STRICT, RIEN D'AUTRE :
{"idees": [
  {"nom": "...", "description": "...", "type": "...", "matiere": "...", "couleur": "...", "pierre": "...", "potentiel": 5, "raisonnement": "..."},
  ... 4 autres ...
]}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
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
