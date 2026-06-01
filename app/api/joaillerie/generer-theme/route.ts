// Génère un thème visuel pour une page "création du mois" via Gemini.
// Reçoit nom + mood/thème, retourne un JSON strict (palette, typo, style hero, ambiance).

import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const PROMPT = `Tu es directeur artistique pour Mood Joaillerie (haute joaillerie suisse, pièces 5-10K CHF).

OBJECTIF : générer un thème visuel COHÉRENT pour une page web "création du mois", à partir du nom de la collection + son mood/inspiration. Le thème doit refléter l'univers de la collection (mythologie marine = nacre/or, forêt = vert/cuivre, hiver = indigo/argent, etc.).

CONTRAINTES :
- Palette = 5 couleurs en hex, harmonieuses, chic, jamais saturées
- Typo = 1 serif italique pour titres + 1 sans-serif pour labels (parmi : "Cormorant Garamond", "Playfair Display", "Marcellus", "EB Garamond", "Cinzel", "Inter", "Montserrat")
- Le fond principal doit être TRÈS CLAIR (ou TRÈS SOMBRE si la collection est nocturne/profonde), texte contrasté
- L'accent est une couleur métallique qui rappelle l'univers (or pour marine/nacre, cuivre pour forêt, argent pour hiver, etc.)
- ambiance_label : 2-4 mots qui résument le mood visuel

RÉPONSE OBLIGATOIRE — JSON STRICT, rien d'autre :
{
  "ambiance_label": "Luxe nacré marin",
  "palette": {
    "fond_principal": "#fdf8ef",
    "fond_secondaire": "#f5e8d8",
    "accent_metal": "#b88d3e",
    "texte_titre": "#1a1410",
    "texte_corps": "#4a3f33"
  },
  "typo": {
    "serif_titre": "Cormorant Garamond",
    "sans_label": "Inter"
  },
  "style_hero": "image_avec_overlay_clair"
}

style_hero possibles : "image_avec_overlay_clair" | "image_avec_overlay_sombre" | "gradient_seul" | "minimal_uni"`;

export async function POST(request: Request) {
  if (!GEMINI_KEY) return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });
  let body: { nom?: string; mood?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const { nom = "", mood = "" } = body;
  if (!nom && !mood) return NextResponse.json({ error: "nom et/ou mood requis" }, { status: 400 });

  const prompt = `${PROMPT}

COLLECTION À HABILLER :
Nom : ${nom || "(non précisé)"}
Mood / inspiration : ${mood || "(non précisé)"}

Génère le thème visuel JSON.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 800,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
      },
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    return NextResponse.json({ error: `Gemini ${r.status}`, detail: err.slice(0, 300) }, { status: 502 });
  }
  const data = await r.json();
  const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  let theme;
  try { theme = JSON.parse(txt); } catch {
    return NextResponse.json({ error: "Gemini n'a pas retourné un JSON valide", raw: txt.slice(0, 500) }, { status: 502 });
  }
  return NextResponse.json({ ok: true, theme });
}
