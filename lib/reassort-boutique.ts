// Réassort boutique (demande de Philippe, 25.11.2026) : c'est toujours la boutique qui commande son stock.
// Elle écrit ou dicte ce qu'elle veut (« 10 medium aura, 2 par taille entre 54 et 62 »), l'outil retrouve les
// vrais articles du site, elle ajuste, peut laisser le brouillon et revenir. À la validation : brouillon de
// commande Shopify à 100 % de rabais (0 CHF) → commande réelle étiquetée « REASSORT BOUTIQUE », imprimée à l'atelier.
import { kv } from "@vercel/kv";
import { callClaudeJson } from "@/lib/claude-ai";
import { repartir, tailleDe, type Candidat, type Demande, type Proposition, type TailleDispo } from "@/lib/reassort-boutique-commun";
import { addOrderTags, shopifyGet, shopifyGraphql, shopifyWrite } from "@/lib/shopify";

export const TAG_REASSORT = "REASSORT BOUTIQUE";
const K_IDS = "rb:brouillons";
const K_B = (id: string) => `rb:brouillon:${id}`;
const K_VALIDES = "rb:valides";

export type Boutique = { id: number; nom: string; adresse: Record<string, string> };
export type Ligne = { variantId: number; productId: number; titre: string; taille: string; sku: string; image: string | null; quantite: number; pretes: number | null; alerte: string | null };
export type Brouillon = {
  id: string; boutique: { id: number; nom: string }; creePar: string; creeLe: string; majLe: string;
  lignes: Ligne[]; historique: string[];
};
const maintenant = () => new Date().toISOString();
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ── boutiques = points de vente Shopify actifs (avec leur adresse pour l'envoi) ─────────
export async function boutiques(): Promise<Boutique[]> {
  const j = await shopifyGet("/locations.json");
  const locs = (j.locations ?? []) as Record<string, unknown>[];
  return locs.filter((l) => l.active).map((l) => ({
    id: Number(l.id), nom: String(l.name),
    adresse: {
      first_name: "Mood", last_name: String(l.name), company: "Mood Collection",
      address1: String(l.address1 ?? ""), address2: String(l.address2 ?? ""),
      zip: String(l.zip ?? ""), city: String(l.city ?? ""), country_code: String(l.country_code ?? "CH"),
      phone: String(l.phone ?? ""),
    },
  })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
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

async function chercher(recherche: string): Promise<Candidat[]> {
  const q = `query($q:String!){ products(first:15, query:$q, sortKey:RELEVANCE){ nodes{ id title featuredImage{url} alerte: metafield(namespace:"mood", key:"alerte_livraison"){ value }
    options{name values} variants(first:100){ nodes{ id sku selectedOptions{name value} pretes: metafield(namespace:"mood", key:"pieces_pretes"){ value } } } } } }`;
  const essai = async (texte: string) =>
    (await shopifyGraphql<{ products: { nodes: GqlProduit[] } }>(q, { q: `${texte} status:active` })).products.nodes;
  let produits = await essai(recherche);
  if (!produits.length) {
    // repli : les mots les plus longs seulement
    const mots = recherche.split(/\s+/).filter((m) => m.length >= 4);
    if (mots.length && mots.join(" ") !== recherche) produits = await essai(mots.join(" "));
  }
  const mots = sansAccent(recherche).split(/\s+/).filter((m) => m.length >= 2);
  const candidats = produits.map((p) => {
    const optTaille = p.options.find((o) => /taille|size|gr(o|ö)sse/i.test(o.name))
      ?? p.options.find((o) => o.values.length > 1 && o.values.every((v) => tailleDe(v) != null));
    const tailles: TailleDispo[] = [];
    let sansTaille = true;
    if (optTaille) {
      sansTaille = false;
      for (const v of p.variants.nodes) {
        const val = v.selectedOptions.find((o) => o.name === optTaille.name)?.value ?? "";
        tailles.push({ taille: val, variantId: Number(v.id.split("/").pop()), sku: v.sku ?? "", pretes: v.pretes ? Number(v.pretes.value) : null });
      }
      // « taille inconnue » et autres valeurs sans chiffre : pas commandables en réassort
      const chiffrees = tailles.filter((t) => tailleDe(t.taille) != null);
      if (chiffrees.length) tailles.splice(0, tailles.length, ...chiffrees);
      tailles.sort((a, b) => (tailleDe(a.taille) ?? 0) - (tailleDe(b.taille) ?? 0) || a.taille.localeCompare(b.taille));
    } else {
      const v = p.variants.nodes[0];
      if (v) tailles.push({ taille: "—", variantId: Number(v.id.split("/").pop()), sku: v.sku ?? "", pretes: v.pretes ? Number(v.pretes.value) : null });
    }
    const titre = sansAccent(p.title);
    const score = mots.filter((m) => titre.includes(m)).length;
    return { c: { productId: Number(p.id.split("/").pop()), titre: p.title, image: p.featuredImage?.url ?? null, tailles, sansTaille, alerte: p.alerte?.value?.trim() || null }, score };
  }).filter((x) => x.c.tailles.length);
  candidats.sort((a, b) => b.score - a.score);
  return candidats.slice(0, 10).map((x) => ({ ...x.c, _score: x.score, _complet: x.score === mots.length } as Candidat & { _score: number; _complet: boolean }));
}

export async function interpreter(phrase: string): Promise<{ propositions: Proposition[]; question: string | null }> {
  const { demandes, question } = await comprendre(phrase);
  const propositions = await Promise.all(demandes.slice(0, 15).map(async (d) => {
    const cands = (await chercher(d.recherche)) as (Candidat & { _score: number; _complet: boolean })[];
    // on ne choisit à sa place que si un seul article correspond à tous les mots
    const complets = cands.filter((c) => c._complet);
    const choisi = complets.length === 1 ? cands.indexOf(complets[0]) : null;
    const rep = choisi != null ? repartir(cands[choisi], d) : { quantites: {}, remarque: null };
    let remarque = rep.remarque;
    if (!cands.length) remarque = `Rien trouvé pour « ${d.recherche} ». Reformule (nom exact de l'article).`;
    else if (choisi == null) remarque = cands.length > 1 ? "Plusieurs articles possibles : choisis le bon." : remarque;
    return {
      texte: d.texte, recherche: d.recherche, demande: d,
      candidats: cands.map(({ _score, _complet, ...c }) => { void _score; void _complet; return c; }),
      choisi, quantites: rep.quantites, remarque,
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
