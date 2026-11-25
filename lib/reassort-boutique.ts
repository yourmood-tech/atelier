// Réassort boutique (demande de Philippe, 25.11.2026) : c'est toujours la boutique qui commande son stock.
// Elle écrit ou dicte ce qu'elle veut (« 10 medium aura, 2 par taille entre 54 et 62 »), l'outil retrouve les
// vrais articles du site, elle ajuste, peut laisser le brouillon et revenir. À la validation : brouillon de
// commande Shopify à 100 % de rabais (0 CHF) → commande réelle étiquetée « REASSORT BOUTIQUE », imprimée à l'atelier.
import { kv } from "@vercel/kv";
import { callClaudeJson } from "@/lib/claude-ai";
import { choisirVersion, repartir, tailleDe, type Candidat, type Demande, type Proposition, type TailleDispo } from "@/lib/reassort-boutique-commun";
import { addOrderTags, shopifyGet, shopifyGraphql, shopifyWrite } from "@/lib/shopify";

export const TAG_REASSORT = "REASSORT BOUTIQUE";
const K_IDS = "rb:brouillons";
const K_B = (id: string) => `rb:brouillon:${id}`;
const K_VALIDES = "rb:valides";

export type Boutique = { id: number; nom: string; adresse: Record<string, string> };
export type Ligne = { variantId: number; productId: number; titre: string; taille: string; version?: string; sku: string; image: string | null; quantite: number; pretes: number | null; alerte: string | null };
export type Brouillon = {
  id: string; boutique: { id: number; nom: string }; creePar: string; creeLe: string; majLe: string;
  lignes: Ligne[]; historique: string[];
};
const maintenant = () => new Date().toISOString();
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ── boutiques : liste fixée par Philippe le 25.11.2026 (points de vente Shopify) + « Réassort stand »
// (pas de point de vente : livré à l'adresse de l'atelier, Z.I. des Ducats 40b).
const LISTE: { id: number; nom: string; lieu: number }[] = [
  { id: 467716, nom: "Orbe", lieu: 467716 },
  { id: 4514565, nom: "Carouge", lieu: 4514565 },
  { id: 4686021, nom: "Martigny", lieu: 4686021 },
  { id: 14059831389, nom: "Fribourg", lieu: 14059831389 },
  { id: 229015570, nom: "Zürich", lieu: 229015570 },
  { id: 37359681629, nom: "Zermatt", lieu: 37359681629 },
  { id: 1, nom: "Réassort stand", lieu: 35252242 },
];

export async function boutiques(): Promise<Boutique[]> {
  const j = await shopifyGet("/locations.json");
  const locs = new Map(((j.locations ?? []) as Record<string, unknown>[]).map((l) => [Number(l.id), l]));
  return LISTE.map((b) => {
    const l = locs.get(b.lieu) ?? {};
    return {
      id: b.id, nom: b.nom,
      adresse: {
        first_name: "Mood", last_name: b.nom, company: "Mood Collection",
        address1: String(l.address1 ?? ""), address2: String(l.address2 ?? ""),
        zip: String(l.zip ?? ""), city: String(l.city ?? ""), country_code: String(l.country_code ?? "CH"),
        phone: String(l.phone ?? ""),
      },
    };
  });
}

// ── brouillons ─────────────────────────────────────────────────────────────────────────
export async function brouillons(boutiqueId?: number): Promise<Brouillon[]> {
  const ids = (await kv.smembers(K_IDS)) as string[];
  if (!ids.length) return [];
  const tous = (await kv.mget<(Brouillon | null)[]>(...ids.map(K_B))).filter(Boolean) as Brouillon[];
  // brouillons vides de plus de 2 jours : on fait le ménage
  const vieux = tous.filter((b) => !b.lignes.length && Date.now() - Date.parse(b.majLe) > 2 * 86400000);
  for (const b of vieux) { await kv.del(K_B(b.id)); await kv.srem(K_IDS, b.id); }
  return tous.filter((b) => !vieux.includes(b) && (boutiqueId == null || b.boutique.id === boutiqueId))
    .sort((a, b) => b.majLe.localeCompare(a.majLe));
}

