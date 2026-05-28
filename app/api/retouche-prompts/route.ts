import { NextResponse } from "next/server";
import {
  PROMPTS,
  THEME_OVERLAYS,
  THEME_PORTEE_PROMPTS,
  THEME_PORTEE_PROMPTS_HOMME,
} from "../retouche-photo/route";

// Labels lisibles pour chaque clé technique
const LABELS_ACTIONS: Record<string, string> = {
  "fond-blanc": "Fond blanc (packshot catalogue)",
  "fond-anthracite": "Fond anthracite",
  "amelioration": "Amélioration (nettoyage + redressement)",
  "lumiere-contraste": "Lumière & contraste",
  "theme-printemps": "Thème Printemps",
  "theme-ete": "Thème Été",
  "theme-automne": "Thème Automne",
  "theme-hiver": "Thème Hiver",
  "theme-terre-dombre": "Thème Terre d'ombre",
  "bague-portee": "Bague portée (close-up éditorial)",
  "coffret": "Coffret Mood",
  "redimensionner-bague": "Redimensionner bague (changer largeur)",
  "produit-multiple": "Produit multiple (2-6 bagues)",
};

const LABELS_THEMES: Record<string, string> = {
  "lifestyle": "Lifestyle (souvenir voyage)",
  "in-the-mood-for": "In the mood for (soft luxury cosy)",
  "pastel": "Pastel (anneaux assortis bokeh)",
  "beton": "Béton (luxe urbain minéral)",
  "zanzibar": "Zanzibar (luxe minimaliste océan)",
  "pur-white": "Pur White (Joaillerie cristallin)",
  "black-joaillerie": "Black Joaillerie",
  "sakura": "Sakura (printemps Jacquemus)",
  "riviera": "Riviera (été méditerranéen)",
  "tropical": "Tropical (végétal sombre)",
  "terre-olive": "Terre Olive (silent luxury)",
  "terre-dombre": "Terre d'ombre (Jacquemus)",
};

export async function GET() {
  // Sépare les actions de retouche (PROMPTS) et les thèmes (overlays + portée)
  const actions = Object.entries(PROMPTS).map(([key, prompt]) => ({
    key,
    label: LABELS_ACTIONS[key] || key,
    prompt,
  }));

  const themesAmbiance = Object.entries(THEME_OVERLAYS).map(([key, prompt]) => ({
    key,
    label: LABELS_THEMES[key] || key,
    prompt,
  }));

  const themesPorteeFemme = Object.entries(THEME_PORTEE_PROMPTS).map(([key, prompt]) => ({
    key,
    label: LABELS_THEMES[key] || key,
    prompt,
  }));

  const themesPorteeHomme = Object.entries(THEME_PORTEE_PROMPTS_HOMME).map(([key, prompt]) => ({
    key,
    label: LABELS_THEMES[key] || key,
    prompt,
  }));

  return NextResponse.json({
    actions,
    themesAmbiance,
    themesPorteeFemme,
    themesPorteeHomme,
  });
}
