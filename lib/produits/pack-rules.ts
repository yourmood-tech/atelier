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

export function genererSkuPack({ nom, taille }: { nom: string; taille: string }) {
  const t = taille === "taille inconnue" ? "00" : taille;
  return `PACK-${slug(nom)}-${t}`;
}

export function genererTitrePack({ nom }: { nom: string }) {
  return nom;
}

export function genererTagsPack({
  nom,
  autresTags = [],
}: {
  nom: string;
  autresTags?: string[];
}) {
  const annee = String(new Date().getFullYear());
  const tags: string[] = [];
  tags.push("pack");
  tags.push("packs");
  tags.push("garde mood");
  tags.push("gardemood");
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

export function genererDescriptionPack({
  nom,
  composants,
  texteInspiration,
}: {
  nom: string;
  composants?: string;
  texteInspiration?: string;
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
      : `<p>${nom} — un pack signé Mood Collection.</p>`;

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
<h3>Caractéristiques</h3>
<ul>
  <li>Garantie à vie</li>
  <li>Design suisse</li>
</ul>
<h3>Précautions et informations</h3>
<p>Nous vous rendons attentifs au fait que la couleur de l'addon et de ses dessins peuvent varier selon la lumière.</p>`;
}

interface PackInfos {
  nom: string;
  composants?: string;
  texteInspiration?: string;
  prix?: number | string;
  tailles?: string[];
}

export function construirePayloadPack(
  infos: PackInfos,
  seoOverride?: { title: string; description: string }
) {
  const { nom, composants, texteInspiration, prix, tailles } = infos;
  const taillesList = tailles || TAILLES_STANDARD;

  const variants = taillesList.map((t) => ({
    option1: t,
    sku: genererSkuPack({ nom, taille: t }),
    price: String(prix || "0"),
    inventory_management: "shopify",
    inventory_policy: "deny",
    requires_shipping: true,
    taxable: true,
    weight: 20,
    weight_unit: "g",
  }));

  const titre = genererTitrePack({ nom });
  const handle = `pack-${slug(nom).toLowerCase()}`.replace(/-+/g, "-");
  const tags = genererTagsPack({ nom });
  const seo = seoOverride || {
    title: `${titre} — Mood Collection`.slice(0, 70),
    description: `${titre}. ${
      composants
        ? composants.replace(/\n/g, " ").slice(0, 100)
        : "Plusieurs addons mood"
    }. Mood Collection, design suisse.`.slice(0, 160),
  };

  return {
    product: {
      title: titre,
      body_html: genererDescriptionPack({ nom, composants, texteInspiration }),
      vendor: "Mood Collection",
      product_type: "pack",
      handle,
      status: "draft",
      tags,
      options: [{ name: "Taille" }],
      metafields_global_title_tag: seo.title,
      metafields_global_description_tag: seo.description,
      variants,
    },
  };
}