export async function lire(id: string): Promise<Brouillon> {
  const b = await kv.get<Brouillon>(K_B(id));
  if (!b) throw new Error("Brouillon introuvable (déjà validé ou supprimé ?)");
  return b;
}

export async function creer(boutique: { id: number; nom: string }, par: string): Promise<Brouillon> {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const b: Brouillon = { id, boutique, creePar: par, creeLe: maintenant(), majLe: maintenant(), lignes: [], historique: [] };
  await kv.set(K_B(id), b);
  await kv.sadd(K_IDS, id);
  return b;
}

export async function enregistrerLignes(id: string, lignes: Ligne[], phrase?: string): Promise<Brouillon> {
  const b = await lire(id);
  const propres = lignes.filter((l) => l.quantite > 0).map((l) => ({ ...l, quantite: Math.min(999, Math.round(l.quantite)) }));
  // même article deux fois → on additionne
  const parVariante = new Map<number, Ligne>();
  for (const l of propres) {
    const deja = parVariante.get(l.variantId);
    parVariante.set(l.variantId, deja ? { ...deja, quantite: deja.quantite + l.quantite } : l);
  }
  const nb: Brouillon = { ...b, lignes: [...parVariante.values()], majLe: maintenant(),
    historique: phrase ? [...b.historique, phrase].slice(-50) : b.historique };
  await kv.set(K_B(id), nb);
  return nb;
}

export async function supprimer(id: string): Promise<void> {
  await kv.del(K_B(id));
  await kv.srem(K_IDS, id);
}

// ── compréhension de la phrase ─────────────────────────────────────────────────────────
async function comprendre(phrase: string): Promise<{ demandes: Demande[]; question: string | null }> {
  const prompt = `Tu aides une boutique de bijoux (bagues mood à anneaux interchangeables) à commander du stock à l'atelier.
Vocabulaire : « base » (XS, S/Small, L/Large), anneaux « mini », « medium », « deux tiers » (2/3), « addon » ; collections et couleurs (Aura, Willow, nacre, émail…). Tailles de bague : nombres entre 44 et 74.

Phrase de la vendeuse :
"""${phrase}"""

Découpe la phrase en demandes (un article par demande). Pour chacune :
- "texte" : le bout de phrase concerné
- "recherche" : les mots pour retrouver l'article dans le catalogue (type d'article + nom + couleur/matière si dits), SANS les tailles ni les quantités, ex. "medium aura", "base large titane", "mini nacre blanche"
- "tailles" : la liste des tailles si elles sont citées une par une (ex. [52,54,58]), sinon null
- "taille_min" / "taille_max" : si elle dit « entre 54 et 62 » ou « de 54 à 62 », sinon null
- "quantite_par_taille" : si elle dit « 2 par taille », « 2 de chaque », sinon null
- "quantite_totale" : le nombre total demandé si dit (ex. « 10 medium »), sinon null
Si la phrase est incompréhensible, laisse "demandes" vide et pose une "question" courte en français (tutoiement). Sinon "question": null.

Réponds en JSON : {"demandes":[{"texte":"","recherche":"","tailles":null,"taille_min":null,"taille_max":null,"quantite_par_taille":null,"quantite_totale":null}],"question":null}`;
  const r = await callClaudeJson<{ demandes: Demande[]; question: string | null }>({ prompt, model: "claude-haiku-4-5-20251001", temperature: 0, maxTokens: 1500 });
  if (!r) throw new Error("Je n'ai pas réussi à lire la phrase, réessaie.");
  return { demandes: Array.isArray(r.demandes) ? r.demandes : [], question: r.question ?? null };
}

// ── recherche dans le catalogue ────────────────────────────────────────────────────────
type GqlProduit = {
  id: string; title: string; featuredImage: { url: string } | null; alerte: { value: string } | null;
  options: { name: string; values: string[] }[];
  variants: { nodes: { id: string; sku: string | null; selectedOptions: { name: string; value: string }[]; pretes: { value: string } | null }[] };
};

