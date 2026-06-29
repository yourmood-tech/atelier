// ─── Correspondances de couleurs Coloral (source unique) ────────────────────────
// Le nom de couleur dans Katana (fin du SKU, ex. "ROSEP") ne correspond pas toujours
// au libellé de la colonne dans le fichier de commande Coloral (ex. "Rose Pastel").
// Ce module fait le pont, et sert à la fois à l'export .xlsx (lib/coloral/order.ts)
// et à la recommandation de réassort (app/reassort/page.tsx).
//
// Régénérer COLORAL_FILE_COLORS avec `node scripts/scan-coloral-colors.mjs` si le
// gabarit fournisseur embarqué (template-b64.ts) change.

// Normalise une couleur pour comparaison : minuscules, sans accents, sans code Pantone
// (938C, 2757C…), sans contenu entre parenthèses, sans chiffres ni ponctuation.
export function normColor(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/p?\d{2,4}\s*c\b/gi, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Le gabarit fournisseur écrit une même couleur de plusieurs façons selon la feuille.
// "lila" (lila 2071C), "lila cashmer", "lila caschmere" et "Lila Cashmere" sont
// TOUS la même couleur (confirmé Philippe) → on les ramène à une seule graphie.
export function canonFileColor(n: string): string {
  if (n === "lila" || n === "lila cashmer" || n === "lila caschmere") return "lila cashmere";
  return n;
}

// Nom Katana (normalisé) → nom fichier Coloral (normalisé). Casse ignorée (normColor).
// PRIORITAIRE sur une correspondance directe : ex. Katana "JAUNE" vise la colonne
// "Jaune Chaud", pas la colonne "Jaune" qui existe aussi dans le fichier.
export const COLORAL_COLOR_ALIASES: Record<string, string> = {
  rosep: "rose pastel",
  jaunechaud: "jaune chaud",
  lagonbleu: "bleu lagon",
  jaune: "jaune chaud",
  anth: "anthracite",
  bleuviolet: "bleu violet",
  lilacashmere: "lila cashmere",
  // "lila" (Katana) et "lila 2071C" (fichier) = lila cashmere : géré par canonFileColor.
  bleupastel: "bleu pastel",
  vertpastel: "vert pastel",
  jaunepastel: "jaune pastel",
};

// Résout une couleur Katana vers le nom normalisé attendu dans le fichier (alias d'abord).
export function resolveColoralColor(rawColor: string): string {
  const n = canonFileColor(normColor(rawColor));
  const aliased = COLORAL_COLOR_ALIASES[n];
  return aliased ? canonFileColor(aliased) : n;
}

// Couleurs réellement présentes dans le gabarit Coloral, par type d'anneau (normalisées,
// graphies du fichier unifiées). Généré depuis template-b64.ts — voir scripts/scan-coloral-colors.mjs.
export const COLORAL_FILE_COLORS: Record<string, ReadonlySet<string>> = {
  // anneaux 7.1 mm  (lila 2071C + LILA CASCHMERE = lila cashmere)
  ALU: new Set([
    "aubergine", "belinda", "bleu marine", "bleu pastel", "bleu violet", "emeraude", "gris",
    "jaune", "jaune chaud", "jaune pastel", "lila cashmere", "myrtille", "noir", "noisette",
    "ocre", "pourpre", "rouge", "taupe", "turquoise", "vert", "vert kale kaki", "vert mood",
    "vert pastel",
  ]),
  // anneaux 4.8mm  (lila 2071C = lila cashmere)
  "23ALU": new Set([
    "abricot", "anthracite", "belinda", "bleu marine", "bleu pastel", "caramel", "corail",
    "emeraude", "jaune chaud", "kaki", "lila cashmere", "marine", "noisette", "ocre", "orange",
    "peche", "pistache", "rouge", "rubis", "taupe", "turquoise", "vert kale kaki",
    "vert mood", "vert pastel", "violet",
  ]),
  // mediums 2,4mm
  MEDALU: new Set([
    "abricot", "anthracite", "aubergine", "belinda", "bleu lagon", "bleu marine",
    "bleu pastel", "brun", "chili pepper", "corail", "emeraude", "gris", "jaune chaud",
    "jaune clair", "lila cashmere", "menthe", "myrtille", "noir", "noisette", "ocre",
    "peche", "petrole", "rose pastel", "rouge", "taupe", "turquoise", "vert kale kaki",
    "vert mood", "vert pastel", "violet",
  ]),
  // anneaux 1.22mm
  MINIALU: new Set([
    "abricot", "anthracite", "aubergine", "belipastel", "bleu marine", "jaune pastel",
    "lila cashmere", "marine", "myrtille", "ocre", "pourpre", "rose pastel", "rouge",
    "taupe", "turquoise", "vert kale kaki", "violet",
  ]),
};

// La couleur Katana est-elle commandable chez Coloral pour ce type d'anneau ?
// (présente dans le fichier directement, ou via un alias). Sinon → on ne la commande pas.
export function coloralColorInFile(type: string, rawColor: string): boolean {
  const set = COLORAL_FILE_COLORS[type];
  if (!set) return false;
  return set.has(resolveColoralColor(rawColor));
}
