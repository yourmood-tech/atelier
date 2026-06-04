import prixData from "./prix.json";

export function getPrix(matiere: string, format: string) {
  if (!matiere || !format) return { achat: null, vente: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = (prixData as any).prix?.[matiere.toLowerCase()]?.[format.toLowerCase()];
  if (!entry) return { achat: null, vente: null };
  return { achat: entry.achat ?? null, vente: entry.vente ?? null };
}

export const FORMAT_TO_SKU: Record<string, string> = {
  addon: "AD",
  "deux tiers": "DT",
  medium: "ME",
  mini: "MN",
  "open mood": "OP",
  pack: "PA",
  "base large": "BL",
  "base small": "BS",
  "base extra small": "BXS",
};

export const FORME_BASE_TO_SKU: Record<string, string> = {
  arrondie: "AR",
  carrée: "CA",
};

export const MATIERE_TO_SKU: Record<string, string> = {
  argent: "ARGENT",
  or: "OR",
  aluminium: "ALU",
  polymère: "POLY",
  titane: "TIT",
  acier: "ACIER",
  bronze: "BRONZE",
  bois: "BOIS",
  céramique: "CERAM",
  carbone: "CARB",
  tantale: "TANT",
};

export const FORMAT_TO_TAG: Record<string, string> = {
  addon: "COLLECTIONADDON",
  "deux tiers": "COLLECTIONDEUXTIERS",
  medium: "COLLECTIONMEDIUM",
  mini: "COLLECTIONMINI",
  "open mood": "COLLECTIONOPENMOOD",
  pack: "COLLECTIONPACK",
};

export const MATIERE_TO_MOODCAT: Record<string, string> = {
  or: "mood02",
  bois: "mood02",
  carbone: "mood02",
  argent: "mood04",
  bronze: "mood04",
  polymère: "mood04",
  acier: "mood06",
  titane: "mood06",
  aluminium: "mood08",
};

export const MATIERE_TO_DELAI: Record<string, number> = {
  aluminium: 3,
  polymère: 3,
  bois: 3,
  acier: 3,
  titane: 7,
  carbone: 7,
  or: 10,
  argent: 10,
};

export function categoriePrix(prix: number | string) {
  const p = Number(prix);
  if (p < 50) return "P20.49";
  if (p < 160) return "P50.159";
  if (p < 250) return "P160.249";
  if (p < 500) return "P250.499";
  if (p < 1500) return "P500.1499";
  return "P1500.x";
}

export const TAILLES_STANDARD = [
  "50","52","54","56","58","60","62","64","66","68","70","72",
];

function slugCouleur(c: string) {
  return (c || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function estBase(format: string) {
  return format && format.toLowerCase().startsWith("base");
}

export function genererSku({
  format,
  matiere,
  nom,
  taille,
  couleur,
  formeBase,
  finitionBase,
  options = {},
}: {
  format: string;
  matiere: string;
  nom: string;
  taille: string;
  couleur?: string | null;
  formeBase?: string;
  finitionBase?: string;
  options?: { couleurMultiPalette?: boolean };
}) {
  const t = taille === "taille inconnue" ? "00" : taille;
  if (estBase(format)) {
    const tBase = FORMAT_TO_SKU[format.toLowerCase()] || "BS";
    const forme = FORME_BASE_TO_SKU[(formeBase || "").toLowerCase()] || "AR";
    const fin = slugCouleur(finitionBase || "NEUTRE") || "NEUTRE";
    const nomSku = nom ? nom.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    if (nomSku) return `${tBase}-${forme}-${nomSku}-${fin}-${t}`;
    return `${tBase}-${forme}-${fin}-${t}`;
  }
  const f = FORMAT_TO_SKU[format.toLowerCase()];
  const m = MATIERE_TO_SKU[matiere.toLowerCase()];
  const n = nom.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (couleur && options?.couleurMultiPalette) {
    return `${f}-${n}-${slugCouleur(couleur)}-${t}`;
  }
  if (couleur) {
    return `${f}-${m}-${n}-${slugCouleur(couleur)}-${t}`;
  }
  return `${f}-${m}-${n}-${t}`;
}

export function genererTitre({
  format,
  formats,
  nom,
  matiere,
  finition,
  nbCouleurs,
  multiFormats,
  formeBase,
  finitionBase,
  couleurs,
}: {
  format: string;
  formats?: string[];
  nom?: string;
  matiere: string;
  finition?: string;
  nbCouleurs?: number;
  multiFormats?: boolean;
  formeBase?: string;
  finitionBase?: string;
  couleurs?: string[];
}) {
  if (estBase(format)) {
    const formeTxt = formeBase ? ` ${formeBase}` : "";
    let finBaseTxt =
      finitionBase && finitionBase.toLowerCase() !== "neutre"
        ? ` ${finitionBase.toLowerCase()}`
        : "";
    const nomTxt = nom ? ` "${nom}"` : "";
    if (Array.isArray(couleurs) && couleurs.length === 1) {
      finBaseTxt = ` ${couleurs[0].toLowerCase()}`;
    } else if (Array.isArray(couleurs) && couleurs.length > 1) {
      return `${format.charAt(0).toUpperCase()}${format.slice(1)}${nomTxt} en ${matiere}${formeTxt}${finBaseTxt} — couleurs à choix`;
    }
    return `${format.charAt(0).toUpperCase()}${format.slice(1)}${nomTxt} en ${matiere}${formeTxt}${finBaseTxt} pour bague mood interchangeable`;
  }
  if (multiFormats) {
    const couleursTxt = nbCouleurs && nbCouleurs > 1 ? " — couleurs à choix" : "";
    return `${nom} en ${matiere} — formats à choix${couleursTxt}`;
  }
  if (nbCouleurs && nbCouleurs > 1) {
    return `Anneau (${format}) ${nom} en ${matiere} couleurs à choix`;
  }
  const finitionTxt = finition && finition !== "aucune" ? ` ${finition}` : "";
  return `Anneau (${format}) "${nom}" en ${matiere}${finitionTxt} pour bague mood interchangeable`;
}

export function genererTags({
  format,
  formats,
  matiere,
  finition,
  nom,
  couleur,
  couleurs,
  groupeCouleur,
  collection,
  prix,
  anneeAmila,
  formeBase,
  finitionBase,
  tagsParticuliers,
  pierres,
}: {
  format: string;
  formats?: string[];
  matiere: string;
  finition?: string;
  nom?: string;
  couleur?: string;
  couleurs?: string[];
  groupeCouleur?: string;
  collection?: string;
  prix?: number | string;
  anneeAmila?: number | string;
  formeBase?: string;
  finitionBase?: string;
  tagsParticuliers?: string[];
  pierres?: Array<{ type: string; taille: string; quantite: number }>;
}) {
  const tags: string[] = [];
  if (collection) tags.push(collection.toLowerCase());
  tags.push(matiere.toLowerCase());
  if (groupeCouleur) tags.push(groupeCouleur.toLowerCase());
  if (couleur) tags.push(couleur.toLowerCase());
  if (Array.isArray(couleurs)) {
    couleurs.forEach((c) => c && tags.push(c.toLowerCase()));
  }
  if (finition && finition !== "aucune") tags.push(finition.toLowerCase());

  const formatsToTag =
    Array.isArray(formats) && formats.length > 0 ? formats : [format];
  formatsToTag.forEach((f) => {
    if (!f) return;
    tags.push(f.toLowerCase());
    const fTag = FORMAT_TO_TAG[f.toLowerCase()];
    if (fTag) tags.push(fTag);
    if (estBase(f)) {
      tags.push("base");
      tags.push(`base${matiere.toLowerCase()}`);
    }
  });

  // Tags configurateur (côté app /configurator)
  const aBase = formatsToTag.some((f) => estBase(f));
  const aAddon = formatsToTag.some((f) => f && !estBase(f));

  if (aBase) {
    tags.push("configurateur:base");
    tags.push(`matiere:${matiere.toLowerCase()}`);
    formatsToTag.forEach((f) => {
      const lf = (f || "").toLowerCase();
      if (lf === "base extra small") tags.push("largeur:xs");
      else if (lf === "base small") tags.push("largeur:s");
      else if (lf === "base large") tags.push("largeur:l");
    });
  }

  if (aAddon) {
    tags.push("configurateur:addon");
    // Compatibilité par défaut : les "addon" classiques se clipsent uniquement
    // sur base S et L (pas XS). Tous les autres formats clipsables (deux tiers,
    // medium, mini, open mood, pack) se clipsent sur les 3 largeurs.
    const compat = new Set<string>();
    formatsToTag.forEach((f) => {
      const lf = (f || "").toLowerCase();
      if (estBase(f) || !lf) return;
      if (lf === "addon") {
        compat.add("s");
        compat.add("l");
      } else {
        compat.add("xs");
        compat.add("s");
        compat.add("l");
      }
    });
    compat.forEach((c) => tags.push(`compatible:${c}`));
  }

  if (formeBase) tags.push(formeBase.toLowerCase());
  if (finitionBase) tags.push(finitionBase.toLowerCase());

  if (Array.isArray(tagsParticuliers)) {
    tagsParticuliers.forEach((t) => t && tags.push(t));
  }

  // Pierres précieuses serties → 1 tag par type unique + tag "serti-pierres-precieuses"
  if (Array.isArray(pierres) && pierres.length > 0) {
    const types = [...new Set(pierres.map((p) => (p.type || "").toLowerCase()).filter(Boolean))];
    if (types.length) {
      tags.push("serti-pierres-precieuses");
      types.forEach((t) => tags.push(t));
    }
  }

  if (nom) tags.push(nom.toLowerCase());
  tags.push(MATIERE_TO_MOODCAT[matiere.toLowerCase()]);
  tags.push(categoriePrix(prix || 0));
  tags.push("discountableproduct");
  tags.push("qoqa-discountable");
  tags.push("allonline");
  tags.push("for_men");
  tags.push("for_women");
  tags.push("NEW");
  if (anneeAmila) tags.push(`AMILA${anneeAmila}`);
  return [...new Set(tags.filter(Boolean))].join(", ");
}

export function genererCompatibilite(format: string) {
  const f = format.toLowerCase();
  if (f === "addon") {
    return "<li>Sur base <strong>small</strong> ou <strong>large</strong></li><li>⚠️ Non compatible avec la base extra small (9mm)</li>";
  }
  if (f === "deux tiers") {
    return "<li>Sur base <strong>small</strong> ou <strong>large</strong> : accompagné d'un medium, ou de 2 minis</li><li>Sur base <strong>extra small</strong> : seul</li>";
  }
  if (f === "medium") {
    return "<li>Sur base <strong>small</strong> ou <strong>large</strong> : accompagné de 2 mediums, d'un deux tiers, ou de 4 minis</li><li>Sur base <strong>extra small</strong> : accompagné d'un medium ou de 2 minis</li>";
  }
  if (f === "mini") {
    return "<li>Sur base <strong>small</strong> ou <strong>large</strong> : accompagné de 2 mediums, 4 minis, ou 1 deux tiers (par 2 minis)</li><li>Sur base <strong>extra small</strong> : accompagné d'1 medium ou 2 minis</li>";
  }
  if (f === "base small" || f === "base large") {
    return "<li>Compatible avec un addon <strong>complet</strong></li><li>Compatible avec un deux tiers + un medium ou 2 minis</li><li>Compatible avec un medium + un deux tiers, 2 mediums ou 4 minis</li>";
  }
  if (f === "base extra small") {
    return "<li>Compatible avec un deux tiers <strong>seul</strong></li><li>Compatible avec un medium + 2 minis, ou un medium seul</li><li>⚠️ Non compatible avec un addon</li>";
  }
  return "<li>Voir les détails de compatibilité avec un Mood Lover</li>";
}

export function genererDescription({
  format,
  formats,
  nom,
  matiere,
  finition,
  texteInspiration,
  multiFormats,
  formeBase,
  finitionBase,
  couleurs,
  pierres,
}: {
  format: string;
  formats?: string[];
  nom?: string;
  matiere: string;
  finition?: string;
  texteInspiration?: string;
  multiFormats?: boolean;
  formeBase?: string;
  finitionBase?: string;
  couleurs?: string[];
  pierres?: Array<{ type: string; taille: string; quantite: number }>;
}) {
  const isBase = estBase(format);
  let titreAffiche: string;
  if (nom && (!isBase || nom !== format)) {
    titreAffiche = nom;
  } else if (isBase) {
    titreAffiche = `${format.charAt(0).toUpperCase()}${format.slice(1)} en ${matiere}${formeBase ? " " + formeBase : ""}${finitionBase && finitionBase.toLowerCase() !== "neutre" ? " " + finitionBase.toLowerCase() : ""}`;
  } else {
    titreAffiche = nom || format;
  }
  const titreNomGros = `<h1 style="font-size:2em;font-weight:bold;margin-bottom:0.5em;">${titreAffiche}</h1>`;

  const inspiration =
    texteInspiration && texteInspiration.trim()
      ? texteInspiration
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((p) => `<p>${p}</p>`)
          .join("")
      : isBase
      ? `<p>Une nouvelle base mood, prête à recevoir tes addons.</p>`
      : `<p>${nom} — un nouveau ${format} qui rejoint la famille mood.</p>`;

  let compatHtml: string;
  if (multiFormats && Array.isArray(formats) && formats.length > 1) {
    compatHtml = formats
      .map((f) => `<li><strong>${f}</strong> :<ul>${genererCompatibilite(f)}</ul></li>`)
      .join("");
  } else {
    compatHtml = genererCompatibilite(format);
  }

  const finitionTxt = finition && finition !== "aucune" ? finition : "";
  const matiereLabel = matiere === "argent" ? "argent 925" : matiere;
  const formatLabel =
    multiFormats && Array.isArray(formats) && formats.length > 1
      ? formats.join(", ")
      : format;

  const formatsTexte =
    Array.isArray(formats) && formats.length > 1 ? formats.join(", ") : format;
  const formatsLabelBase =
    Array.isArray(formats) && formats.length > 1 ? "Formats" : "Format";
  const couleursList = Array.isArray(couleurs) ? couleurs.filter(Boolean) : [];
  const finitionCouleurTxtBase =
    couleursList.length > 1
      ? couleursList.join(", ")
      : couleursList.length === 1
      ? couleursList[0]
      : finitionBase;
  const finitionCouleurLabelBase =
    couleursList.length > 1 ? "Finition / couleurs" : "Finition / couleur";

  const caracteristiquesHtml = isBase
    ? `<li>${formatsLabelBase} : ${formatsTexte}</li>
  <li>Matière : ${matiereLabel}</li>
  ${formeBase ? `<li>Forme : ${formeBase}</li>` : ""}
  ${finitionCouleurTxtBase ? `<li>${finitionCouleurLabelBase} : ${finitionCouleurTxtBase}</li>` : ""}`
    : `<li>Format${multiFormats ? "s disponibles" : ""} : ${formatLabel}</li>
  <li>Matière : ${matiereLabel}</li>
  ${couleursList.length > 0 ? `<li>Couleur${couleursList.length > 1 ? "s disponibles" : ""} : ${couleursList.join(", ")}</li>` : ""}
  ${finitionTxt ? `<li>Finition : ${finitionTxt}</li>` : ""}`;

  // Section pierres précieuses (si renseignées)
  let pierresHtml = "";
  if (Array.isArray(pierres) && pierres.length > 0) {
    const items = pierres
      .filter((p) => p && p.quantite > 0)
      .map((p) => `<li>${p.quantite} × ${p.type} ${p.taille}mm</li>`)
      .join("");
    if (items) {
      pierresHtml = `\n<h3>Pierres serties</h3>\n<ul>${items}</ul>`;
    }
  }

  return `${titreNomGros}
${inspiration}
<h3>Compatibilité</h3>
<ul>${compatHtml}</ul>
<h3>Caractéristiques</h3>
<ul>
  ${caracteristiquesHtml}
</ul>${pierresHtml}
<h3>Précautions et informations</h3>
<p>Nous vous rendons attentifs au fait que la couleur de l'addon et de ses dessins peuvent varier selon la lumière.</p>`;
}

export function genererSeo({
  format,
  nom,
  matiere,
  finition,
}: {
  format: string;
  nom: string;
  matiere: string;
  finition?: string;
}) {
  const finitionTxt = finition && finition !== "aucune" ? ` ${finition}` : "";
  return {
    title: `Anneau ${format} "${nom}" en ${matiere}${finitionTxt} — bague mood interchangeable`,
    description: `Le ${format} ${nom} en ${matiere}${finitionTxt}. À clipser sur une base small, large ou extra small.`,
  };
}

function getPrixForFormat(matiere: string, format: string) {
  if (!matiere || !format) return { vente: null, achat: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = (prixData as any).prix?.[matiere.toLowerCase()]?.[format.toLowerCase()];
  return entry
    ? { vente: entry.vente ?? null, achat: entry.achat ?? null }
    : { vente: null, achat: null };
}

interface ProduitInfos {
  format: string;
  formats?: string[];
  nom?: string;
  matiere: string;
  matieres?: string[];
  finition?: string;
  couleur?: string;
  couleurs?: string[];
  groupeCouleur?: string;
  collection?: string;
  prixVente?: number | string;
  texteInspiration?: string;
  tailles?: string[];
  formeBase?: string;
  finitionBase?: string;
  coutAchat?: number | string;
  tagsParticuliers?: string[];
  optionQuantite?: {
    libelle: string;
    choix: Array<{ nom: string; prix: number | string }>;
  };
  pierres?: Array<{ type: string; taille: string; quantite: number }>;
}

export function construirePayloadProduit(
  infos: ProduitInfos,
  seoOverride?: { title: string; description: string } | null
) {
  const {
    format,
    formats,
    nom,
    matiere,
    finition,
    couleur,
    couleurs,
    groupeCouleur,
    collection,
    prixVente,
    texteInspiration,
    tailles,
    formeBase,
    finitionBase,
  } = infos;
  const annee = new Date().getFullYear();
  const isBase = estBase(format);

  const formatsList =
    Array.isArray(formats) && formats.length > 0
      ? formats.filter(Boolean)
      : format
      ? [format]
      : [];
  const multiFormats = formatsList.length > 1;
  const formatPrincipal = formatsList[0] || format;

  const couleursList = Array.isArray(couleurs) ? couleurs.filter(Boolean) : [];
  const multiCouleurs = couleursList.length > 0;
  const taillesList = tailles || [...TAILLES_STANDARD, "taille inconnue"];

  const nomSlug = (nom || "").toLowerCase().replace(/[^a-z0-9]/g, "-");
  let handleSlug: string;
  if (isBase) {
    const formeTxt = (formeBase || "").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const finBaseTxt = (finitionBase || "").toLowerCase().replace(/[^a-z0-9]/g, "-");
    handleSlug = `${formatPrincipal.replace(/\s/g, "-")}-${matiere}${formeTxt ? "-" + formeTxt : ""}${finBaseTxt && finBaseTxt !== "neutre" ? "-" + finBaseTxt : ""}`.replace(/-+/g, "-");
  } else if (multiFormats && multiCouleurs) {
    handleSlug = `${nomSlug}-${matiere}-formats-couleurs-a-choix`.replace(/-+/g, "-");
  } else if (multiFormats) {
    handleSlug = `${nomSlug}-${matiere}-formats-a-choix`.replace(/-+/g, "-");
  } else if (multiCouleurs) {
    handleSlug = `anneau-${formatPrincipal.replace(/\s/g, "-")}-${nomSlug}-${matiere}-couleurs-a-choix`.replace(/-+/g, "-");
  } else {
    handleSlug = `anneau-${formatPrincipal.replace(/\s/g, "-")}-${nomSlug}-${matiere}${finition && finition !== "aucune" ? "-" + finition : ""}`.replace(/-+/g, "-");
  }

  const toutesSontBases = multiFormats && formatsList.every((f) => estBase(f));
  const isBaseSeule = isBase && !multiFormats;

  const options: { name: string }[] = [{ name: "Taille" }];
  if (isBaseSeule) {
    if (multiCouleurs) options.push({ name: "Couleur" });
  } else if (toutesSontBases) {
    options.push({ name: "Format" });
    if (multiCouleurs) options.push({ name: "Couleur" });
  } else if (multiFormats) {
    options.push({ name: "Format" });
    if (multiCouleurs) options.push({ name: "Couleur" });
  } else if (multiCouleurs) {
    options.push({ name: "Couleur" });
  }

  type Variant = Record<string, unknown>;
  const variants: Variant[] = [];

  if (isBaseSeule) {
    const couleursToUse = multiCouleurs ? couleursList : [null];
    for (const t of taillesList) {
      for (const c of couleursToUse) {
        const finPourSku = c || finitionBase || "";
        const variante: Variant = {
          option1: t,
          sku: genererSku({ format: formatPrincipal, matiere, nom: nom || formatPrincipal, taille: t, formeBase, finitionBase: finPourSku }),
          price: String(prixVente || "0"),
          inventory_management: "shopify",
          inventory_policy: "deny",
          requires_shipping: true,
          taxable: true,
          weight: 6,
          weight_unit: "g",
        };
        if (multiCouleurs) variante.option2 = c;
        variants.push(variante);
      }
    }
  } else if (toutesSontBases) {
    const couleursToUse = multiCouleurs ? couleursList : [null];
    for (const t of taillesList) {
      for (const fmt of formatsList) {
        for (const c of couleursToUse) {
          const finPourSku = c || finitionBase || "";
          const variante: Variant = {
            option1: t,
            option2: fmt,
            sku: genererSku({ format: fmt, matiere, nom: nom || fmt, taille: t, formeBase, finitionBase: finPourSku }),
            price: String(prixVente || "0"),
            inventory_management: "shopify",
            inventory_policy: "deny",
            requires_shipping: true,
            taxable: true,
            weight: 6,
            weight_unit: "g",
          };
          if (multiCouleurs) variante.option3 = c;
          variants.push(variante);
        }
      }
    }
  } else {
    for (const t of taillesList) {
      const formatsToUse = multiFormats ? formatsList : [formatPrincipal];
      for (const fmt of formatsToUse) {
        const couleursToUse = multiCouleurs
          ? couleursList
          : couleur
          ? [couleur]
          : [null];
        for (const c of couleursToUse) {
          let prixVar = String(prixVente || "0");
          if (multiFormats) {
            const p = getPrixForFormat(matiere, fmt);
            if (p.vente != null) prixVar = String(p.vente);
          }
          const variante: Variant = {
            option1: t,
            sku: genererSku({ format: fmt, matiere, nom: nom || fmt, taille: t, couleur: c, options: { couleurMultiPalette: multiCouleurs } }),
            price: prixVar,
            inventory_management: "shopify",
            inventory_policy: "deny",
            requires_shipping: true,
            taxable: true,
            weight: 4,
            weight_unit: "g",
          };
          let optIdx = 2;
          if (multiFormats) variante[`option${optIdx++}`] = fmt;
          if (multiCouleurs) variante[`option${optIdx++}`] = c;
          variants.push(variante);
        }
      }
    }
  }

  // ===== Multi-matières (1 variante par matière au choix client) =====
  // Si infos.matieres contient au moins 2 entrées, on duplique chaque variante par matière.
  // Le prix est recalculé selon la matière (via getPrixForFormat) si dispo dans le catalogue.
  if (Array.isArray(infos.matieres) && infos.matieres.length > 1) {
    const matieresList = infos.matieres.filter(Boolean);
    const variantsBase = [...variants];
    variants.length = 0;
    const nextOptKey = `option${options.length + 1}`;
    for (const v of variantsBase) {
      for (const m of matieresList) {
        const dup: Record<string, unknown> = { ...v };
        const prixMat = getPrixForFormat(m, formatPrincipal);
        if (prixMat.vente != null) dup.price = String(prixMat.vente);
        const slugMat = m.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 8) || "mat";
        dup.sku = `${v.sku}-${slugMat}`;
        dup[nextOptKey] = m;
        variants.push(dup);
      }
    }
    options.push({ name: "Matière" });
  }

  // ===== Option quantité au choix client (générique) =====
  // Ex : libelle="Nombre de minis", choix=[{nom:"1 mini",prix:49},{nom:"2 minis",prix:79}]
  // Duplique chaque variante de base par le nombre de choix, avec prix et suffixe SKU.
  if (
    infos.optionQuantite &&
    infos.optionQuantite.libelle &&
    Array.isArray(infos.optionQuantite.choix) &&
    infos.optionQuantite.choix.length > 0
  ) {
    const { libelle, choix } = infos.optionQuantite;
    const variantsBase = [...variants];
    variants.length = 0;
    const nextOptKey = `option${options.length + 1}`;
    for (const v of variantsBase) {
      for (const c of choix) {
        if (!c || !c.nom) continue;
        const dup: Record<string, unknown> = { ...v };
        const px = c.prix != null && c.prix !== "" ? c.prix : infos.prixVente ?? 0;
        dup.price = String(px);
        const slugChoix = String(c.nom)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 12) || "q";
        dup.sku = `${v.sku}-${slugChoix}`;
        dup[nextOptKey] = c.nom;
        variants.push(dup);
      }
    }
    options.push({ name: libelle });
  }

  const seo =
    seoOverride ||
    genererSeo({ format: formatPrincipal, nom: nom || formatPrincipal, matiere, finition });

  let productType: string;
  if (isBase) productType = formatPrincipal;
  else if (multiFormats) productType = `multi-formats ${matiere}`;
  else productType = `${formatPrincipal} ${matiere}`;

  return {
    product: {
      title: genererTitre({ format: formatPrincipal, formats: formatsList, nom, matiere, finition, nbCouleurs: couleursList.length, multiFormats, formeBase, finitionBase, couleurs: couleursList }),
      body_html: genererDescription({ format: formatPrincipal, formats: formatsList, nom: nom || formatPrincipal, matiere, finition, texteInspiration, multiFormats, formeBase, finitionBase, couleurs: couleursList, pierres: infos.pierres }),
      vendor: "Mood Collection",
      product_type: productType,
      handle: handleSlug,
      status: "draft",
      tags: genererTags({ format: formatPrincipal, formats: formatsList, matiere, finition, nom: nom || formatPrincipal, couleur, couleurs: couleursList, groupeCouleur, collection, prix: prixVente, anneeAmila: annee, formeBase, finitionBase, tagsParticuliers: infos.tagsParticuliers, pierres: infos.pierres }),
      options,
      metafields_global_title_tag: seo.title,
      metafields_global_description_tag: seo.description,
      variants,
    },
  };
}
