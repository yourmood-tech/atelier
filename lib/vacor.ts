// Vacor AG (Suisse) : traitement de surface des pièces acier — Black « Schwarz A40 », Pink Gold « Or B2 Rosé 5N ».
// Chaque pièce noire ou rose gold a dans sa recette Katana la pièce acier brute + une ligne « traitement Vacor ».
// Un bon de commande Vacor par couleur, comme le faisait Marie-Noëlle à la main.
export const VACOR_SUPPLIER_ID = 1028494;

export type VacorColour = "BLACK" | "PINKGOLD" | "YELLOWGOLD" | "AUTRE";

export const VACOR_COLOUR_LABEL: Record<VacorColour, string> = {
  BLACK: "Black",
  PINKGOLD: "Pink Gold",
  YELLOWGOLD: "Yellow Gold",
  AUTRE: "Autre",
};

/** Couleur du traitement d'après la référence de la matière Vacor (ex. MTRL-B-SCT-BLACK-A40-56, MTRL-B-XSA-ROGO-52). */
export function vacorColour(sku: string | null | undefined, name?: string | null): VacorColour {
  const s = `${sku ?? ""} ${name ?? ""}`.toUpperCase();
  if (s.includes("BLACK")) return "BLACK";
  if (s.includes("PINK") || s.includes("ROGO") || s.includes("ROSE")) return "PINKGOLD";
  if (s.includes("YELLOW")) return "YELLOWGOLD";
  return "AUTRE";
}
