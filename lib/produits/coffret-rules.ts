const TAILLES_STANDARD = [
  "50","52","54","56","58","60","62","64","66","68","70","72","taille inconnue",
];

function slug(s: string) {
  return (s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function genererSkuCoffret({
  nom,
  taille,
  avecBase,
  avecBoite,
}: {
  nom: string;
  taille: string;
  avecBase?: boolean;
  avecBoite?: boolean;
}) {
  const nomSlug = slug(nom);
  const t = taille === "taille inconnue" ? "00" : taille;
  const segments = ["COFFRET", nomSlug];
  if (avecBase) segments.push("BASE");
  if (avecBoite) segments.push("BOITE");
  segments.push(t);
  return segments.join("-");
}

export function genererTitreCoffret({ nom }: { nom: string }) {
  return nom;
}

export function genererTagsCoffret({
  nom,
  autresTags = [],
}: {
  nom: string;
  autresTags?: string[];
}) {
  const annee = String(new Date().getFullYear());
  const tags: string[] = [];
  tags.push("coffret");
  tags.push("COFFRETS");
  tags.push("coffrets du mois");
  tags.push("coffretsfemme");
  tags.push("coffretshomme");
  tags.push(slug(nom).toLowerCase());
  tags.push("allonline");
  tags.push("for_men");
  tags.push("for_women");
  tags.push("NEW");
  tags.push(`AMILA${annee}`);
  tags.push(annee);
  autresTags.forEach((t) => t && tags.push(t));
  return [...new Set(tags.filter(Boolean))].join(", ");
}

export function genererDescriptionCoffret({
  nom,
  composants,
  texteInspiration,
  avecBase,
  avecBoite,
}: {
  nom: string;
  composants?: string;
  texteInspiration?: string;
  avecBase?: boolean;
  avecBoite?: boolean;
}) {
  const titreNom = `<h1 style="font-size:2em;font-weight:bold;margin-bottom:0.5em;">${nom}</h1>`;
  const inspiration =
    texteInspiration && texteInspiration.trim()
      ? texteInspiration
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((p) => `<p>${p}</p>`)
          .join("")
      : `<p>${nom} — un coffret signé Mood Collection.</p>`;

  const composantsHtml =
    composants && composants.trim()
      ? composants
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((l) => `<li>${l.replace(/^[-•]\s*/, "")}</li>`)
          .join("")
      : "";

  return `${titreNom}
${inspiration}
${composantsHtml ? `<h3>Composé de</h3>\n<ul>${composantsHtml}</ul>` : ""}
${
  avecBase || avecBoite
    ? `<h3>Options du coffret</h3>
<ul>
  ${avecBase ? "<li>Disponible <strong>avec</strong> ou <strong>sans</strong> la base mood</li>" : ""}
  ${avecBoite ? "<li>Disponible <strong>avec</strong> ou <strong>sans</strong> la boîte mood</li>" : ""}
</ul>`
    : ""
}
<h3>Caractéristiques</h3>
<ul>
  <li>Garantie à vie</li>
  <li>Design suisse</li>
</ul>
<h3>Précautions et informations</h3>
<p>Nous vous rendons attentifs au fait que la couleur de l'addon et de ses dessins peuvent varier selon la lumière.</p>`;
}

interface CoffretInfos {
  nom: string;
  composants?: string;
  texteInspiration?: string;
  prixSansBase?: number | string;
  prixAvecBase?: number | string;
  optionBoite?: boolean;
  prixSansBoite?: number | string;
  prixAvecBoite?: number | string;
  tailles?: string[];
  prix?: number | string;
}

export function construirePayloadCoffret(
  infos: CoffretInfos,
  seoOverride?: { title: string; description: string }
) {
  const {
    nom,
    composants,
    texteInspiration,
    prixSansBase,
    prixAvecBase,
    optionBoite,
    prixSansBoite,
    prixAvecBoite,
    tailles,
  } = infos;
  const aOptionBase = !!(prixSansBase && prixAvecBase);
  const aOptionBoite = !!optionBoite;
  const taillesList = tailles || TAILLES_STANDARD;

  const options: { name: string }[] = [{ name: "Taille" }];
  if (aOptionBase) options.push({ name: "Base" });
  if (aOptionBoite) options.push({ name: "Boîte" });

  type Variant = Record<string, unknown>;
  const variants: Variant[] = [];
  for (const t of taillesList) {
    const basesToUse = aOptionBase ? [false, true] : [false];
    for (const avecBase of basesToUse) {
      const boitesToUse = aOptionBoite ? [false, true] : [false];
      for (const avecBoite of boitesToUse) {
        let prix: string;
        if (aOptionBase && aOptionBoite) {
          const supBase = avecBase
            ? Number(prixAvecBase) - Number(prixSansBase)
            : 0;
          const supBoite = avecBoite
            ? Number(prixAvecBoite) - Number(prixSansBoite)
            : 0;
          prix = String(Number(prixSansBase) + supBase + supBoite);
        } else if (aOptionBase) {
          prix = avecBase ? String(prixAvecBase) : String(prixSansBase);
        } else if (aOptionBoite) {
          prix = avecBoite ? String(prixAvecBoite) : String(prixSansBoite);
        } else {
          prix = String(infos.prix || prixSansBase || "0");
        }

        const variante: Variant = {
          option1: t,
          sku: genererSkuCoffret({ nom, taille: t, avecBase, avecBoite }),
          price: prix,
          inventory_management: "shopify",
          inventory_policy: "deny",
          requires_shipping: true,
          taxable: true,
          weight: 30,
          weight_unit: "g",
        };
        let optIdx = 2;
        if (aOptionBase) variante[`option${optIdx++}`] = avecBase ? "Avec" : "Sans";
        if (aOptionBoite) variante[`option${optIdx++}`] = avecBoite ? "Avec" : "Sans";
        variants.push(variante);
      }
    }
  }

  const titre = genererTitreCoffret({ nom });
  const handle = `coffret-${slug(nom).toLowerCase()}`.replace(/-+/g, "-");
  const tags = genererTagsCoffret({ nom });
  const seo = seoOverride || {
    title: `${titre} - bague mood interchangeable`.slice(0, 70),
    description: `${titre}. ${
      composants
        ? composants.replace(/\n/g, " ").slice(0, 100)
        : "Composition mood unique"
    }. Mood Collection, design suisse.`.slice(0, 160),
  };

  return {
    product: {
      title: titre,
      body_html: genererDescriptionCoffret({
        nom,
        composants,
        texteInspiration,
        avecBase: aOptionBase,
        avecBoite: aOptionBoite,
      }),
      vendor: "Mood Collection",
      product_type: "coffret",
      handle,
      status: "draft",
      tags,
      options,
      metafields_global_title_tag: seo.title,
      metafields_global_description_tag: seo.description,
      variants,
    },
  };
}
