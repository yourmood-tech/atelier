function mtrlArgent(taille: string, format_: string) {
  const f = format_.toLowerCase();
  if (f === "addon") return `MTRL-ARGENT-${taille}`;
  if (f === "deux tiers") return `MTRL-23ARGENT-${taille}`;
  if (f === "medium") return `MTRL-MEDARGENT-${taille}`;
  return null;
}

function mtrlAcier(taille: string, format_: string) {
  const f = format_.toLowerCase();
  if (f === "addon") return `MTRL-ACIER-${taille}`;
  if (f === "deux tiers") return `MTRL-23ACIER-${taille}`;
  if (f === "medium") return `MTRL-MEDACIER-${taille}`;
  return null;
}

function mtrlTitane(taille: string, format_: string) {
  const f = format_.toLowerCase();
  if (f === "addon") return `MTRL-TIT-${taille}`;
  if (f === "deux tiers") return `MTRL-23TIT-${taille}`;
  if (f === "medium") return `MTRL-MEDTIT-${taille}`;
  return null;
}

const COULEUR_ALU_MAP: Record<string, string> = {
  myrtille: "MYRTILLE",
  anthracite: "ANTH",
  rouge: "ROUGE",
  noir: "NOIR",
  ocre: "OCRE",
  aubergine: "AUBERGINE",
  "jaune chaud": "JAUNE",
  "bleu marine": "MARINE",
  taupe: "TAUPE",
  corail: "CORAIL",
  "bleu violet": "BLEUVIOLET",
  turquoise: "TURQUOISE",
  emeraude: "EMERAUDE",
  émeraude: "EMERAUDE",
  brun: "BRUN",
  violet: "VIOLET",
  noisette: "NOISETTE",
  "vert pastel": "VP",
  "bleu pastel": "BLEUPASTEL",
  "jaune pastel": "JAUNEPASTEL",
  pêche: "PECHE",
  peche: "PECHE",
  abricot: "ABRICOT",
  "lilas cashmere": "LILAS",
  lilas: "LILAS",
  belipastel: "BELI",
  "rose pastel": "ROSEP",
};

function mtrlAluminium(taille: string, couleur: string | null, format_: string) {
  if (!couleur) return null;
  const c = COULEUR_ALU_MAP[couleur.toLowerCase()];
  if (!c) return null;
  const f = format_.toLowerCase();
  if (f === "addon") return `MTRL-ALU-${taille}-${c}`;
  if (f === "deux tiers") {
    const map: Record<string, string> = {
      VP: "VERTPASTEL",
      BLEUPASTEL: "BP",
      LILAS: "LIL",
      BELI: "BELIP",
      ROSEP: "ROSEP",
    };
    const cDt = map[c] || c;
    return `MTRL-23ALU-${taille}-${cDt}`;
  }
  if (f === "medium") return `MTRL-MEDALU-${taille}-${c}`;
  if (f === "mini") return `MTRL-MINIALU-${taille}-${c}`;
  if (f === "open mood") {
    const map: Record<string, string> = {
      VP: "VERTP",
      BLEUPASTEL: "BLEUP",
      JAUNEPASTEL: "JAUNP",
      LILAS: "LILASCASHMERE",
      BELI: "BELIPASTEL",
      ROSEP: "ROSEPASTEL",
    };
    const cOpen = map[c] || c;
    return `MTRL-OPENALU-${cOpen}-${taille}`;
  }
  return null;
}

function mtrlPolymere(taille: string, format_: string) {
  const f = format_.toLowerCase();
  const typ = "OPAQ";
  if (f === "deux tiers") return `MTRL-23POLY${typ}-${taille}`;
  if (f === "addon") return `MTRL-POLY${typ}-${taille}`;
  if (f === "medium") return `MTRL-MEDPOLY${typ}-${taille}`;
  return null;
}

function trancheMoab(t: string) {
  const pairs = [
    ["50", "52"],
    ["54", "56"],
    ["58", "60"],
    ["62", "64"],
    ["66", "68"],
    ["70", "72"],
  ];
  for (const [a, b] of pairs) {
    if (t === a || t === b) return `${a}/${b}`;
  }
  return null;
}

