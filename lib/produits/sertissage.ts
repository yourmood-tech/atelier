/**
 * Tables de sertissage automatique pour bases serties et mediums sertis (Mood Joaillerie).
 *
 * Source : Amila Pousaz, 2026-05-08.
 * Référence visuelle : /Users/amila/Downloads/BASES SERTIES.pdf
 *
 * Logique :
 * - Les chiffres ci-dessous = nombre de pierres pour UN SEUL côté (= base 1 côté = medium semi-serti)
 * - Pour 2 côtés (= base 2 côtés = medium entièrement serti) : multiplier par 2
 * - Carats = nb_pierres × poids_pierre (poids_pierre dépend de la taille mm)
 *
 * Note : la table est identique pour TOUTES les pierres (saphirs, émeraudes, rubis, etc.)
 * — c'est la circonférence de la bague qui dicte le nombre de pierres, pas le type.
 * Les carats sont approximés via la densité du diamant (précision ~10% pour autres pierres).
 */

// Poids approximatif d'une pierre selon sa taille (en carats)
// Pour diamants : FACT depuis BASES SERTIES.pdf
// Pour autres pierres : estimation par volume (densité quasi identique aux diamants)
export const POIDS_PIERRE_CARAT: Record<string, number> = {
  "0.9mm": 0.003,    // estimation — extrapolation volumique depuis 1.6mm
  "1.3mm": 0.010,    // estimation
  "1.6mm": 0.018,    // FACT — 0.648 / 36 (diamant)
  "1.75mm": 0.023,   // estimation — interpolation entre 1.6 et 1.9
  "1.9mm": 0.028,    // FACT — 0.952 / 34 (diamant)
  "2.1mm": 0.0363,   // FACT — 1.0164 / 28 (diamant)
  "2.5mm": 0.060,    // estimation pour cabochons
};

/**
 * Longueur de circonférence externe de l'anneau, en mm, par taille de bague.
 * Source : Amila Pousaz 2026-05-08 (table dimensions anneaux Mood).
 */
export const LONGUEUR_ANNEAU_MM: Record<number, number> = {
  50: 63.10,
  52: 64.99,
  54: 67.19,
  56: 69.08,
  58: 70.96,
  60: 73.16,
  62: 75.05,
  64: 76.93,
  66: 79.13,
  68: 81.01,
  70: 82.89,
  72: 84.78, // interpolé (manquait dans la table d'origine)
};

/**
 * Nombre de pierres pour 1 côté/face, selon (taille_pierre, taille_bague).
 * Pour 2 côtés/full serti : multiplier par 2.
 *
 * Pour 0.9mm : calculé à partir de la longueur d'anneau (ratio ~0.99 mm/pierre).
 */
export const NB_PIERRES_PAR_COTE: Record<string, Record<number, number>> = {
  "0.9mm": {
    50: 64, 52: 66, 54: 68, 56: 70, 58: 72,
    60: 74, 62: 76, 64: 78, 66: 80, 68: 82,
    70: 84, 72: 86,
  },
  "1.6mm": {
    50: 36, 52: 38, 54: 40, 56: 42, 58: 42,
    60: 44, 62: 46, 64: 46, 66: 48, 68: 48,
    70: 50, 72: 50,
  },
  "1.9mm": {
    50: 34, 52: 34, 54: 36, 56: 36, 58: 38,
    60: 38, 62: 40, 64: 40, 66: 42, 68: 42,
    70: 44, 72: 45,
  },
  "2.1mm": {
    50: 28, 52: 30, 54: 30, 56: 32, 58: 32,
    60: 34, 62: 34, 64: 36, 66: 36, 68: 38,
    70: 38, 72: 40,
  },
  "1.75mm": {
    50: 34, 52: 36, 54: 36, 56: 38, 58: 38,
    60: 40, 62: 40, 64: 42, 66: 42, 68: 44,
    70: 44, 72: 46,
  },
};

/**
 * Compatibilité d'une taille de pierre avec une largeur de base.
 * - Base large (BL) : accepte UNIQUEMENT 2.1mm OU 0.9mm
 * - Base small (BS) ou extra small (BXS) : accepte toutes les pierres SAUF 2.1mm
 *
 * @param largeurBase "xs" | "s" | "l"
 * @param taillePierre "0.9mm" | "1.6mm" | etc.
 * @returns true si compatible
 */
