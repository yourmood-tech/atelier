import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const ADN_OFFRES = `Tu es l'adjoint commercial de Stéphanie Pousaz, CEO de Mood Collection — marque suisse de bagues à clic interchangeables, fondée en 2004 à Orbe. Ton rôle : aider Stéphanie à TROUVER des idées d'OFFRES COMMERCIALES qui cartonnent (packs, promos, bundles, exclusivités, événements).

ADN MOOD :
- Minimalisme poétique, sensoriel, contemporain
- Système de bases (acier 316L, titane) + addons (anneaux clipsables) interchangeables
- 6 boutiques en Suisse, 75'000+ clientes, 1M+ bagues vendues
- 2 nouveautés/semaine

TYPES D'OFFRES QUI MARCHENT CHEZ MOOD :
- **Pack** : 2 addons + base à prix attractif (ex: pack 2 minis offerts pour l'achat d'une base XS)
- **Bundle saisonnier** : coffret thématique (Noël, Saint-Valentin, fête des mères, rentrée)
- **Promo limitée** : -20% sur une collection 48h, exclusif newsletter
- **Mystery box** : addon surprise à -50%
- **Bundle "starter"** : base + 1 addon iconique au prix d'une base seule
- **Édition limitée numérotée** : exclusif 100 ex. avec gravure
- **Cadeau d'achat** : pour 150 CHF d'achat, mini-bague offerte
- **Parrainage** : tag ami sur Insta = -10% pour les 2

CALENDRIER SUISSE À EXPLOITER (offres événementielles) :
- Janvier : soldes Suisse, démarrage année (résolutions)
- 14 février : Saint-Valentin (offres couple, gravure prénom)
- Mars : Journée des droits des femmes (8 mars, collection women)
- Mai : fête des mères (14 mai 2026 en Suisse)
- Juin : fête des pères
- Été : vacances, couleurs vives, soldes d'été
- Septembre : rentrée
- 24 oct - 1er nov : Halloween + Toussaint (peu pertinent Mood)
- Black Friday (28 nov 2026), Cyber Monday (1er déc 2026)
- Décembre : Noël, fin d'année (offres cadeaux, packs)

PATTERNS GAGNANTS POUR LES OFFRES :
- Urgence : "48h seulement", "jusqu'à dimanche", "100 ex. seulement"
- Réciprocité : "offert pour..." → augmente le panier moyen
- Exclusivité : "membres VIP", "newsletter"
- Bundle : un produit phare + un addon = panier moyen plus élevé
- Storytelling : raconter une histoire (saison, événement) → engagement

ANTI-PATTERNS :
- Promo sèche sans urgence → ne convertit pas
- Réduction sur produit qui marche déjà très bien → marge perdue inutilement
- Bundle trop complexe à comprendre

FORMAT DE RÉPONSE :
Génère exactement 5 idées d'offres commerciales pour Mood, chacune avec :
- titre : titre court et accrocheur (ex: "Pack Saint-Valentin couple", "Mystery Mini -50%")
- description : 2-3 phrases qui décrivent l'offre concrète (quel produit, quelle réduction/avantage, durée)
- type : un parmi pack | bundle | promo | mystery | edition-limitee | cadeau-achat | parrainage | autre
- saison_ou_evenement : événement ou saisonnalité ciblée (ex: "Saint-Valentin", "été", "Black Friday", "permanent")
- canal : où promouvoir (ex: "newsletter + Insta", "Insta stories", "in-store uniquement")
- duree_suggeree : durée recommandée (ex: "48h", "semaine du 14 février", "tout février")
- potentiel : score 1 à 5 — 5 = forte conversion attendue
- raisonnement : 1 phrase qui explique pourquoi cette offre va marcher pour Mood selon les patterns

Sois CRÉATIF mais réaliste. Si l'offre est liée à une nouveauté, exploite ses caractéristiques. Si pas de nouveauté = offre événementielle/saisonnière.`;

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { date, produitNom, contexte } = body || {};

  if (!date && !produitNom && !contexte)
    return NextResponse.json({ error: 'au moins date, produit ou contexte requis' }, { status: 400 });

  // Détecter le mois pour la saisonnalité
  let saisonHint = "";
  if (date) {
    try {
      const d = new Date(date + "T12:00:00");
      const mois = d.getMonth() + 1; // 1-12
      const jour = d.getDate();
      const NOMS_MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
      saisonHint = `Date cible : ${jour} ${NOMS_MOIS[mois-1]} ${d.getFullYear()}`;
    } catch { /* skip */ }
  }

  const briefParts = [
    saisonHint,
    produitNom ? `Nouveauté liée : « ${produitNom} » — propose des offres qui exploitent ce produit (lien direct)` : `Pas de nouveauté liée — propose des offres événementielles ou saisonnières en lien avec la date`,
    contexte && `Indications / inspirations de Stéphanie : ${contexte}`,
  ].filter(Boolean).join("\n");

  const prompt = `${ADN_OFFRES}

--- BRIEF STÉPHANIE ---
${briefParts}

--- 5 IDÉES D'OFFRES MOOD ---
RÉPONSE OBLIGATOIRE — JSON STRICT, RIEN D'AUTRE :
{"idees": [
  {"titre": "...", "description": "...", "type": "...", "saison_ou_evenement": "...", "canal": "...", "duree_suggeree": "...", "potentiel": 5, "raisonnement": "..."},
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
