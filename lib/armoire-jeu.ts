// Mon Armoire Mood — le "jeu" (vignettes + paliers), partagé client & admin.
import type { ArmoireResult } from "./shopify";

export const ALBUM = {
  nom: "Collection Hibiscus",
  emoji: "🌺",
  vignettes: [
    { id: "hib-1", nom: "Pétale", emoji: "🌸" },
    { id: "hib-2", nom: "Rubis", emoji: "❤️" },
    { id: "hib-3", nom: "Corail", emoji: "🪸" },
    { id: "hib-4", nom: "Nacre", emoji: "🤍" },
    { id: "hib-5", nom: "Or chaud", emoji: "✨" },
    { id: "hib-6", nom: "Fleur rare", emoji: "💎" },
  ],
};

// On gagne en achetant (3 vignettes / commande) + en participant (mood du jour, côté appli).
export const VIGNETTES_PAR_COMMANDE = 3;

// Paliers de saison (récompense = vraie carotte Mood)
export const PALIERS = [
  { seuil: 150, recompense: "Une mini offerte à ta prochaine compo" },
  { seuil: 300, recompense: "Accès en avant-première aux pépites" },
  { seuil: 500, recompense: "Gravure offerte + statut Mood Lover VIP" },
];

export function buildJeu(armoire: ArmoireResult) {
  const vignettesAchat = armoire.stats.commandes * VIGNETTES_PAR_COMMANDE;
  const depense = armoire.stats.totalDepense;
  const prochain = PALIERS.find((p) => depense < p.seuil) ?? null;
  const atteints = PALIERS.filter((p) => depense >= p.seuil);
  return {
    album: ALBUM,
    vignettesAchat,
    palier: {
      depense,
      devise: armoire.stats.devise,
      prochain,
      recompensesDebloquees: atteints.map((p) => p.recompense),
    },
  };
}
