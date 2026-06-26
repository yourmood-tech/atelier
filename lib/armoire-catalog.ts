// Catalogue des jeux mood et des objets déco débloquables.

// Comptes staff avec accès illimité (preview complet sans n° de commande).
export const STAFF_EMAILS = new Set<string>([
  "amila@yourmood.net",
  "philippe@yourmood.net",
  "stephanie@yourmood.net",
]);
export function isStaffEmail(email: string): boolean {
  return STAFF_EMAILS.has((email || "").trim().toLowerCase());
}

export type GameDef = { id: string; nom: string; emoji: string; jouable: boolean };
export type DecoDef = { id: string; nom: string; emoji: string; type: DecoType; valeur: string };
export type DecoType = "mur" | "sol" | "armoire" | "plante" | "cadre" | "objet";

export const GAMES: GameDef[] = [
  { id: "memoire", nom: "Mémoire mood", emoji: "🧠", jouable: true },
  { id: "differences", nom: "Jeu des différences", emoji: "🔍", jouable: false },
  { id: "sudoku", nom: "Sudoku mood", emoji: "🔢", jouable: false },
  { id: "quizz", nom: "Quizz mood", emoji: "❓", jouable: false },
  { id: "puzzle", nom: "Puzzle mood", emoji: "🧩", jouable: false },
  { id: "motsmeles", nom: "Mots mêlés mood", emoji: "🔤", jouable: false },
];

// type = à quoi sert l'objet dans la pièce ; valeur = couleur (hex) ou icône.
export const DECO: DecoDef[] = [
  { id: "mur-blush", nom: "Mur blush", emoji: "🩷", type: "mur", valeur: "#f3e3e0" },
  { id: "mur-sauge", nom: "Mur vert sauge", emoji: "🌿", type: "mur", valeur: "#dfe7dc" },
  { id: "mur-ivoire", nom: "Mur ivoire", emoji: "🤍", type: "mur", valeur: "#f6efe6" },
  { id: "sol-bois", nom: "Sol bois clair", emoji: "🪵", type: "sol", valeur: "#e4cfa8" },
  { id: "sol-terrazzo", nom: "Sol terrazzo", emoji: "⬜", type: "sol", valeur: "#ece7df" },
  { id: "armoire-noyer", nom: "Armoire noyer", emoji: "🟤", type: "armoire", valeur: "#8f6440" },
  { id: "armoire-blanc", nom: "Armoire blanche", emoji: "⬜", type: "armoire", valeur: "#efe7dd" },
  { id: "armoire-or", nom: "Armoire or rose", emoji: "🌸", type: "armoire", valeur: "#d9a98a" },
  { id: "plante-monstera", nom: "Monstera", emoji: "🌿", type: "plante", valeur: "🌿" },
  { id: "plante-olivier", nom: "Olivier", emoji: "🪴", type: "plante", valeur: "🪴" },
  { id: "plante-fleurs", nom: "Bouquet hibiscus", emoji: "🌺", type: "plante", valeur: "🌺" },
  { id: "cadre-photo", nom: "Cadre photo", emoji: "🖼️", type: "cadre", valeur: "🖼️" },
  { id: "tapis", nom: "Tapis moelleux", emoji: "🟫", type: "objet", valeur: "🟫" },
  { id: "lampe", nom: "Lampe d'ambiance", emoji: "💡", type: "objet", valeur: "💡" },
  { id: "bougie", nom: "Bougie parfumée", emoji: "🕯️", type: "objet", valeur: "🕯️" },
  { id: "miroir", nom: "Miroir doré", emoji: "🪞", type: "objet", valeur: "🪞" },
];

export function gameById(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
export function decoById(id: string): DecoDef | undefined {
  return DECO.find((d) => d.id === id);
}
