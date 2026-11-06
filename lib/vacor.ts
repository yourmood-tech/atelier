// Pièces à faire fabriquer ou traiter, chez trois fournisseurs :
//  - Technocut : découpe des anneaux 3D en acier (Poya, Edelweiss, Montagne, Spider…) — un seul bon, tous modèles
// Traitements de surface des pièces acier :
//  - Vacor AG : Black « Schwarz A40 », Pink Gold « Or B2 Rosé 5N » (Yellow Gold n'est plus commandé)
//  - Positive Coating : Bleu électrique HNDT-6040, Bleu minéral HNDT-2035, Bleu azur HNDT-6050D, Chocolat HD-MAR01
// Chaque pièce colorée a dans sa recette Katana la pièce acier brute + une ligne « traitement » du fournisseur.
// Un bon de commande par fournisseur (et par couleur pour les traitements), comme les bons faits à la main jusqu'ici.
export const VACOR_SUPPLIER_ID = 1028494;
export const POSITIVE_COATING_SUPPLIER_ID = 538276;
export const TECHNOCUT_SUPPLIER_ID = 663543;
export const TREATMENT_SUPPLIER_IDS = [TECHNOCUT_SUPPLIER_ID, VACOR_SUPPLIER_ID, POSITIVE_COATING_SUPPLIER_ID];
export const TREATMENT_SUPPLIERS = [
  { id: TECHNOCUT_SUPPLIER_ID, name: "Technocut", detail: "anneaux 3D découpés" },
  { id: VACOR_SUPPLIER_ID, name: "Vacor", detail: "black, pink gold" },
  { id: POSITIVE_COATING_SUPPLIER_ID, name: "Positive Coating", detail: "bleus, chocolat" },
];

export type TreatmentGroup = {
  key: string;          // ex. « VACOR:BLACK », « PC:MINERAL »
  supplierId: number;
  supplierName: string; // « Vacor » / « Positive Coating »
  colour: string;       // « Black », « Bleu minéral »… (vide pour Technocut)
  prefix: string;       // début du n° de bon Katana
  tagPrefix: string;    // étiquette posée sur la commande cliente
  bg: string;           // couleur d'affichage
  order: number;
};

const G = (supplierId: number, code: string): TreatmentGroup => {
  if (supplierId === VACOR_SUPPLIER_ID) {
    const m: Record<string, [string, string, string]> = {
      BLACK: ["Black", "VAC-BLACK", "#111"],
      PINKGOLD: ["Pink Gold", "VAC-PINKGOLD", "#b76e79"],
      YELLOWGOLD: ["Yellow Gold", "VAC-YELLOWGOLD", "#b8860b"],
      AUTRE: ["autre", "VAC", "#666"],
    };
    const [colour, prefix, bg] = m[code];
    return { key: `VACOR:${code}`, supplierId, supplierName: "Vacor", colour, prefix, tagPrefix: "Vacor-PO", bg, order: Object.keys(m).indexOf(code) };
  }
  const m: Record<string, [string, string, string]> = {
    ELECTRIQUE: ["Bleu électrique", "PC-ELECTRIQUE", "#1f5fd6"],
    MINERAL: ["Bleu minéral", "PC-MINERAL", "#2c4a6b"],
    AZUR: ["Bleu azur", "PC-AZUR", "#3aa0d0"],
    CHOCOLAT: ["Chocolat", "PC-CHOCOLAT", "#5d3a1a"],
    AUTRE: ["autre", "PC", "#666"],
  };
  const [colour, prefix, bg] = m[code];
  return { key: `PC:${code}`, supplierId, supplierName: "Positive Coating", colour, prefix, tagPrefix: "PositiveCoating-PO", bg, order: 10 + Object.keys(m).indexOf(code) };
};

/** Fournisseur + couleur d'une ligne de traitement, d'après la référence de la matière
 *  (ex. MTRL-B-SCT-BLACK-A40-56, MTRL-B-XSA-ROGO-52, MTRL-M-HNDT-2035-60, MTRL-B-LA-HD-MAR01-58). */
export function treatmentGroup(supplierId: number, sku: string | null | undefined, name?: string | null): TreatmentGroup {
  if (supplierId === TECHNOCUT_SUPPLIER_ID) {
    return { key: "TC", supplierId, supplierName: "Technocut", colour: "", prefix: "TC", tagPrefix: "Technocut-PO", bg: "#6b6b6b", order: -1 };
  }
  const s = `${sku ?? ""} ${name ?? ""}`.toUpperCase();
  if (supplierId === POSITIVE_COATING_SUPPLIER_ID) {
    if (s.includes("6040") || s.includes("ÉLECTRIQUE") || s.includes("ELECTRIQUE")) return G(supplierId, "ELECTRIQUE");
    if (s.includes("2035") || s.includes("MINÉRAL") || s.includes("MINERAL")) return G(supplierId, "MINERAL");
    if (s.includes("6050") || s.includes("AZUR")) return G(supplierId, "AZUR");
    if (s.includes("MAR01") || s.includes("CHOCOLAT")) return G(supplierId, "CHOCOLAT");
    return G(supplierId, "AUTRE");
  }
  if (s.includes("BLACK")) return G(VACOR_SUPPLIER_ID, "BLACK");
  if (s.includes("PINK") || s.includes("ROGO") || s.includes("ROSE")) return G(VACOR_SUPPLIER_ID, "PINKGOLD");
  if (s.includes("YELLOW")) return G(VACOR_SUPPLIER_ID, "YELLOWGOLD");
  return G(VACOR_SUPPLIER_ID, "AUTRE");
}