export function pierreCompatibleAvecBase(largeurBase: string, taillePierre: string): boolean {
  const lb = largeurBase.toLowerCase();
  if (lb === "l") {
    return taillePierre === "2.1mm" || taillePierre === "0.9mm";
  }
  if (lb === "xs" || lb === "s") {
    return taillePierre !== "2.1mm";
  }
  return false;
}

/**
 * Calcule le poids total en carats d'un produit avec plusieurs pierres.
 * Utilise POIDS_PIERRE_CARAT pour chaque taille.
 *
 * @param pierres tableau d'objets { taille: "1.6mm", quantite: 36 }
 * @returns poids total en carats (arrondi à 4 décimales), ou null si une taille n'a pas de poids défini
 */
export function calculerCaratsTotal(
  pierres: Array<{ taille: string; quantite: number }>
): number | null {
  if (!pierres || pierres.length === 0) return null;
  let total = 0;
  for (const p of pierres) {
    const poidsUnit = POIDS_PIERRE_CARAT[p.taille];
    if (poidsUnit === undefined) return null;
    total += poidsUnit * (p.quantite || 0);
  }
  return +total.toFixed(4);
}

export type TypeSertissage =
  | "medium-full"
  | "medium-semi"
  | "base-1-cote"
  | "base-2-cotes";

/**
 * Calcule le nombre de pierres et le poids total en carats
 * pour un produit serti (medium ou base).
 */
export function calculerSertissage(params: {
  taillePierre: string;
  tailleBague: number;
  typeSertissage: TypeSertissage;
}): { nbPierres: number; carats: number | null } {
  const { taillePierre, tailleBague, typeSertissage } = params;

  const tableTaille = NB_PIERRES_PAR_COTE[taillePierre];
  if (!tableTaille) {
    throw new Error(`Taille de pierre non gérée : ${taillePierre}`);
  }
  const nbParCote = tableTaille[tailleBague];
  if (nbParCote === undefined) {
    throw new Error(`Taille de bague non gérée : ${tailleBague}`);
  }

  const nbCotes =
    typeSertissage === "medium-full" || typeSertissage === "base-2-cotes"
      ? 2
      : 1;
  const nbPierres = nbParCote * nbCotes;

  const poidsUnit = POIDS_PIERRE_CARAT[taillePierre];
  const carats =
    poidsUnit !== undefined ? +(poidsUnit * nbPierres).toFixed(4) : null;

  return { nbPierres, carats };
}

export const TYPES_SERTISSAGE: Array<{
  id: TypeSertissage;
  label: string;
  cotes: number;
  contexte: "medium" | "base";
}> = [
  { id: "medium-full", label: "Medium entièrement serti", cotes: 2, contexte: "medium" },
  { id: "medium-semi", label: "Medium semi-serti", cotes: 1, contexte: "medium" },
  { id: "base-1-cote", label: "Base sertie d'un côté", cotes: 1, contexte: "base" },
  { id: "base-2-cotes", label: "Base sertie des deux côtés", cotes: 2, contexte: "base" },
];

export const TAILLES_BAGUE_SERTIES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];

export const TAILLES_PIERRE_PAR_TYPE: Record<string, string[]> = {
  diamant: ["0.8mm", "0.9mm", "1.3mm", "1.6mm", "1.9mm", "2.1mm"],
  "diamant-noir": ["0.8mm", "1.3mm", "1.6mm", "1.9mm"],
  "diamant-brun": ["1.6mm", "1.9mm"],
  "diamant-ice-gris": ["1.6mm", "1.9mm"],
  "diamant-pur-rose": ["2.1mm"],
  topaze: ["1.75mm"],
  saphir: ["0.9mm", "1.3mm", "1.6mm", "1.9mm"],
  emeraude: ["0.9mm", "1.6mm", "1.9mm"],
  rubis: ["0.9mm", "1.6mm", "1.9mm"],
  amethyste: ["1.6mm", "1.9mm"],
  grenat: ["1.3mm", "1.6mm", "1.9mm"],
  tsavorite: ["1.6mm"],
  cabochon: ["2.5mm"],
};