// mots qui disent le TYPE d'article (pèsent moins que le nom : « aura », « authentique »…)
const MOTS_TYPE = new Set(["medium", "mini", "minis", "base", "bases", "anneau", "anneaux", "addon", "addons", "deuxtiers",
  "large", "small", "xs", "acier", "argent", "titane", "bague", "bagues", "en", "de", "la", "le", "les", "des", "et",
  // finitions et formes : décrivent l'article standard, ne sont pas un nom (la base acier simple ne dit pas toujours « polie »)
  "arrondi", "arrondie", "carre", "carree", "poli", "polie", "mat", "mate", "brosse", "brossee", "sable", "sablee", "martele", "plat", "plate", "satine"]);
const TAILLES_ANNEAU = new Set(["mini", "minis", "medium", "deuxtiers", "addon", "base", "bases", "xs", "large", "small"]);
// une seule largeur / un seul type d'anneau à la fois : « XS » ne doit pas remonter les bases small ou large
const EXCLUSIFS = [["xs", "small", "large"], ["mini", "medium", "deuxtiers"]];
// familles d'articles qu'on écarte si la vendeuse ne les a pas nommées
const FAMILLES = ["pack", "coffret", "clip", "drop", "boucle", "oreille", "box", "lot", "calendrier", "garde"];
// mots de titre « décoratifs » qui ne pénalisent pas un article
const NEUTRES = new Set(["pour", "bague", "mood", "interchangeable", "avec", "acier", "inoxydable", "316l", "argent", "925", "serti", "sertie",
  "zircons", "anneau", "anneaux", "addon", "base", "bijou", "central", "9mm", "11mm", "13mm", "en"]);

// même écriture des deux côtés : « Extra Small » = « XS », « deux tiers » = « 2/3 », sans accents ni majuscules
const normaliser = (t: string) => sansAccent(t)
  .replace(/extra[\s-]*small|x[\s-]small|xsmall/g, " xs ")
  .replace(/deux[\s-]*tiers|2\s*\/\s*3/g, " deuxtiers ");
const mots = (t: string) => normaliser(t).split(/[^a-z0-9]+/).filter((m) => m.length >= 2);
// racine : « polie » = « poli » = « polies », « arrondie » = « arrondi »
const racine = (m: string) => (m.length > 4 ? m.replace(/(es|e|s)$/, "") : m);
const pareil = (a: string, b: string) => { const ra = racine(a), rb = racine(b); return ra === rb || (ra.length >= 4 && rb.length >= 4 && (ra.startsWith(rb) || rb.startsWith(ra))); };

