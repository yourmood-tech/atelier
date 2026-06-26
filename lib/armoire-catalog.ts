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
export type DecoType = "mur" | "sol" | "armoire" | "plante" | "cadre" | "objet" | "accessoire";
// img = image photoréaliste (PNG transparent) servie depuis /public/chambre ; slot = emplacement dans la pièce.
export type DecoDef = { id: string; nom: string; emoji: string; type: DecoType; valeur: string; img?: string; slot?: string };

export const GAMES: GameDef[] = [
  { id: "memoire", nom: "Mémoire mood", emoji: "🧠", jouable: true },
  { id: "differences", nom: "Jeu des différences", emoji: "🔍", jouable: false },
  { id: "sudoku", nom: "Sudoku mood", emoji: "🔢", jouable: false },
  { id: "quizz", nom: "Quizz mood", emoji: "❓", jouable: false },
  { id: "puzzle", nom: "Puzzle mood", emoji: "🧩", jouable: false },
  { id: "motsmeles", nom: "Mots mêlés mood", emoji: "🔤", jouable: false },
];

// Palettes de couleur pour l'ARMOIRE CENTRALE (on recolore la vraie armoire à tiroirs).
export type ArmoirePalette = {
  cornice: string;
  bodyTop: string;
  bodyBottom: string;
  frame: string;
  faceTop: string;
  faceBottom: string;
  faceBorder: string;
  label: string; // couleur du texte sur l'étiquette
};
export const ARMOIRE_PALETTES: Record<string, ArmoirePalette> = {
  noyer: { cornice: "#8a6038", bodyTop: "#a3744a", bodyBottom: "#8f6440", frame: "#6f4d2c", faceTop: "#d8b083", faceBottom: "#c2945f", faceBorder: "#875f38", label: "#6b4f33" },
  blanc: { cornice: "#e7ddcd", bodyTop: "#f2ece2", bodyBottom: "#e7ddcd", frame: "#d6c8b4", faceTop: "#fbf6ee", faceBottom: "#efe6d6", faceBorder: "#d8cab4", label: "#6b5f4c" },
  orrose: { cornice: "#c98f74", bodyTop: "#e0b59c", bodyBottom: "#cf9d82", frame: "#b07c61", faceTop: "#f0cdb8", faceBottom: "#e0b095", faceBorder: "#bd8f72", label: "#7a5240" },
  sauge: { cornice: "#7e9277", bodyTop: "#a3b79b", bodyBottom: "#8fa686", frame: "#6c7f65", faceTop: "#cdd9c5", faceBottom: "#b3c4a9", faceBorder: "#7e9277", label: "#41513a" },
  noir: { cornice: "#2c2c2c", bodyTop: "#3c3a38", bodyBottom: "#2c2b29", frame: "#1d1c1b", faceTop: "#55514d", faceBottom: "#403d3a", faceBorder: "#24221f", label: "#f2ece2" },
};

// type = rôle dans la pièce ; valeur = clé palette (armoire), CSS background (mur/sol), ou clé d'illustration (plante/objet).
export const DECO: DecoDef[] = [
  // Couleur de l'armoire centrale (5 choix)
  { id: "armoire-noyer", nom: "Armoire noyer", emoji: "🟤", type: "armoire", valeur: "noyer" },
  { id: "armoire-blanc", nom: "Armoire blanche", emoji: "⬜", type: "armoire", valeur: "blanc" },
  { id: "armoire-orrose", nom: "Armoire or rose", emoji: "🌸", type: "armoire", valeur: "orrose" },
  { id: "armoire-sauge", nom: "Armoire vert sauge", emoji: "🌿", type: "armoire", valeur: "sauge" },
  { id: "armoire-noir", nom: "Armoire noire", emoji: "⬛", type: "armoire", valeur: "noir" },
  // Murs (5 choix)
  { id: "mur-ivoire", nom: "Mur ivoire", emoji: "🤍", type: "mur", valeur: "linear-gradient(180deg,#f7f0e6,#efe6d6)" },
  { id: "mur-blush", nom: "Mur blush", emoji: "🩷", type: "mur", valeur: "linear-gradient(180deg,#f7e7e2,#efd6cf)" },
  { id: "mur-sauge", nom: "Mur sauge", emoji: "🌿", type: "mur", valeur: "linear-gradient(180deg,#e7eee2,#d8e2d2)" },
  { id: "mur-bleu", nom: "Mur bleu doux", emoji: "🩵", type: "mur", valeur: "linear-gradient(180deg,#e3ebf0,#d2dde6)" },
  { id: "mur-terracotta", nom: "Mur terracotta", emoji: "🧡", type: "mur", valeur: "linear-gradient(180deg,#f0ded2,#e6c8b5)" },
  // Sols (5 choix)
  { id: "sol-boisclair", nom: "Parquet clair", emoji: "🪵", type: "sol", valeur: "repeating-linear-gradient(90deg,#e6cfa6,#e6cfa6 20px,#dcc298 20px,#dcc298 21px)" },
  { id: "sol-boisfonce", nom: "Parquet foncé", emoji: "🟫", type: "sol", valeur: "repeating-linear-gradient(90deg,#a9784a,#a9784a 20px,#9c6c40 20px,#9c6c40 21px)" },
  { id: "sol-marbre", nom: "Marbre", emoji: "⬜", type: "sol", valeur: "linear-gradient(135deg,#f1ede7,#e0dacd)" },
  { id: "sol-terrazzo", nom: "Terrazzo", emoji: "🔘", type: "sol", valeur: "radial-gradient(circle at 20% 30%, #d8cfc0 2px, transparent 3px), radial-gradient(circle at 60% 70%, #cfc3b0 2px, transparent 3px), radial-gradient(circle at 80% 20%, #d8cfc0 2px, transparent 3px), #ece7df" },
  { id: "sol-tapisbeige", nom: "Moquette beige", emoji: "🟧", type: "sol", valeur: "linear-gradient(180deg,#e9ddc9,#e3d4bd)" },
  // Accessoires PHOTORÉALISTES (images transparentes fournies par Amila, dans /public/chambre).
  // slot = emplacement dans la pièce. On en ajoute au fur et à mesure des images livrées.
  { id: "acc-palmier", nom: "Palmier en pot", emoji: "🌴", type: "accessoire", valeur: "palmier", img: "/chambre/acc-palmier.png", slot: "sol-gauche" },
];

export function gameById(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
export function decoById(id: string): DecoDef | undefined {
  return DECO.find((d) => d.id === id);
}
