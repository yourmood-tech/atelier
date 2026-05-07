export const CONDITIONS: Record<string, Condition> = {
  PUISSANCE: {
    nom: "Puissance",
    emoji: "🟢",
    description: "Stat très haute, en hausse continue forte sur plusieurs périodes",
    formule: [
      "Appliquer en faisant",
      "Ne pas couper les lignes de communication",
      "Faire un write-up complet du poste",
      "Réorganiser pour que le poste survive",
      "Lisser toutes les lignes de comm",
    ],
  },
  AFFLUENCE: {
    nom: "Affluence",
    emoji: "🟢",
    description: "Stat en forte hausse",
    formule: [
      "Économiser (focus & discipline) — créer moins, mais créer mieux",
      "Faire compter chaque action — aucune action ne doit être inutile",
      "Consolider chaque amélioration — stabiliser et amplifier la dynamique",
      "Comprendre ce qui crée la performance — identifier ce qui marche et le reproduire",
    ],
  },
  NORMAL: {
    nom: "Normal (Opération)",
    emoji: "🟡",
    description: "Stat stable ou légère hausse régulière",
    formule: [
      "Ne rien changer",
      "Éthique niveau mineur",
      "Repérer chaque action gagnante",
      "Trouver pourquoi l'amélioration s'est produite",
      "Renforcer cela",
      "Ne pas couper",
    ],
  },
  URGENCE: {
    nom: "Urgence",
    emoji: "🟠",
    description: "Stat en baisse",
    formule: [
      "Promouvoir",
      "Changer la base d'opération",
      "Économiser",
      "Se préparer à délivrer",
      "Resserrer la discipline",
    ],
  },
  DANGER: {
    nom: "Danger",
    emoji: "🔴",
    description: "Stat en chute libre / situation critique",
    formule: [
      "Laisser de côté les actions coutumières — sortir des automatismes",
      "Résoudre la situation — reprendre le contrôle activement",
      "S'assigner Danger",
      "Mettre l'éthique en place — découvrir ce qui n'est pas honnête, devenir honnête et droit",
      "Réorganiser la vie / le poste pour que ça ne se répète pas",
      "Adapter un règlement ferme pour anticiper la prochaine situation",
    ],
  },
  NON_EXISTENCE: {
    nom: "Non-Existence",
    emoji: "⚫",
    description: "Stat à zéro / nouveau poste / pas connu",
    formule: [
      "Trouver une ligne de communication",
      "Te faire connaître",
      "Découvrir ce qui est voulu / nécessaire",
      "Faire, produire, présenter",
    ],
  },
};

export type Condition = {
  nom: string;
  emoji: string;
  description: string;
  formule: string[];
};

export function determinerCondition({
  valeurs,
  valeurMin = 100,
}: {
  valeurs: number[];
  valeurMin?: number;
}): Condition | null {
  if (!valeurs || valeurs.length < 2) return null;
  const courante = valeurs[valeurs.length - 1];
  const precedente = valeurs[valeurs.length - 2];
  const slice = valeurs.slice(0, -2);
  const moyenneAvant =
    slice.reduce((s, v) => s + v, 0) / Math.max(1, slice.length);

  if (courante <= valeurMin) return CONDITIONS.NON_EXISTENCE;

  const varSemaine =
    ((courante - precedente) / Math.max(1, precedente)) * 100;
  const varMoyenne =
    ((courante - moyenneAvant) / Math.max(1, moyenneAvant)) * 100;

  if (varSemaine < -50 || varMoyenne < -50) return CONDITIONS.DANGER;
  if (varMoyenne > 50) return CONDITIONS.PUISSANCE;
  if (varMoyenne > 10) return CONDITIONS.AFFLUENCE;
  if (varMoyenne < -25) return CONDITIONS.DANGER;
  if (varMoyenne < -5) return CONDITIONS.URGENCE;
  return CONDITIONS.NORMAL;
}

export const CATEGORIES = [
  { id: "vente-en-ligne", nom: "Vente en ligne", emoji: "🌐", desc: "CA Shopify, ventes web" },
  { id: "vente-globale", nom: "Vente globale", emoji: "💰", desc: "CA total tous canaux confondus" },
  { id: "vente-boutique", nom: "Vente boutique", emoji: "🏪", desc: "CA boutiques physiques" },
  { id: "nouveaute", nom: "Nouveauté", emoji: "✨", desc: "Lancements, game changers" },
  { id: "nouveau-client", nom: "Nouveau client", emoji: "👋", desc: "Acquisition, premières commandes" },
  { id: "production", nom: "Production", emoji: "🛠️", desc: "Atelier, fabrication, pièces produites" },
  { id: "comptabilite", nom: "Comptabilité", emoji: "📊", desc: "Chiffres comptables, marges" },
  { id: "fournisseur", nom: "Fournisseur", emoji: "📦", desc: "Achats, délais, qualité fournisseurs" },
  { id: "delivrance", nom: "Délivrance", emoji: "🚚", desc: "Commandes expédiées, livraisons" },
];