function mtrlMariposa(taille: string, format_: string) {
  const f = format_.toLowerCase();
  if (f === "addon") return `MTRL-MARIPOSAWH-${taille}`;
  if (f === "deux tiers") return `MTRL-MD-RI-052-MARIPOSA 4.85MM-${taille}`;
  return null;
}

function mtrlMoab(taille: string, format_: string) {
  const tr = trancheMoab(taille);
  if (!tr) return null;
  const f = format_.toLowerCase();
  if (f === "addon") return `53-${tr}-MOAB-AG`;
  if (f === "deux tiers") return `72-${tr}-MOAB-2/3-AG`;
  return null;
}

function mtrlDentsArgent(taille: string, format_: string) {
  // Disponible uniquement en medium pour l'instant
  const f = format_.toLowerCase();
  if (f === "medium") return `MTRL-MD-RI-240-dents-d'argent-wht-cz-${taille}`;
  return null;
}

function detecter3dSpecial(sku: string) {
  const s = (sku || "").toUpperCase();
  if (s.includes("MARIPOSA")) return "mariposa";
  if (s.includes("MOAB")) return "moab";
  if (s.includes("DENTS") && s.includes("ARGENT")) return "dents-argent";
  return null;
}

function extraireTaille(sku: string) {
  const parts = (sku || "").split("-");
  return parts[parts.length - 1] || "";
}

export function getMtrl({
  sku,
  format,
  matiere,
  couleur,
}: {
  sku: string;
  format: string;
  matiere?: string;
  couleur?: string | null;
}) {
  if (!format) return null;
  const taille = extraireTaille(sku);

  const special = detecter3dSpecial(sku);
  if (special === "mariposa") return mtrlMariposa(taille, format);
  if (special === "moab") return mtrlMoab(taille, format);
  if (special === "dents-argent") return mtrlDentsArgent(taille, format);

  if (!matiere) return null;
  const m = matiere.toLowerCase();
  if (m === "argent") return mtrlArgent(taille, format);
  if (m === "aluminium") return mtrlAluminium(taille, couleur || null, format);
  if (m === "polymère" || m === "polymere") return mtrlPolymere(taille, format);
  if (m === "acier") return mtrlAcier(taille, format);
  if (m === "titane") return mtrlTitane(taille, format);
  return null;
}

interface ShopifyVariant {
  sku: string;
  option1: string;
  option2?: string;
  option3?: string;
  price: string;
  inventory_item_id?: number;
}

interface ShopifyOption {
  name: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  options?: ShopifyOption[];
  variants: ShopifyVariant[];
}

interface KatanaInfos {
  format?: string;
  matiere?: string;
  couleurs?: string[];
}

export function genererLignesKatana(product: ShopifyProduct, infosForm: KatanaInfos) {
  const lignesProducts: unknown[][] = [];
  const lignesRecipes: unknown[][] = [];
  const titre = product.title;

  for (const variant of product.variants) {
    const sku = variant.sku;
    const opt1 = variant.option1;
    if (
      String(opt1).toLowerCase() === "taille inconnue" ||
      sku.endsWith("-00")
    ) {
      continue;
    }
    const opt1Clean = !isNaN(parseInt(opt1)) ? parseInt(opt1) : opt1;

    lignesProducts.push([
      titre,
      "pcs",
      "Yes",
      "No",
      "No",
      "None",
      sku,
      "Taille",
      opt1Clean,
      String(variant.price),
    ]);

    let formatVariant = infosForm.format || "";
    let couleurVariant: string | null = null;

    if (product.options && product.options.length > 1) {
      const opt2Name = product.options[1].name;
      const opt2Val = variant.option2;
      if (opt2Name === "Format") formatVariant = opt2Val || formatVariant;
      else if (opt2Name === "Couleur") couleurVariant = opt2Val || null;
    }
    if (product.options && product.options.length > 2) {
      const opt3Name = product.options[2].name;
      const opt3Val = variant.option3;
      if (opt3Name === "Couleur") couleurVariant = opt3Val || null;
    }

    const mtrl = getMtrl({
      sku,
      format: formatVariant,
      matiere: infosForm.matiere,
      couleur: couleurVariant,
    });

    if (mtrl) {
      lignesRecipes.push([sku, mtrl, 1]);
    }
  }

  return { lignesProducts, lignesRecipes };
}
