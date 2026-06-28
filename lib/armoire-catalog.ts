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

// jour = jour de la semaine où le jeu est "le jeu du jour" (0=dimanche … 6=samedi, comme Date.getDay()).
// type "skill" = vrai jeu d'adresse (7 différences, mémoire) ; "chance" = tirage simple.
export type GameDef = { id: string; nom: string; emoji: string; jouable: boolean; partageable?: boolean; jour?: number; jourNom?: string; type?: "skill" | "chance" };
export type DecoType = "mur" | "sol" | "armoire" | "plante" | "cadre" | "objet" | "accessoire";
// img = image photoréaliste (PNG transparent) servie depuis /public/chambre.
// pos = emplacement de départ dans la pièce (centre en %, largeur en %, z = profondeur).
export type DecoDef = { id: string; nom: string; emoji: string; type: DecoType; valeur: string; img?: string; pos?: { left: number; top: number; w: number; z: number } };

// 7 jeux, un par jour de la semaine. Chacun a sa page partageable /jeu/<id>
// (newsletter / site) et fait gagner une carte du moment. + Mémoire en bonus dans l'appli.
export const GAMES: GameDef[] = [
  { id: "sept", nom: "7 différences", emoji: "🔍", jouable: true, partageable: true, jour: 1, jourNom: "Lundi", type: "skill" },
  { id: "memoire", nom: "Mémoire mood", emoji: "🧠", jouable: true, partageable: true, jour: 2, jourNom: "Mardi", type: "skill" },
  { id: "quiz", nom: "Quiz mood", emoji: "❓", jouable: true, partageable: true, jour: 3, jourNom: "Mercredi", type: "skill" },
  { id: "pioche", nom: "Pioche mystère", emoji: "🃏", jouable: true, partageable: true, jour: 4, jourNom: "Jeudi", type: "chance" },
  { id: "slot", nom: "Machine à moods", emoji: "🎰", jouable: true, partageable: true, jour: 5, jourNom: "Vendredi", type: "chance" },
  { id: "etoile", nom: "Étoile chance", emoji: "✨", jouable: true, partageable: true, jour: 6, jourNom: "Samedi", type: "chance" },
  { id: "cadeau", nom: "Cadeau du dimanche", emoji: "🎀", jouable: true, partageable: true, jour: 0, jourNom: "Dimanche", type: "chance" },
];

// Les 10 icônes mood servant de faces au jeu de Mémoire (dans /public/jeux/memoire).
export const MEMOIRE_FACES: string[] = [
  "/jeux/memoire/bon50.png",
  "/jeux/memoire/bon10.png",
  "/jeux/memoire/pearlclip.png",
  "/jeux/memoire/cocochoco.png",
  "/jeux/memoire/diamant.png",
  "/jeux/memoire/boite.png",
  "/jeux/memoire/nagoya.png",
  "/jeux/memoire/hopsuisse.png",
  "/jeux/memoire/alba.png",
  "/jeux/memoire/ladyrey.png",
];

// Les 7 différences du jeu (fractions 0..1 de l'image) — calées sur /public/jeux/7diff/b.png.
export type Diff = { id: string; x: number; y: number; r: number; indice: string };
export const SEPT_DIFFS: Diff[] = [
  { id: "mouette", x: 0.32, y: 0.11, r: 0.08, indice: "Une mouette s'est envolée" },
  { id: "noeud", x: 0.43, y: 0.25, r: 0.075, indice: "Un nœud a changé de couleur" },
  { id: "casquette", x: 0.54, y: 0.39, r: 0.08, indice: "Une casquette a changé de couleur" },
  { id: "etoile", x: 0.63, y: 0.875, r: 0.075, indice: "Quelque chose a disparu du sable" },
  { id: "voilier", x: 0.06, y: 0.53, r: 0.075, indice: "Un bateau a quitté la mer" },
  { id: "lunettes", x: 0.13, y: 0.89, r: 0.085, indice: "Des lunettes ont disparu de la serviette" },
  { id: "chapeau", x: 0.08, y: 0.75, r: 0.08, indice: "Le ruban du chapeau a changé" },
];

