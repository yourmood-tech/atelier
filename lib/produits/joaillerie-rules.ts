import { calculerCaratsTotal } from "./sertissage";

export type JoaillerieCategorie =
  | 'medium-base-serti'  // Medium et base entièrement sertis (full/semi/1côté/2côtés)
  | 'piece-serie'        // Pièces uniques + d'exception + serties spéciales
  | 'coffret'            // Coffret joaillerie ou cadeau d'exception (peut contenir mediums sertis, base sertie, pièce d'exception)
  | 'alliance'           // Alliances (par 2 bagues)
  | 'compagnon';         // Compagnon (bague sans base mood)

export interface PierreItem {
  type: string;
  taille: string;
  quantite: number;
}

export interface JoaillerieInfos {
  categorie: JoaillerieCategorie;
  nom: string;
  format?: string;
  matiere: string;
  carat?: string;
  finition?: string;
  couleur?: string;
  pierres?: PierreItem[];
  sertissage?: string;
  tailles?: string[];
  taille_bague?: string[];
  gravure?: string;
  sous_style?: string;
  composants?: string;
  nom_client?: string;
  num_serie?: string;
  prix?: number | null;
  nb_pierres?: number;
}

// ============ TAILLES STANDARD ============
export const TAILLES_STANDARD = [
  "50","52","54","56","58","60","62","64","66","68","70","72","taille inconnue"
];

// ============ SKU ============
const FORMAT_MAP: Record<string, string> = {
  'addon': 'AD',
  'deux-tiers': 'DT',
  'medium': 'ME',
  'mini': 'MIN',
  'base': 'BA',
  'coffret': 'COF',
  'alliance': 'AL',
  'compagnon': 'CP',
};

const MATIERE_CODE_MAP: Record<string, string> = {
  'argent': 'ARG',
  'or rose': 'OR',
  'or jaune': 'OR',
  'or gris': 'OR',
  'tantale': 'TANT',
  'carbone': 'CAR',
  'damasse': 'DAM',
  'mokume-gane': 'MOK',
  'ceramique': 'CER',
  'acier': 'AC',
  'titane': 'TIT',
  'aluminium': 'ALU',
  'polymere': 'POLY',
};

