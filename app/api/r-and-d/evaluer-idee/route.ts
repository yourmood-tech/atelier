import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const ADN_EVAL = `Tu es l'adjoint stratégique d'Amila Pousaz, designer chez Mood Collection. Ton rôle : ÉVALUER la pertinence d'une idée de pépite créative AVANT lancement, et donner un avis honnête.

CRITÈRES D'ÉVALUATION (basés sur les patterns Mood réels) :

1. NOUVEAUTÉ RADICALE (poids fort)
   - L'idée propose-t-elle un matériau / format / design jamais vu chez Mood ?
   - Ou est-ce une variation cosmétique d'un produit existant ?

2. DÉCLINABILITÉ (poids fort)
   - L'idée peut-elle se décliner facilement (couleurs, pierres, finitions, saisons) ?
   - Une pépite déclinable génère plus de CA qu'une pièce isolée

3. ACCESSIBILITÉ (poids moyen)
   - Le prix prévu est-il atteignable pour la cliente moyenne Mood ?
   - Les hits Mood sont souvent des "chic à petit prix" (Aura authentique = exemple parfait)

4. ALIGNEMENT INSIGHTS CLIENTS (poids moyen)
   - Préférences observées : deux-tiers > addon > medium > mini · base XS > S > L · zircons > diamants · acier neutre / rose gold > or jaune · noir aimé pour collections dark/homme
   - Saisonnalité : fluo/été · bleu+blanc/hiver · pastel/printemps · chaud/automne
   - Si l'idée s'aligne sur ces préférences → +
   - Si l'idée est format adoré (deux-tiers ou mini) → +
   - Si l'idée propose une couleur saisonnière non encore exploitée → +

5. RISQUE DE FLOP (poids fort)
   - Trop similaire à un produit existant ? (cause #1 de flop)
   - Trop spécifique / trop niche ? (Hanibara = exemple)
   - Recombinaison de 2 hits sans nouvelle dimension ? (Vertige = exemple)

6. FAISABILITÉ TECHNIQUE
   - Sertissage zircons → Icelea uniquement
   - Sertissage pierres précieuses → bijouterie interne
   - Topaze / émeraude / améthyste : PAS sur acier
   - 1 matière par pièce (pas de mix polymère + argent)
   - Si l'idée enfreint ces règles → ❌ infaisable

CONNAISSANCE FACTS MOOD :
- HITS confirmés : Aura authentique (zircons full serti), Minis (nouveau format), Mini Aura, packs de minis, certains coffrets saisonniers
- FLOPS confirmés : Hanibara (trop spécifique), Vertige (mix cœur+zircons sans nouveauté)
- 18 500+ avis Judge.me — qualité de finition très valorisée, sertissage fragile critiqué
- 2 nouveautés/semaine = cadence intense → toute pépite doit se distinguer

TON OUTPUT — JSON STRICT :
{
  "score_global": 1-5 (5 = pépite confirmée, 1 = risque de flop important),
  "score_nouveaute": 1-5,
  "score_declinabilite": 1-5,
  "score_alignement_clients": 1-5,
  "risques": ["risque 1", "risque 2", ...],
  "atouts": ["atout 1", "atout 2", ...],
  "comparaison_existant": "Cette idée ressemble à X (hit) / Y (flop)..." (si applicable, sinon null),
  "recommandations": ["reco 1", "reco 2", ...],
  "verdict": "1-2 phrases de synthèse honnête sur le potentiel"
}`;

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { idee } = body || {};

  if (!idee || !idee.nom)
    return NextResponse.json({ error: 'champ "idee" requis avec au moins un nom' }, { status: 400 });

  const ideeContexte = [
    `Nom : ${idee.nom}`,
    idee.type && `Type : ${idee.type}`,
    idee.matiere && `Matière : ${idee.matiere}`,
    idee.couleur && `Couleur : ${idee.couleur}`,
    idee.pierre && `Pierre : ${idee.pierre}`,
    idee.fournisseur && `Fournisseur prévu : ${idee.fournisseur}`,
    idee.objectifCA && `Objectif CA : ${idee.objectifCA} CHF`,
    idee.notes && `Notes / description : ${idee.notes}`,
  ].filter(Boolean).join('\n');

  const prompt = `${ADN_EVAL}

--- IDÉE À ÉVALUER ---
${ideeContexte}

${idee.image ? "Une image / croquis / photo proto est jointe ci-dessous — analyse aussi le visuel." : ""}

--- ÉVALUATION ---
RÉPONSE OBLIGATOIRE — JSON STRICT, RIEN D'AUTRE.`;

  // Construire les parts avec image si dispo
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  if (idee.image && typeof idee.image === 'string' && idee.image.startsWith('data:image/')) {
    const match = idee.image.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: "erreur Gemini", detail: data }, { status: r.status });
    }
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
