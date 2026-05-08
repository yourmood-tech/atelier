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
  sertissage?: string;          // medium-full | medium-partiel | base-1-cote | base-2-cotes
  type_sertissage?: string;     // invisible | grain | neige | 2-grains | (texte libre)
  nb_serie?: number;            // nombre de pièces produites dans la série
  description_ia?: string;      // texte poétique généré par Gemini
  mots_cles?: string;           // mots-clés utilisés pour la génération IA
  sous_type_piece?: 'projet-unique' | 'piece-exception';  // pour catégorie piece-serie
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

/** Mapping catégorie → label tag lisible (FR, sans préfixe) */
const CATEGORIE_TAG_LABEL: Record<JoaillerieCategorie, string> = {
  'medium-base-serti': 'pièce sertie',
  'piece-serie':       'pièce sertie',  // affiné par sous_type_piece
  'coffret':           'coffret',
  'alliance':          'alliance',
  'compagnon':         'compagnon',
};

export function genererTagsJoaillerie(infos: JoaillerieInfos): string {
  const tags: string[] = [];
  const isOr = infos.matiere.startsWith('or ');

  // 1. Marque
  tags.push('Joaillerie');

  // 2. Nom du produit (retiré du format s'il y est collé)
  if (infos.nom) {
    let nomTag = infos.nom.toLowerCase().trim();
    // Si le format est dans le nom, on l'enlève (ex: "test medium" + format=medium → "test")
    const formatsConnus = ['addon', 'deux tiers', 'medium', 'mini', 'open mood', 'base small', 'base large', 'base extra small'];
    for (const f of formatsConnus) {
      const re = new RegExp(`\\b${f}\\b`, 'gi');
      nomTag = nomTag.replace(re, '').trim();
    }
    nomTag = nomTag.replace(/\s+/g, ' ').trim();  // collapse spaces
    if (nomTag) tags.push(nomTag);
  }

  // 3. Matière (sans préfixe). Carat séparé si or.
  tags.push(infos.matiere.toLowerCase());
  if (isOr && infos.carat) tags.push(infos.carat.toLowerCase());

  // 4. Format (sans préfixe) — toujours en tag séparé
  if (infos.format) tags.push(infos.format.toLowerCase());

  // 5. Pierres : nom de chaque type (sans préfixe) + tailles mm
  if (infos.pierres && infos.pierres.length > 0) {
    const typesSeen = new Set<string>();
    const taillesSeen = new Set<string>();
    for (const p of infos.pierres) {
      const t = (p.type || '').toLowerCase().trim();
      if (t && !typesSeen.has(t)) {
        tags.push(t);
        typesSeen.add(t);
      }
      const tailleTag = `${p.taille}mm`;
      if (!taillesSeen.has(tailleTag)) {
        tags.push(tailleTag);
        taillesSeen.add(tailleTag);
      }
    }
  }

  // 6. Type de sertissage joaillier (juste le nom)
  if (infos.type_sertissage) {
    tags.push(infos.type_sertissage.toLowerCase());
  }

  // 7. Carats total
  if (infos.pierres && infos.pierres.length > 0) {
    const carats = calculerCaratsTotal(
      infos.pierres.map(p => ({ taille: p.taille, quantite: p.quantite }))
    );
    if (carats !== null && carats > 0) {
      tags.push(`${carats.toFixed(2)}ct`);
    }
  }

  // 8. Catégorie (label lisible, sans préfixe)
  if (infos.categorie === 'piece-serie') {
    // Affiner selon sous_type_piece
    if (infos.sous_type_piece === 'projet-unique') tags.push('projet unique');
    else tags.push("pièce d'exception");
  } else {
    tags.push(CATEGORIE_TAG_LABEL[infos.categorie] || infos.categorie);
  }

  // 9. Sous-style (Yarrow / bague-cadeau-exception)
  if (infos.sous_style === 'yarrow') tags.push('yarrow');
  if (infos.sous_style === 'bague-cadeau-exception') tags.push("cadeau d'exception");

  // 10. Tag prix range
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

/** Met une pierre au pluriel ("diamant" → "diamants", "rubis" → "rubis"). */
function pluraliserPierre(type: string): string {
  if (!type) return '';
  // Cas particuliers Mood Joaillerie
  const cas: Record<string, string> = {
    'diamant': 'diamants',
    'diamant-noir': 'diamants noirs',
    'diamant-brun': 'diamants bruns',
    'diamant-ice-gris': 'diamants ice gris',
    'diamant-pur-rose': 'diamants pur rose',
    'c-diams': 'champagne diamants',
    'saphir': 'saphirs',
    'emeraude': 'émeraudes',
    'rubis': 'rubis',
    'amethyste': 'améthystes',
    'grenat': 'grenats',
    'topaze': 'topazes',
    'tsavorite': 'tsavorites',
    'cabochon': 'cabochons',
  };
  return cas[type.toLowerCase()] || type;
}

/** Formate les pierres pour le titre : "diamants 1.6mm" ou "diamants et saphirs 1.6mm". */
function pierresPourTitre(pierres: PierreItem[]): string {
  if (!pierres || pierres.length === 0) return '';
  const taille = pierres[0].taille;
  const types = [...new Set(pierres.map(p => pluraliserPierre(p.type)))];
  if (types.length === 1) return `${types[0]} ${taille}mm`;
  if (types.length === 2) return `${types[0]} et ${types[1]} ${taille}mm`;
  return `${types.slice(0, -1).join(', ')} et ${types[types.length - 1]} ${taille}mm`;
}

/** Sertissage narratif pour le titre. */
function sertissageNarratif(sertissage: string): string {
  switch (sertissage) {
    case 'medium-full': return 'medium entièrement serti';
    case 'medium-partiel': return 'medium partiellement serti';
    case 'base-1-cote': return "base sertie d'un côté";
    case 'base-2-cotes': return 'base sertie des deux côtés';
    default: return 'serti';
  }
}

export function genererTitreJoaillerie(infos: JoaillerieInfos): string {
  // Carat uniquement si or (ne pas l'afficher pour argent / acier / titane / etc.)
  const isOr = infos.matiere.startsWith('or ');
  const matiereLabel = infos.matiere + (isOr && infos.carat ? ` ${infos.carat}` : '');

  switch (infos.categorie) {
    case 'medium-base-serti': {
      const sertNarratif = sertissageNarratif(infos.sertissage || '');
      const pierresLabel = infos.pierres && infos.pierres.length > 0
        ? ` de ${pierresPourTitre(infos.pierres)}`
        : '';
      return `${infos.nom} ${sertNarratif}${pierresLabel}`;
    }
    case 'piece-serie': {
      const sousTypeTxt = infos.sous_type_piece === 'projet-unique'
        ? 'projet unique'
        : 'pièce d\'exception';
      return `${infos.nom} - ${sousTypeTxt} mood joaillerie`;
    }
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
  'medium-base-serti': 'pièce sertie',  // sera affiné par sertissage (medium serti / base sertie)
  'piece-serie': 'pièce d\'exception et série',
  'coffret': 'coffret joaillerie',
  'alliance': 'alliance',
  'compagnon': 'compagnon',
};

/** Calcule le product_type final selon catégorie + sertissage */
function resoudreProductType(infos: JoaillerieInfos): string {
  if (infos.categorie === 'medium-base-serti') {
    if (infos.sertissage?.startsWith('base-')) return 'base sertie';
    if (infos.sertissage?.startsWith('medium-')) return 'medium serti';
    return 'pièce sertie';
  }
  return PRODUCT_TYPE_MAP[infos.categorie] || infos.categorie;
}

function construireBodyHtml(infos: JoaillerieInfos): string {
  const isOr = infos.matiere.startsWith('or ');
  const matiereLabel = infos.matiere + (isOr && infos.carat ? ` ${infos.carat}` : '');
  let html = '';

  // Titre du produit en majuscule, grand, en haut de la description
  html += `<h2 style="text-transform:uppercase;font-size:1.4em;margin:0 0 0.5em 0;">${infos.nom}</h2>`;

  // Description IA (poétique / technique) en intro
  if (infos.description_ia && infos.description_ia.trim()) {
    const paragraphs = infos.description_ia.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    for (const para of paragraphs) {
      html += `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }
  }

  // Caractéristiques techniques (titre en gras + bullets)
  html += `<p><strong>Caractéristiques</strong></p>`;
  html += `<ul>`;
  html += `<li><strong>Matière :</strong> ${matiereLabel}</li>`;
  if (infos.finition) html += `<li><strong>Finition :</strong> ${infos.finition}</li>`;
  if (infos.format) html += `<li><strong>Format :</strong> ${infos.format}</li>`;
  if (infos.nb_serie && infos.nb_serie > 1) html += `<li><strong>Série :</strong> ${infos.nb_serie} pièces produites</li>`;
  html += `</ul>`;

  // Pierres + carats
  if (infos.pierres && infos.pierres.length > 0) {
    html += `<p><strong>Pierres serties</strong></p>`;
    html += `<ul>`;
    html += `<li>${resumePierres(infos.pierres)}</li>`;
    const carats = calculerCaratsTotal(infos.pierres);
    if (carats !== null && carats > 0) {
      html += `<li><strong>Poids total :</strong> ${carats} carats</li>`;
    }
    html += `</ul>`;
  }

  // Sertissage
  if (infos.sertissage || infos.type_sertissage) {
    html += `<p><strong>Sertissage</strong></p>`;
    html += `<ul>`;
    if (infos.sertissage) html += `<li><strong>Type de pose :</strong> ${infos.sertissage}</li>`;
    if (infos.type_sertissage) html += `<li><strong>Sertissage joaillier :</strong> ${infos.type_sertissage}</li>`;
    html += `</ul>`;
  }

  // Composants (coffret)
  if (infos.composants) {
    html += `<p><strong>Composants du coffret</strong></p>`;
    html += `<p>${infos.composants.replace(/\n/g, '<br>')}</p>`;
  }

  // Gravure
  if (infos.gravure) {
    html += `<p><strong>Gravure intérieure :</strong> ${infos.gravure}</p>`;
  }

  // Signature finale
  html += `<p><em>Pièce signée mood joaillerie — Orbe, Suisse.</em></p>`;
  return html;
}

export function construirePayloadJoaillerie(
  infos: JoaillerieInfos,
  seoOverride?: { title: string; description: string } | null,
): unknown {
  const tailles = infos.tailles && infos.tailles.length > 0 ? infos.tailles : TAILLES_STANDARD;
  const prix = infos.prix ? String(infos.prix) : "0";

  const variants = tailles.map((taille) => ({
    option1: taille,
    sku: genererSkuJoaillerie(infos, taille),
    price: prix,
    inventory_management: "shopify",
    inventory_policy: "deny",
  }));

  const product: Record<string, unknown> = {
    title: genererTitreJoaillerie(infos),
    vendor: "Mood Joaillerie",
    product_type: resoudreProductType(infos),
    status: "draft",
    tags: genererTagsJoaillerie(infos),
    body_html: construireBodyHtml(infos),
    options: [{ name: "Taille" }],
    variants,
  };

  if (seoOverride) {
    product.metafields_global_title_tag = seoOverride.title;
    product.metafields_global_description_tag = seoOverride.description;
  }

  return { product };
}