function toAsciiUpper(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function genererSkuJoaillerie(infos: JoaillerieInfos, taille: string): string {
  const formatCode = FORMAT_MAP[infos.format || ''] || 'XX';
  const nomSlug = toAsciiUpper(infos.nom);
  const matiereCode = MATIERE_CODE_MAP[infos.matiere] || toAsciiUpper(infos.matiere).slice(0, 4);
  const finitionCode = infos.finition ? toAsciiUpper(infos.finition) : 'NEUTRE';
  const couleurCode = infos.couleur ? toAsciiUpper(infos.couleur) : 'NEUTRE';
  return `${formatCode}-${nomSlug}-${matiereCode}-${finitionCode}-${couleurCode}-${taille}`;
}

// ============ TAGS ============
function toSlug(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function tagPrixRange(prix: number): string {
  if (prix < 50)   return 'P20.49';
  if (prix < 160)  return 'P50.159';
  if (prix < 250)  return 'P160.249';
  if (prix < 500)  return 'P250.499';
  if (prix < 1500) return 'P500.1499';
  return 'P1500.x';
}

export function genererTagsJoaillerie(infos: JoaillerieInfos): string {
  const tags: string[] = [];

  // 1. Joaillerie
  tags.push('Joaillerie');

  // 2. Matière (avec carat si or)
  const matiereSlug = toSlug(infos.matiere);
  const isOr = infos.matiere.startsWith('or ');
  if (isOr && infos.carat) {
    tags.push(`materiaux:${matiereSlug}-${infos.carat.toLowerCase()}`);
  } else {
    tags.push(`materiaux:${matiereSlug}`);
  }

  // 3. Pierres
  if (infos.pierres && infos.pierres.length > 0) {
    const typesSeen = new Set<string>();
    for (const p of infos.pierres) {
      const typeSlug = toSlug(p.type);
      if (!typesSeen.has(typeSlug)) {
        tags.push(`pierre:${typeSlug}`);
        typesSeen.add(typeSlug);
      }
      tags.push(`taille-pierre:${p.taille}mm`);
    }
  }

  // 4. Format
  if (infos.format) {
    tags.push(`format:${toSlug(infos.format)}`);
  }

  // 5. Catégorie + sous-style
  tags.push(`categorie:${toSlug(infos.categorie)}`);
  if (infos.sous_style) {
    tags.push(`style:${toSlug(infos.sous_style)}`);
  }

  // 6. Tag prix
  if (infos.prix && infos.prix > 0) {
    tags.push(tagPrixRange(infos.prix));
  }

  return tags.join(', ');
}

// ============ CALCUL PRIX PROJET UNIQUE ============
const PRIX_ACHAT: Record<string, Record<string, number>> = {
  'argent':    { 'addon': 40, 'deux-tiers': 33, 'medium': 26 },
  'or rose':   { 'addon': 350, 'deux-tiers': 320, 'medium': 310 },
  'or jaune':  { 'addon': 350, 'deux-tiers': 320, 'medium': 310 },
  'or gris':   { 'addon': 739, 'deux-tiers': 490, 'medium': 190 },
  'tantale':   { 'addon': 390, 'deux-tiers': 290, 'medium': 190 },
  'carbone':   { 'addon': 62, 'medium': 31 },
};

export function calculerPrixProjetUnique(infos: JoaillerieInfos): number {
  const prixMatiere = (PRIX_ACHAT[infos.matiere] || {})[infos.format || ''] || 0;
  const nbPierres = (infos.pierres || []).reduce((s, p) => s + (p.quantite || 1), 0);
  return Math.round(prixMatiere * 3.8 + 4 * nbPierres);
}

// ============ TITRE ============
function resumePierres(pierres: PierreItem[]): string {
  return pierres.map(p => `${p.quantite}x ${p.type} ${p.taille}mm`).join(', ');
}

export function genererTitreJoaillerie(infos: JoaillerieInfos): string {
  const matiereLabel = infos.matiere + (infos.carat ? ` ${infos.carat}` : '');
  switch (infos.categorie) {
    case 'medium-base-serti':
      return infos.pierres && infos.pierres.length > 0
        ? `${infos.nom} — ${matiereLabel} serti ${resumePierres(infos.pierres)}`
        : `${infos.nom} — ${matiereLabel} serti`;
    case 'piece-serie':
      return infos.nom_client
        ? `${infos.nom} — Projet unique ${matiereLabel} · ${infos.nom_client}`
        : `${infos.nom} — Pièce d'exception Mood Joaillerie`;
    case 'alliance':
      return `Alliance ${matiereLabel}${infos.finition ? ' ' + infos.finition : ''}`;
    case 'coffret':
      return `Coffret ${infos.nom} — Mood Joaillerie`;
    case 'compagnon':
      return `${infos.nom} — ${matiereLabel}`;
    default:
      return `${infos.nom} — ${matiereLabel}`;
  }
}

// ============ PAYLOAD SHOPIFY ============
const PRODUCT_TYPE_MAP: Record<JoaillerieCategorie, string> = {
  'medium-base-serti': 'medium et base entièrement sertis',
  'piece-serie': 'pièce d\'exception et série',
  'coffret': 'coffret joaillerie',
  'alliance': 'alliance',
  'compagnon': 'compagnon',
};

function construireBodyHtml(infos: JoaillerieInfos): string {
  const matiereLabel = infos.matiere + (infos.carat ? ` ${infos.carat}` : '');
  let html = `<p><strong>${infos.nom}</strong></p>`;
  html += `<p>Matière : ${matiereLabel}</p>`;
  if (infos.finition) html += `<p>Finition : ${infos.finition}</p>`;
  if (infos.pierres && infos.pierres.length > 0) {
    html += `<p>Pierres : ${resumePierres(infos.pierres)}</p>`;
    const carats = calculerCaratsTotal(infos.pierres);
    if (carats !== null && carats > 0) {
      html += `<p>Poids total : ${carats} carats</p>`;
    }
  }
  if (infos.sertissage) html += `<p>Sertissage : ${infos.sertissage}</p>`;
  if (infos.composants) html += `<p>Composants :<br>${infos.composants.replace(/\n/g, '<br>')}</p>`;
  if (infos.gravure) html += `<p>Gravure intérieure : ${infos.gravure}</p>`;
  html += `<p>Catégorie : ${PRODUCT_TYPE_MAP[infos.categorie] || infos.categorie}</p>`;
  html += `<p>Créé par Mood Joaillerie — Orbe, Suisse.</p>`;
  return html;
}

export function construirePayloadJoaillerie(infos: JoaillerieInfos): unknown {
  const tailles = infos.tailles && infos.tailles.length > 0 ? infos.tailles : TAILLES_STANDARD;
  const prix = infos.prix ? String(infos.prix) : "0";

  const variants = tailles.map((taille) => ({
    option1: taille,
    sku: genererSkuJoaillerie(infos, taille),
    price: prix,
    inventory_management: "shopify",
    inventory_policy: "deny",
  }));

  return {
    product: {
      title: genererTitreJoaillerie(infos),
      vendor: "Mood Joaillerie",
      product_type: PRODUCT_TYPE_MAP[infos.categorie] || infos.categorie,
      status: "draft",
      tags: genererTagsJoaillerie(infos),
      body_html: construireBodyHtml(infos),
      options: [{ name: "Taille" }],
      variants,
    },
  };
}