// Le jeu du jour (selon le jour de la semaine).
export function gameOfToday(day: number): GameDef | undefined {
  return GAMES.find((g) => g.jour === day);
}

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
  // pos = placement de départ (la cliente peut déplacer/agrandir ensuite).
  { id: "acc-plante", nom: "Palmier en pot", emoji: "🌴", type: "accessoire", valeur: "plante", img: "/chambre/acc-plante.png", pos: { left: 9, top: 54, w: 16, z: 4 } },
  { id: "acc-table", nom: "Table d'appoint", emoji: "🪵", type: "accessoire", valeur: "table", img: "/chambre/acc-table.png", pos: { left: 13, top: 80, w: 11, z: 4 } },
  { id: "acc-lampe", nom: "Lampe champignon", emoji: "💡", type: "accessoire", valeur: "lampe", img: "/chambre/acc-lampe.png", pos: { left: 10, top: 66, w: 9, z: 5 } },
  { id: "acc-bougie", nom: "Bougie", emoji: "🕯️", type: "accessoire", valeur: "bougie", img: "/chambre/acc-bougie.png", pos: { left: 17, top: 74, w: 5, z: 5 } },
  { id: "acc-coquillage", nom: "Coquillage", emoji: "🐚", type: "accessoire", valeur: "coquillage", img: "/chambre/acc-coquillage.png", pos: { left: 6, top: 80, w: 8, z: 5 } },
  { id: "acc-cadre-mood", nom: "Cadre « mood »", emoji: "🖼️", type: "accessoire", valeur: "cadre-mood", img: "/chambre/acc-cadre-mood.png", pos: { left: 30, top: 13, w: 10, z: 2 } },
  { id: "acc-cadre-bijoux", nom: "Cadre bijoux", emoji: "🖼️", type: "accessoire", valeur: "cadre-bijoux", img: "/chambre/acc-cadre-bijoux.png", pos: { left: 46, top: 12, w: 13, z: 2 } },
  { id: "acc-cadre-palmier", nom: "Cadre palmier", emoji: "🖼️", type: "accessoire", valeur: "cadre-palmier", img: "/chambre/acc-cadre-palmier.png", pos: { left: 62, top: 13, w: 11, z: 2 } },
  { id: "acc-etagere", nom: "Étagère", emoji: "📚", type: "accessoire", valeur: "etagere", img: "/chambre/acc-etagere.png", pos: { left: 87, top: 17, w: 13, z: 2 } },
  { id: "acc-neon", nom: "Néon « mood »", emoji: "💗", type: "accessoire", valeur: "neon", img: "/chambre/acc-neon.png", pos: { left: 89, top: 5, w: 8, z: 2 } },
  { id: "acc-miroir", nom: "Miroir à ampoules", emoji: "🪞", type: "accessoire", valeur: "miroir", img: "/chambre/acc-miroir.png", pos: { left: 86, top: 45, w: 11, z: 2 } },
  { id: "acc-coiffeuse", nom: "Coiffeuse", emoji: "💄", type: "accessoire", valeur: "coiffeuse", img: "/chambre/acc-coiffeuse.png", pos: { left: 88, top: 72, w: 20, z: 4 } },
  { id: "acc-portebijoux", nom: "Porte-bijoux", emoji: "📿", type: "accessoire", valeur: "portebijoux", img: "/chambre/acc-portebijoux.png", pos: { left: 78, top: 70, w: 8, z: 5 } },
  { id: "acc-diffuseur", nom: "Diffuseur", emoji: "🌸", type: "accessoire", valeur: "diffuseur", img: "/chambre/acc-diffuseur.png", pos: { left: 95, top: 74, w: 6, z: 5 } },
  { id: "acc-tabouret", nom: "Tabouret velours", emoji: "🪑", type: "accessoire", valeur: "tabouret", img: "/chambre/acc-tabouret.png", pos: { left: 84, top: 89, w: 9, z: 4 } },
  // Collection BLEUE
  { id: "acc-bleu-olivier", nom: "Olivier (bleu)", emoji: "🫒", type: "accessoire", valeur: "olivier", img: "/chambre/acc-bleu-olivier.png", pos: { left: 10, top: 52, w: 15, z: 4 } },
  { id: "acc-bleu-table", nom: "Table colonne (bleu)", emoji: "🏛️", type: "accessoire", valeur: "table-bleu", img: "/chambre/acc-bleu-table.png", pos: { left: 14, top: 80, w: 13, z: 4 } },
  { id: "acc-bleu-vase", nom: "Vase (bleu)", emoji: "🏺", type: "accessoire", valeur: "vase", img: "/chambre/acc-bleu-vase.png", pos: { left: 17, top: 72, w: 7, z: 5 } },
  { id: "acc-bleu-corail", nom: "Corail (bleu)", emoji: "🪸", type: "accessoire", valeur: "corail", img: "/chambre/acc-bleu-corail.png", pos: { left: 22, top: 74, w: 10, z: 5 } },
  { id: "acc-bleu-coquillage", nom: "Coquillage (bleu)", emoji: "🐚", type: "accessoire", valeur: "coquillage-bleu", img: "/chambre/acc-bleu-coquillage.png", pos: { left: 6, top: 80, w: 6, z: 5 } },
  { id: "acc-bleu-etagere", nom: "Étagère (bleu)", emoji: "📚", type: "accessoire", valeur: "etagere-bleu", img: "/chambre/acc-bleu-etagere.png", pos: { left: 87, top: 18, w: 26, z: 2 } },
  { id: "acc-bleu-livres", nom: "Livres « Ocean »", emoji: "📘", type: "accessoire", valeur: "livres", img: "/chambre/acc-bleu-livres.png", pos: { left: 80, top: 70, w: 16, z: 5 } },
  { id: "acc-bleu-cadre", nom: "Cadre vague (bleu)", emoji: "🖼️", type: "accessoire", valeur: "cadre-bleu", img: "/chambre/acc-bleu-cadre.png", pos: { left: 46, top: 12, w: 10, z: 2 } },
  { id: "acc-bleu-texte", nom: "Texte « mood » (bleu)", emoji: "💙", type: "accessoire", valeur: "texte-bleu", img: "/chambre/acc-bleu-texte.png", pos: { left: 30, top: 12, w: 15, z: 2 } },
  { id: "acc-bleu-tapis", nom: "Tapis rond (bleu)", emoji: "🔵", type: "accessoire", valeur: "tapis-bleu", img: "/chambre/acc-bleu-tapis.png", pos: { left: 50, top: 90, w: 40, z: 0 } },
  // Collection NOIRE (chic sombre & doré)
  { id: "acc-noir-palmier", nom: "Palmier (noir)", emoji: "🌴", type: "accessoire", valeur: "palmier-noir", img: "/chambre/acc-noir-palmier.png", pos: { left: 9, top: 50, w: 18, z: 4 } },
  { id: "acc-noir-fauteuil", nom: "Fauteuil bouclette (noir)", emoji: "🛋️", type: "accessoire", valeur: "fauteuil-noir", img: "/chambre/acc-noir-fauteuil.png", pos: { left: 16, top: 78, w: 22, z: 4 } },
  { id: "acc-noir-meuble-arche", nom: "Meuble arche (noir)", emoji: "🗄️", type: "accessoire", valeur: "meuble-arche-noir", img: "/chambre/acc-noir-meuble-arche.png", pos: { left: 88, top: 74, w: 20, z: 4 } },
  { id: "acc-noir-table-basse", nom: "Table basse marbre (noir)", emoji: "🪨", type: "accessoire", valeur: "table-basse-noir", img: "/chambre/acc-noir-table-basse.png", pos: { left: 50, top: 82, w: 22, z: 3 } },
  { id: "acc-noir-table-appoint", nom: "Table d'appoint (noir)", emoji: "🪑", type: "accessoire", valeur: "table-appoint-noir", img: "/chambre/acc-noir-table-appoint.png", pos: { left: 13, top: 78, w: 12, z: 4 } },
  { id: "acc-noir-lampe", nom: "Lampe dôme (noir)", emoji: "💡", type: "accessoire", valeur: "lampe-noir", img: "/chambre/acc-noir-lampe.png", pos: { left: 10, top: 64, w: 11, z: 5 } },
  { id: "acc-noir-fleurs", nom: "Vase fleuri (noir)", emoji: "🌸", type: "accessoire", valeur: "fleurs-noir", img: "/chambre/acc-noir-fleurs.png", pos: { left: 24, top: 70, w: 10, z: 5 } },
  { id: "acc-noir-gypsophile", nom: "Gypsophile (noir)", emoji: "🌾", type: "accessoire", valeur: "gypsophile-noir", img: "/chambre/acc-noir-gypsophile.png", pos: { left: 18, top: 64, w: 9, z: 5 } },
  { id: "acc-noir-vase-noir", nom: "Vase noir", emoji: "🏺", type: "accessoire", valeur: "vase-noir", img: "/chambre/acc-noir-vase-noir.png", pos: { left: 28, top: 74, w: 8, z: 5 } },
  { id: "acc-noir-vase-donut-blanc", nom: "Vase donut (blanc)", emoji: "⚪", type: "accessoire", valeur: "vase-donut-blanc", img: "/chambre/acc-noir-vase-donut-blanc.png", pos: { left: 33, top: 76, w: 9, z: 5 } },
  { id: "acc-noir-bougie", nom: "Bougie (noir)", emoji: "🕯️", type: "accessoire", valeur: "bougie-noir", img: "/chambre/acc-noir-bougie.png", pos: { left: 20, top: 76, w: 5, z: 6 } },
  { id: "acc-noir-coupelle", nom: "Coupelle bagues (noir)", emoji: "💍", type: "accessoire", valeur: "coupelle-noir", img: "/chambre/acc-noir-coupelle.png", pos: { left: 6, top: 82, w: 8, z: 6 } },
  { id: "acc-noir-livres-luxe", nom: "Livres luxe (noir)", emoji: "📚", type: "accessoire", valeur: "livres-luxe-noir", img: "/chambre/acc-noir-livres-luxe.png", pos: { left: 80, top: 70, w: 14, z: 5 } },
  { id: "acc-noir-livres-mode", nom: "Livres mode (noir)", emoji: "📖", type: "accessoire", valeur: "livres-mode-noir", img: "/chambre/acc-noir-livres-mode.png", pos: { left: 70, top: 72, w: 14, z: 5 } },
  { id: "acc-noir-neon-mood", nom: "Néon « mood » (noir)", emoji: "🤍", type: "accessoire", valeur: "neon-noir", img: "/chambre/acc-noir-neon-mood.png", pos: { left: 88, top: 6, w: 16, z: 2 } },
  { id: "acc-noir-affiche-voiture", nom: "Affiche voiture (noir)", emoji: "🖼️", type: "accessoire", valeur: "affiche-voiture-noir", img: "/chambre/acc-noir-affiche-voiture.png", pos: { left: 46, top: 13, w: 12, z: 2 } },
  { id: "acc-noir-affiche-azur", nom: "Affiche Côte d'Azur (noir)", emoji: "🖼️", type: "accessoire", valeur: "affiche-azur-noir", img: "/chambre/acc-noir-affiche-azur.png", pos: { left: 62, top: 13, w: 11, z: 2 } },
  { id: "acc-noir-tapis", nom: "Tapis rond (noir)", emoji: "⚫", type: "accessoire", valeur: "tapis-noir", img: "/chambre/acc-noir-tapis.png", pos: { left: 50, top: 90, w: 40, z: 0 } },
  // Collection RIVIERA (pastel ensoleillé)
  { id: "acc-riviera-palmier", nom: "Palmier (riviera)", emoji: "🌴", type: "accessoire", valeur: "palmier-riviera", img: "/chambre/acc-riviera-palmier.png", pos: { left: 9, top: 50, w: 18, z: 4 } },
  { id: "acc-riviera-fauteuil", nom: "Fauteuil corail (riviera)", emoji: "🛋️", type: "accessoire", valeur: "fauteuil-riviera", img: "/chambre/acc-riviera-fauteuil.png", pos: { left: 16, top: 78, w: 22, z: 4 } },
  { id: "acc-riviera-radio", nom: "Table de chevet (riviera)", emoji: "📻", type: "accessoire", valeur: "radio-riviera", img: "/chambre/acc-riviera-radio.png", pos: { left: 88, top: 76, w: 16, z: 4 } },
  { id: "acc-riviera-table-basse", nom: "Table basse rose (riviera)", emoji: "🌷", type: "accessoire", valeur: "table-basse-riviera", img: "/chambre/acc-riviera-table-basse.png", pos: { left: 50, top: 82, w: 22, z: 3 } },
  { id: "acc-riviera-etagere", nom: "Étagère arche (riviera)", emoji: "🗄️", type: "accessoire", valeur: "etagere-riviera", img: "/chambre/acc-riviera-etagere.png", pos: { left: 87, top: 22, w: 16, z: 2 } },
  { id: "acc-riviera-lampe", nom: "Lampe champignon (riviera)", emoji: "💡", type: "accessoire", valeur: "lampe-riviera", img: "/chambre/acc-riviera-lampe.png", pos: { left: 10, top: 64, w: 11, z: 5 } },
  { id: "acc-riviera-fleurs", nom: "Gerberas (riviera)", emoji: "🌺", type: "accessoire", valeur: "fleurs-riviera", img: "/chambre/acc-riviera-fleurs.png", pos: { left: 24, top: 70, w: 10, z: 5 } },
  { id: "acc-riviera-vase-donut", nom: "Vase donut (riviera)", emoji: "🟤", type: "accessoire", valeur: "vase-donut-riviera", img: "/chambre/acc-riviera-vase-donut.png", pos: { left: 18, top: 72, w: 9, z: 5 } },
  { id: "acc-riviera-coupelle", nom: "Coupelle bagues (riviera)", emoji: "💍", type: "accessoire", valeur: "coupelle-riviera", img: "/chambre/acc-riviera-coupelle.png", pos: { left: 6, top: 82, w: 8, z: 6 } },
  { id: "acc-riviera-livres", nom: "Livres voyage (riviera)", emoji: "📚", type: "accessoire", valeur: "livres-riviera", img: "/chambre/acc-riviera-livres.png", pos: { left: 80, top: 70, w: 14, z: 5 } },
  { id: "acc-riviera-coussin", nom: "Coussin velours (riviera)", emoji: "🟢", type: "accessoire", valeur: "coussin-riviera", img: "/chambre/acc-riviera-coussin.png", pos: { left: 30, top: 80, w: 12, z: 5 } },
  { id: "acc-riviera-lunettes", nom: "Lunettes (riviera)", emoji: "🕶️", type: "accessoire", valeur: "lunettes-riviera", img: "/chambre/acc-riviera-lunettes.png", pos: { left: 36, top: 84, w: 9, z: 6 } },
  { id: "acc-riviera-telephone", nom: "Téléphone rétro (riviera)", emoji: "☎️", type: "accessoire", valeur: "telephone-riviera", img: "/chambre/acc-riviera-telephone.png", pos: { left: 78, top: 64, w: 9, z: 5 } },
  { id: "acc-riviera-boule-disco", nom: "Boule disco (riviera)", emoji: "🪩", type: "accessoire", valeur: "boule-disco-riviera", img: "/chambre/acc-riviera-boule-disco.png", pos: { left: 70, top: 7, w: 9, z: 2 } },
  { id: "acc-riviera-neon-mood", nom: "Néon « mood » (riviera)", emoji: "🩷", type: "accessoire", valeur: "neon-riviera", img: "/chambre/acc-riviera-neon-mood.png", pos: { left: 88, top: 6, w: 16, z: 2 } },
  { id: "acc-riviera-affiche-palm", nom: "Affiche Palm Beach (riviera)", emoji: "🖼️", type: "accessoire", valeur: "affiche-palm-riviera", img: "/chambre/acc-riviera-affiche-palm.png", pos: { left: 46, top: 13, w: 12, z: 2 } },
  { id: "acc-riviera-affiche-amalfi", nom: "Affiche Amalfi (riviera)", emoji: "🖼️", type: "accessoire", valeur: "affiche-amalfi-riviera", img: "/chambre/acc-riviera-affiche-amalfi.png", pos: { left: 62, top: 13, w: 11, z: 2 } },
  { id: "acc-riviera-tapis", nom: "Tapis rond (riviera)", emoji: "🟠", type: "accessoire", valeur: "tapis-riviera", img: "/chambre/acc-riviera-tapis.png", pos: { left: 50, top: 90, w: 40, z: 0 } },
  // Collection SURF (côtière, sable & sakura)
  { id: "acc-surf-palmier", nom: "Palmier (surf)", emoji: "🌴", type: "accessoire", valeur: "palmier-surf", img: "/chambre/acc-surf-palmier.png", pos: { left: 9, top: 50, w: 18, z: 4 } },
  { id: "acc-surf-fauteuil", nom: "Pouf bouclette (surf)", emoji: "🛋️", type: "accessoire", valeur: "fauteuil-surf", img: "/chambre/acc-surf-fauteuil.png", pos: { left: 16, top: 78, w: 22, z: 4 } },
  { id: "acc-surf-banc", nom: "Banc ovale (surf)", emoji: "🪑", type: "accessoire", valeur: "banc-surf", img: "/chambre/acc-surf-banc.png", pos: { left: 50, top: 86, w: 26, z: 3 } },
  { id: "acc-surf-table-basse", nom: "Table basse ronde (surf)", emoji: "🟤", type: "accessoire", valeur: "table-basse-surf", img: "/chambre/acc-surf-table-basse.png", pos: { left: 50, top: 80, w: 20, z: 3 } },
  { id: "acc-surf-planche-surf", nom: "Planche de surf", emoji: "🏄", type: "accessoire", valeur: "planche-surf", img: "/chambre/acc-surf-planche-surf.png", pos: { left: 6, top: 54, w: 7, z: 3 } },
  { id: "acc-surf-lampe", nom: "Lampe champignon (surf)", emoji: "💡", type: "accessoire", valeur: "lampe-surf", img: "/chambre/acc-surf-lampe.png", pos: { left: 12, top: 64, w: 11, z: 5 } },
  { id: "acc-surf-vase-sakura", nom: "Branches sakura (surf)", emoji: "🌸", type: "accessoire", valeur: "vase-sakura-surf", img: "/chambre/acc-surf-vase-sakura.png", pos: { left: 22, top: 62, w: 12, z: 5 } },
  { id: "acc-surf-coussin", nom: "Coussin « Salty Soul »", emoji: "🩷", type: "accessoire", valeur: "coussin-surf", img: "/chambre/acc-surf-coussin.png", pos: { left: 30, top: 82, w: 12, z: 5 } },
  { id: "acc-surf-bougie-sakura", nom: "Bougie Sakura (surf)", emoji: "🕯️", type: "accessoire", valeur: "bougie-sakura-surf", img: "/chambre/acc-surf-bougie-sakura.png", pos: { left: 26, top: 76, w: 6, z: 6 } },
  { id: "acc-surf-bougie-banc", nom: "Bougie (surf)", emoji: "🕯️", type: "accessoire", valeur: "bougie-banc-surf", img: "/chambre/acc-surf-bougie-banc.png", pos: { left: 20, top: 76, w: 6, z: 6 } },
  { id: "acc-surf-coupelle", nom: "Coupelle bagues (surf)", emoji: "💍", type: "accessoire", valeur: "coupelle-surf", img: "/chambre/acc-surf-coupelle.png", pos: { left: 7, top: 82, w: 8, z: 6 } },
  { id: "acc-surf-livres", nom: "Livres « Surf Shack »", emoji: "📚", type: "accessoire", valeur: "livres-surf", img: "/chambre/acc-surf-livres.png", pos: { left: 80, top: 72, w: 15, z: 5 } },
  { id: "acc-surf-letterboard", nom: "Letterboard « Good Vibes »", emoji: "🗒️", type: "accessoire", valeur: "letterboard-surf", img: "/chambre/acc-surf-letterboard.png", pos: { left: 87, top: 22, w: 12, z: 2 } },
  { id: "acc-surf-neon-mood", nom: "Néon « mood » (surf)", emoji: "🤍", type: "accessoire", valeur: "neon-surf", img: "/chambre/acc-surf-neon-mood.png", pos: { left: 88, top: 6, w: 16, z: 2 } },
  { id: "acc-surf-affiche-surfer", nom: "Affiche surfeur (surf)", emoji: "🖼️", type: "accessoire", valeur: "affiche-surfer-surf", img: "/chambre/acc-surf-affiche-surfer.png", pos: { left: 52, top: 13, w: 12, z: 2 } },
  { id: "acc-surf-tapis", nom: "Tapis palmiers (surf)", emoji: "🟫", type: "accessoire", valeur: "tapis-surf", img: "/chambre/acc-surf-tapis.png", pos: { left: 50, top: 90, w: 40, z: 0 } },
];

// Questions du Quiz mood (jeu de Mercredi). libre=true → réponse ouverte, sans bonne réponse (juste pour le fun).
// bonne = index de la bonne réponse dans choix. Éditable par Stéphanie plus tard (admin).
export type QuizQuestion = { id: string; q: string; choix?: string[]; bonne?: number; libre?: boolean };
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: "nagoya-fleurs", q: "De quelle couleur sont les fleurs de l'addon Nagoya Coco ?", choix: ["Blanches", "Roses", "Dorées"], bonne: 0 },
  { id: "coco-nombre", q: "Combien d'addons compte la collection Coco ?", choix: ["25", "35", "45"], bonne: 1 },
  { id: "mood-jour", q: "Dans quel mood es-tu aujourd'hui ?", libre: true },
];

export function gameById(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
export function decoById(id: string): DecoDef | undefined {
  return DECO.find((d) => d.id === id);
}