async function chercher(recherche: string): Promise<Candidat[]> {
  const motsR = mots(recherche);
  const noms = motsR.filter((m) => !MOTS_TYPE.has(m) && m.length >= 3);
  // 1) large filet sur les titres (sans les détails, c'est léger) : la phrase entière + les mots du nom
  const qListe = `query($q:String!){ products(first:60, query:$q, sortKey:RELEVANCE){ nodes{ id title } } }`;
  const liste = async (texte: string) =>
    (await shopifyGraphql<{ products: { nodes: { id: string; title: string }[] } }>(qListe, { q: `${texte} status:active` })).products.nodes;
  const phrase = motsR.map((m) => (m === "xs" ? "extra small" : m === "deuxtiers" ? "deux tiers" : m)).join(" ");
  const essais = [...new Set([recherche, phrase])];
  if (noms.length) essais.push(noms.map((n) => `title:${racine(n)}*`).join(" AND "));
  if (noms.length > 1) essais.push(noms.map((n) => `title:${racine(n)}*`).join(" OR "));
  const vus = new Map<string, string>();
  for (const e of essais) for (const p of await liste(e).catch(() => [])) if (!vus.has(p.id)) vus.set(p.id, p.title);
  // 2) note maison : le nom compte triple, le type double ; mauvaise largeur, packs non demandés et mots en trop font reculer
  const note = (titre: string) => {
    const tm = mots(titre.replace(/pack de 2/i, ""));
    let n = 0;
    for (const m of motsR) if (tm.some((x) => pareil(x, m))) n += noms.includes(m) ? 3 : TAILLES_ANNEAU.has(m) ? 2 : 1;
    for (const g of EXCLUSIFS) {
      const dit = g.filter((x) => motsR.includes(x));
      if (dit.length && !dit.some((x) => tm.includes(x)) && g.some((x) => tm.includes(x))) n -= 4;
    }
    for (const f of FAMILLES) if (tm.some((x) => x.startsWith(f)) && !motsR.some((m) => m.startsWith(f))) n -= 3;
    // mots en trop (couleur, nom de modèle…) que la vendeuse n'a pas dits : l'article simple passe devant
    n -= 1.5 * tm.filter((x) => x.length >= 4 && !NEUTRES.has(x) && !motsR.some((m) => pareil(x, m))).length;
    return n;
  };
  const meilleurs = [...vus.entries()].map(([id, titre]) => ({ id, titre, n: note(titre) }))
    .sort((a, b) => b.n - a.n || a.titre.length - b.titre.length).slice(0, 12);
  if (!meilleurs.length) return [];
  // 3) détails (tailles, versions, délais) seulement pour les 12 meilleurs
  const qDetails = `query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id title featuredImage{url} alerte: metafield(namespace:"mood", key:"alerte_livraison"){ value }
    options{name values} variants(first:100){ nodes{ id sku selectedOptions{name value} pretes: metafield(namespace:"mood", key:"pieces_pretes"){ value } } } } } }`;
  const det = (await shopifyGraphql<{ nodes: (GqlProduit | null)[] }>(qDetails, { ids: meilleurs.map((x) => x.id) })).nodes;
  const parId = new Map(det.filter(Boolean).map((p) => [p!.id, p!]));
  const produits = meilleurs.map((x) => parId.get(x.id)).filter(Boolean) as GqlProduit[];
  const candidats = produits.map((p) => {
    const optTaille = p.options.find((o) => /taille|size|gr(o|ö)sse/i.test(o.name))
      ?? p.options.find((o) => o.values.length > 1 && o.values.every((v) => tailleDe(v) != null));
    const tailles: TailleDispo[] = [];
    let sansTaille = true;
    if (optTaille) {
      sansTaille = false;
      for (const v of p.variants.nodes) {
        const val = v.selectedOptions.find((o) => o.name === optTaille.name)?.value ?? "";
        // les autres choix de la variante (finition, couleur…) : une même taille peut exister en plusieurs versions
        const autres = v.selectedOptions.filter((o) => o.name !== optTaille.name).map((o) => `${o.name} : ${o.value}`).join(" · ");
        tailles.push({ taille: val, autres, variantId: Number(v.id.split("/").pop()), sku: v.sku ?? "", pretes: v.pretes ? Number(v.pretes.value) : null });
      }
      // « taille inconnue » et autres valeurs sans chiffre : pas commandables en réassort
      const chiffrees = tailles.filter((t) => tailleDe(t.taille) != null);
      if (chiffrees.length) tailles.splice(0, tailles.length, ...chiffrees);
      tailles.sort((a, b) => (tailleDe(a.taille) ?? 0) - (tailleDe(b.taille) ?? 0) || a.taille.localeCompare(b.taille));
    } else {
      const v = p.variants.nodes[0];
      if (v) tailles.push({ taille: "—", autres: "", variantId: Number(v.id.split("/").pop()), sku: v.sku ?? "", pretes: v.pretes ? Number(v.pretes.value) : null });
    }
    return { c: { productId: Number(p.id.split("/").pop()), titre: p.title, image: p.featuredImage?.url ?? null, tailles, sansTaille,
      versions: [...new Set(tailles.map((t) => t.autres))], alerte: p.alerte?.value?.trim() || null } };
  }).filter((x) => x.c.tailles.length);
  return candidats.map((x) => x.c);
}

export async function interpreter(phrase: string): Promise<{ propositions: Proposition[]; question: string | null }> {
  const { demandes, question } = await comprendre(phrase);
  const propositions = await Promise.all(demandes.slice(0, 15).map(async (d) => {
    const cands = await chercher(d.recherche);
    // on ne choisit jamais à sa place (règle Philippe) : sauf s'il n'y a qu'un seul article possible,
    // la liste est proposée, le plus probable en premier
    const choisi = cands.length === 1 ? 0 : null;
    const version = choisi != null ? choisirVersion(cands[choisi], `${d.texte} ${d.recherche}`) : null;
    const rep = choisi != null && version != null ? repartir(cands[choisi], d, version) : { quantites: {}, remarque: null };
    let remarque = rep.remarque;
    if (choisi != null && version == null) remarque = "Cet article existe en plusieurs versions : choisis laquelle.";
    if (!cands.length) remarque = `Rien trouvé pour « ${d.recherche} ». Reformule (nom exact de l'article).`;
    else if (choisi == null) remarque = cands.length > 1 ? "Choisis l'article dans la liste (le plus probable est en premier)." : remarque;
    return {
      texte: d.texte, recherche: d.recherche, demande: d,
      candidats: cands,
      choisi, version, quantites: rep.quantites, remarque,
    };
  }));
  return { propositions, question };
}

// ── validation : brouillon Shopify à 100 % puis vraie commande ────────────────────────
export async function valider(id: string, par: string): Promise<{ commande: string; orderId: number; pieces: number }> {
  const b = await lire(id);
  const lignes = b.lignes.filter((l) => l.quantite > 0);
  if (!lignes.length) throw new Error("La commande est vide.");
  const bout = (await boutiques()).find((x) => x.id === b.boutique.id);
  if (!bout) throw new Error(`Boutique ${b.boutique.nom} introuvable dans Shopify.`);
  const tagBoutique = `BOUTIQUE-${b.boutique.nom.replace(/,/g, " ").trim()}`;
  const pieces = lignes.reduce((s, l) => s + l.quantite, 0);
  const d = await shopifyWrite("POST", "/draft_orders.json", {
    draft_order: {
      line_items: lignes.map((l) => ({ variant_id: l.variantId, quantity: l.quantite })),
      applied_discount: { value_type: "percentage", value: "100.0", title: "Réassort boutique", description: "Réassort boutique" },
      shipping_address: bout.adresse, billing_address: bout.adresse,
      tags: `${TAG_REASSORT}, ${tagBoutique}`,
      note: `Réassort boutique ${b.boutique.nom} — demandé par ${par} (${pieces} pièce${pieces > 1 ? "s" : ""})`,
      note_attributes: [{ name: "Réassort boutique", value: b.boutique.nom }, { name: "Demandé par", value: par }],
      use_customer_default_address: false,
    },
  });
  const draft = (d.draft_order ?? {}) as Record<string, unknown>;
  if (!draft.id) throw new Error("Shopify n'a pas créé le brouillon de commande.");
  const fin = await shopifyWrite("PUT", `/draft_orders/${draft.id}/complete.json?payment_pending=false`, {});
  const orderId = Number(((fin.draft_order ?? {}) as Record<string, unknown>).order_id);
  if (!orderId) throw new Error(`Brouillon ${draft.name} créé mais pas transformé en commande — à finir dans Shopify.`);
  await addOrderTags(orderId, [TAG_REASSORT, tagBoutique]).catch(() => {});
  const o = await shopifyGet(`/orders/${orderId}.json?fields=id,name`);
  const commande = String(((o.order ?? {}) as Record<string, unknown>).name ?? orderId);
  await kv.lpush(K_VALIDES, { commande, orderId, boutique: b.boutique.nom, par, pieces, le: maintenant() });
  await kv.ltrim(K_VALIDES, 0, 99);
  await supprimer(id);
  return { commande, orderId, pieces };
}

export async function valides(boutique?: string): Promise<{ commande: string; orderId: number; boutique: string; par: string; pieces: number; le: string }[]> {
  const l = (await kv.lrange(K_VALIDES, 0, 99)) as { commande: string; orderId: number; boutique: string; par: string; pieces: number; le: string }[];
  return boutique ? l.filter((x) => x.boutique === boutique) : l;
}
