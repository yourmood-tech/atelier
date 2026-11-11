import { NextResponse } from "next/server";
import { PAGES } from "./savoir";
import { CLASSES } from "./coffrets";

// La mascotte-guide (mood-tools.yourmood.net/guide) : répond aux questions des nouvelles
// clientes UNIQUEMENT avec ce qui est écrit ci-dessous (pages du site + conditions de vente
// relevées le 11.11.2026). Si la réponse n'y est pas → elle passe la main au service client.

export const dynamic = "force-dynamic";

const KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = "claude-sonnet-5-5";
const SHOP = "yourmood.myshopify.com";
const SHOP_TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN || "";
const SITE = "https://www.yourmood.net";

const SAVOIR = `
LE PRINCIPE
- La bague mood est une bague suisse interchangeable, créée en 2004 à Orbe (canton de Vaud). Plus de 75 000 Mood Lovers.
- Une bague mood = une BASE (la bague du dessous, en acier 316L) + un ou plusieurs ANNEAUX qui se clipsent dessus. On change d'anneau selon son humeur, ses vêtements : c'est le clic mood.
- On peut ensuite ajouter d'autres anneaux quand on veut : c'est tout le principe.

LES BASES (acier inoxydable 316L, garantie à vie)
- 3 largeurs : extra small 9 mm (fine et discrète, dès 220.–) ; small 11 mm (la plus choisie, 250.–) ; large 13 mm (affirmée, 250.–). Il existe aussi des bases noires et d'autres finitions : voir ${SITE}/collections/bases-seules
- Plus la base est large, plus on peut y mettre d'anneaux.
- Liens : extra small ${SITE}/products/bague-homme-femme-modulable-9mm-arrondie-polie · small ${SITE}/products/base-small · large ${SITE}/products/base-large-polie
- L'acier 316L contient du nickel. Il est hypoallergénique (pas de réaction sur la peau sauf cas très rares), quasi indestructible, demande peu d'entretien.
- Il n'existe PAS de base en argent : les bases sont en acier (ou en titane pour certaines).
- On peut faire sertir sa base de pierres précieuses, même petit à petit au fil des événements de la vie.

LES ANNEAUX (formats)
- Addon : l'anneau large, il habille une base small ou large à lui tout seul.
- Deux tiers : il remplit une base extra small tout seul, ou se marie avec un medium (ou 2 minis) sur une base small ou large.
- Medium : l'anneau du milieu, on en met plusieurs pour jouer les couleurs (2 sur une extra small, 3 sur une small ou large).
- Minis : les petits anneaux fins, le petit truc en plus (2 minis = la place d'un medium).
- Combinaisons : extra small = 1 deux tiers, ou 2 mediums, ou 1 medium + 2 minis. Small ou large = 1 addon, ou 1 deux tiers + 1 medium (ou + 2 minis), ou 3 mediums.
- L'addon NE va PAS sur une base extra small.
- Matières : aluminium anodisé (plein de couleurs, addon aluminium 54.–, deux tiers aluminium 45.–, medium aluminium 28.–), argent 925, or, céramique, polymère, pierres et zircons (ex. Aura Authentique, medium serti de zircons, 199.–, n°1 des ventes).
- Aluminium : ${SITE}/collections/aluminium

POUR COMMENCER SIMPLEMENT
- Trois idées de première bague : « La fine » = base extra small 220.– + deux tiers aluminium 45.– = 265.– ; « La colorée » = base small 250.– + addon aluminium 54.– = 304.– ; « La brillante » = base extra small 220.– + Aura Authentique 199.– + medium aluminium 28.– = 447.–
- Les starter packs (base + anneaux déjà assortis) : ${SITE}/collections/starter-pack-in-the-mood-for
- Le quizz « Quel starter pack es-tu ? » : https://mood-tools.yourmood.net/quiz
- Le guide « Ma première bague » : https://mood-tools.yourmood.net/premiere-bague

LA TAILLE
- Pas sûre de sa taille ? On peut commander le baguier gratuit (frais de port à charge) : ${SITE}/products/multisizer-baguier-gratuit — on le glisse sur le doigt et on lit sa taille.
- Ou : mesurer le diamètre intérieur d'une bague qu'on a déjà, ou enrouler un fil autour du doigt et mesurer la longueur en mm (= la taille). Tableau : ${SITE}/pages/tableau-de-conversion-des-tailles-de-bagues
- Si on hésite entre deux tailles : prendre celle du dessus (surtout si les doigts gonflent). La taille varie d'un doigt à l'autre : mesurer le doigt où on la portera.
- Tailles mood : 50 à 72 (taille mood = tour de doigt en mm).
- On peut commander en « taille inconnue » : on reçoit le baguier, on donne sa taille, et la commande part en fabrication à ce moment-là.
- Ou passer dans une boutique : on prend la taille avec toi.

PORTER, ENTRETENIR
- Se porte à n'importe quel doigt, aux deux mains.
- Se porte tout le temps. Dans l'eau : possible, bien sécher la bague et la peau avant de la remettre.
- Désinfectant : enlever la bague, surtout avec un anneau en polymère (il peut se décolorer ou casser). La base en acier n'est pas abîmée.
- Ouvrir la base : appuyer sur les deux parties de la base, chacune dans un sens opposé ; glisser le pouce à l'intérieur aide.
- Nettoyer : eau, savon, petite brosse (comme une brosse à dents).

GARANTIE ET RÉNOVATION
- Base acier : garantie à vie. La rénovation du système de fermeture est gratuite (base trop dure ou trop facile à ouvrir). Polissage d'une base non colorée 15.–, surface colorée 45.–. Une base déformée ou endommagée ne peut pas être rénovée.
- Anneaux polymère : garantie 3 mois (défaut de fabrication). Bois : 1 mois. Sertissage : 2 ans (défaut de fabrication ; casse ou perte de pierre non garantie).

COMMANDE, PAIEMENT, LIVRAISON
- Paiement : carte de crédit, PayPal, TWINT, virement, ou sur facture (après accord de l'organisme de paiement).
- Délais : en général 3 à 5 jours ouvrables pour une commande sans travail de bijouterie ou de sertissage ; 7 jours ouvrables pour les anneaux en argent ou en or (hors sertissage). Beaucoup de pièces sont fabriquées sur commande, certaines demandent plus de temps : les délais sont indicatifs. Besoin urgent : écrire au service client (express possible selon les cas, parfois avec des frais).
- Hors de Suisse : les taxes et droits de douane du pays sont à la charge de la cliente.
- Une modification de commande doit être demandée par écrit dans les 12 heures après la confirmation, avant que la fabrication commence.

ÉCHANGES ET RETOURS (conditions de vente actuelles)
- Pour la PREMIÈRE bague mood (achat pour soi ou cadeau) : un échange de TAILLE est possible une fois, si la bague n'a jamais été portée et revient à l'état neuf, complète.
- En dehors de ça, pas d'échange ni de remboursement pour un changement d'avis. Les pièces personnalisées ou faites sur mesure (gravure, éditions limitées, joaillerie) ne sont ni échangeables ni remboursables.
- Un défaut de fabrication est bien sûr pris en charge.
- Ne jamais renvoyer un colis sans l'accord écrit du service client.

BOUTIQUES : 6 boutiques en Suisse (Orbe, Fribourg, Zermatt, Zurich, Carouge, Martigny) + un pop-up à Lausanne. Adresses, horaires et téléphone : voir les PAGES DES BOUTIQUES plus bas (elles font foi). Un seul numéro pour toutes les boutiques : 024 588 00 57.
- En boutique on peut tout essayer, sentir le clic, et faire prendre sa taille.

SERVICE CLIENT
- E-mail : contact@yourmood.net
- WhatsApp : ${SITE}/pages/contacter-le-support-client-mood-via-whatsapp
- Toutes les questions fréquentes : ${SITE}/pages/foire-aux-questions
`;

const CONSIGNE = `Tu es la mascotte de mood : un petit anneau blanc tout doux qui accueille les nouvelles clientes sur le site et les guide vers leur première bague mood.

TON : chaleureux, simple, clair, tutoiement (sauf si la personne vouvoie). Court : 2 à 5 phrases, ou une petite liste si on demande plusieurs infos (horaires…). Un emoji de temps en temps seulement, parmi 🤍 ✨ 💙 🫶🏼. On dit « on », jamais « nous ». Jamais « N'hésitez pas ». Pas de vente agressive : tu aides, tu rassures, tu donnes UNE prochaine étape claire.

TU CONNAIS TOUT : le SAVOIR, les PAGES DU SITE plus bas (boutiques avec adresses et horaires exacts, questions fréquentes, Mood Care, tailles, bons cadeaux, parrainage, conditions de vente…) et l'outil chercher_produits, qui cherche EN DIRECT dans la boutique en ligne (noms exacts, prix actuels, disponibilité, lien). Pour une idée de cadeau ou une bague complète, utilise chercher_coffrets (il connaît la largeur, pour elle/lui, brillant ou sobre, le budget) et mets en avant les coffrets à prix réduit. Dès qu'on te parle d'un bijou, d'une couleur, d'une matière, d'une collection ou d'un prix → utilise chercher_produits avant de répondre, et donne le nom exact, le prix et le lien. Sois PRÉCIS : une adresse, un horaire, un prix, un délai se donnent exactement comme écrits, jamais arrondis ni résumés de mémoire. Aujourd'hui nous sommes le {DATE} : tiens-en compte (jour de la semaine, boutique fermée pour la saison…).

GUIDER : la personne est souvent nouvelle. Réponds à sa question, puis propose UNE prochaine étape claire. Termine TOUJOURS ta réponse par une dernière ligne qui commence par « BOUTONS: » suivie de 2 ou 3 suites courtes (3 à 6 mots) qu'elle pourrait vouloir cliquer, séparées par « | ». Exemple : BOUTONS: Voir les horaires d'Orbe | Trouver ma taille | Choisir ma base

RÈGLE ABSOLUE : tu réponds UNIQUEMENT avec les informations du SAVOIR ci-dessous. Tu n'inventes JAMAIS un prix, un délai, une matière, un nom de produit, une règle, une promotion ou un code de réduction (n'annonce jamais une offre ou un concours trouvé dans une page : elles peuvent être finies). Si la réponse n'est pas dans le SAVOIR, ou si la question concerne une commande précise (suivi de colis, numéro de commande, réclamation), tu dis gentiment que tu préfères qu'une personne de l'équipe réponde, et tu donnes le service client (contact@yourmood.net ou WhatsApp).

MOTS : « base » = la bague du dessous. Jamais « bijou fantaisie ». Jamais « base argent ». Écris « bague mood » en minuscules.

LIENS : quand c'est utile, termine par UN lien du SAVOIR au format [texte court](adresse). Jamais d'adresse inventée.

LANGUE : réponds dans la langue de la personne (français, allemand, anglais…).

SAVOIR :
${SAVOIR}`;

const OUTILS = [{
  name: "chercher_coffrets",
  description: "Trouve les coffrets (bagues complètes prêtes à offrir : base + anneaux assortis) en vente, avec prix actuel, prix réduit et lien. Filtres facultatifs. Les coffrets à prix réduit sortent en premier.",
  input_schema: { type: "object", properties: {
    pour: { type: "string", enum: ["femme", "homme", "tous"] },
    base: { type: "string", enum: ["xs", "s", "l", "tous"], description: "largeur de base : xs = extra small 9 mm, s = small 11 mm, l = large 13 mm" },
    brille: { type: "string", enum: ["oui", "non", "tous"] },
    budget_min: { type: "number" }, budget_max: { type: "number" },
    mots: { type: "string", description: "mots de style facultatifs (couleur, matière, thème)" },
  } },
}, {
  name: "chercher_produits",
  description: "Cherche en direct dans la boutique en ligne mood (yourmood.net) les bijoux en vente : nom exact, prix, disponibilité, lien. Utilise des mots simples en français (ex. « aura medium », « deux tiers aluminium rose », « base extra small », « bon cadeau », « starter pack »).",
  input_schema: { type: "object", properties: { recherche: { type: "string", description: "les mots à chercher" } }, required: ["recherche"] },
}];

type Prod = { title: string; productType: string; onlineStoreUrl: string | null; totalInventory: number | null; priceRangeV2: { minVariantPrice: { amount: string }; maxVariantPrice: { amount: string } }; description: string; variants: { nodes: { availableForSale: boolean }[] } };
async function chercherProduits(recherche: string) {
  if (!SHOP_TOKEN) return "recherche indisponible";
  const VIDES = new Set(["en", "de", "du", "des", "la", "le", "les", "un", "une", "pour", "avec", "et", "ou", "vous", "avez", "tu", "as", "bague", "bagues", "mood", "anneau", "anneaux", "interchangeable"]);
  const mots = String(recherche || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/)
    .filter((m) => m.length > 1 && !VIDES.has(m)).map((m) => (m.length > 4 && m.endsWith("s") ? m.slice(0, -1) : m)).slice(0, 6);
  if (!mots.length) return "aucun mot";
  const cherche = async (liste: string[]) => {
    const q = "status:active AND " + liste.map((m) => `title:*${m}*`).join(" AND ");
    const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": SHOP_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `query($q:String!){ products(first:40, query:$q, sortKey:UPDATED_AT, reverse:true){ nodes{ title productType onlineStoreUrl totalInventory description(truncateAt:220) priceRangeV2{ minVariantPrice{amount} maxVariantPrice{amount} } variants(first:30){ nodes{ availableForSale } } } } }`, variables: { q } }),
    });
    const j: { data?: { products?: { nodes: Prod[] } } } = await r.json();
    return (j.data?.products?.nodes || []).filter((p) => p.onlineStoreUrl);
  };
  let trouves = await cherche(mots);
  let note = "";
  // rien avec tous les mots → on relâche en gardant les mots les plus longs
  for (let n = mots.length - 1; !trouves.length && n >= 1; n--) {
    const garde = [...mots].sort((a, b) => b.length - a.length).slice(0, n);
    trouves = await cherche(garde);
    if (trouves.length) note = `(rien avec tous les mots ; résultats pour « ${garde.join(" ")} » seulement)\n`;
  }
  const prods = trouves.slice(0, 10);
  if (!prods.length) return `Aucun bijou en vente trouvé pour « ${recherche} ». Essaie d'autres mots, ou dis-le honnêtement.`;
  return note + prods.map((p) => {
    const a = parseFloat(p.priceRangeV2.minVariantPrice.amount), b = parseFloat(p.priceRangeV2.maxVariantPrice.amount);
    const prix = a === b ? `${a}.–` : `de ${a}.– à ${b}.–`;
    const dispo = p.variants.nodes.some((v) => v.availableForSale) ? "disponible" : "épuisé";
    return `• ${p.title} — ${prix} — ${dispo} — ${p.onlineStoreUrl}\n  ${p.description.replace(/\s+/g, " ")}`;
  }).join("\n");
}

type Msg = { role: "user" | "assistant"; content: string };

/* ——— les coffrets : classement fixe + prix / réductions / dispo lus en direct ——— */
type Filtres = { pour?: string; base?: string; brille?: string; budget_min?: number; budget_max?: number; mots?: string };
type Coffret = { titre: string; url: string; image: string; prix: number; avant: number | null; reduit: number; base: string; pour: string; brille: number; style: string };
let CACHE: { t: number; liste: Coffret[] } | null = null;
async function tousCoffrets(): Promise<Coffret[]> {
  if (CACHE && Date.now() - CACHE.t < 10 * 60 * 1000) return CACHE.liste;
  const liste: Coffret[] = [];
  let after: string | null = null;
  for (let page = 0; page < 6; page++) {
    const r: Response = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": SHOP_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `query($a:String){ products(first:100, after:$a, query:"status:active AND product_type:coffret"){ pageInfo{ hasNextPage endCursor } nodes{ title handle onlineStoreUrl featuredImage{ url } variants(first:40){ nodes{ price compareAtPrice availableForSale } } } } }`, variables: { a: after } }),
    });
    const j: { data?: { products?: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: { title: string; handle: string; onlineStoreUrl: string | null; featuredImage: { url: string } | null; variants: { nodes: { price: string; compareAtPrice: string | null; availableForSale: boolean }[] } }[] } } } = await r.json();
    const d = j.data?.products; if (!d) break;
    for (const p of d.nodes) {
      if (!p.onlineStoreUrl || !p.featuredImage) continue;
      const vs = p.variants.nodes.filter((v) => v.availableForSale);
      if (!vs.length) continue;
      const v = vs.reduce((a, b) => (parseFloat(a.price) <= parseFloat(b.price) ? a : b));
      const prix = parseFloat(v.price), ca = v.compareAtPrice ? parseFloat(v.compareAtPrice) : 0;
      const avant = ca > prix ? ca : null;
      const c = CLASSES[p.handle] || ["", "m", /zircon|diamant|serti|strass|aura|paillet/i.test(p.title) ? 1 : 0, ""];
      liste.push({ titre: p.title.replace(/\s*\|\s*bague.*$/i, "").trim(), url: p.onlineStoreUrl, image: p.featuredImage.url + (p.featuredImage.url.includes("?") ? "&" : "?") + "width=400", prix, avant, reduit: avant ? Math.round((1 - prix / avant) * 100) : 0, base: c[0], pour: c[1], brille: c[2], style: c[3] });
    }
    if (!d.pageInfo.hasNextPage) break;
    after = d.pageInfo.endCursor;
  }
  CACHE = { t: Date.now(), liste };
  return liste;
}
async function filtrerCoffrets(f: Filtres) {
  const L = await tousCoffrets();
  const mots = String(f.mots || "").toLowerCase().split(/\s+/).filter((m) => m.length > 2);
  let r = L.filter((c) =>
    (!f.pour || f.pour === "tous" || (f.pour === "femme" ? c.pour !== "h" : c.pour !== "f")) &&
    (!f.base || f.base === "tous" || c.base.includes(f.base === "xs" ? "x" : f.base)) &&
    (!f.brille || f.brille === "tous" || (f.brille === "oui" ? c.brille === 1 : c.brille === 0)) &&
    (f.budget_min == null || c.prix >= f.budget_min) && (f.budget_max == null || c.prix <= f.budget_max) &&
    (!mots.length || mots.some((m) => (c.titre + " " + c.style).toLowerCase().includes(m))));
  r = r.sort((a, b) => b.reduit - a.reduit || a.prix - b.prix);
  return r;
}
async function texteCoffrets(f: Filtres) {
  const r = await filtrerCoffrets(f || {});
  if (!r.length) return "Aucun coffret ne correspond exactement. Propose d'élargir un critère (budget, largeur, brillant).";
  return `${r.length} coffrets trouvés (les réduits d'abord) :\n` + r.slice(0, 10).map((c) => `• ${c.titre} — ${c.prix}.–${c.avant ? ` au lieu de ${c.avant}.– (-${c.reduit} %)` : ""} — ${c.url} — style : ${c.style}`).join("\n");
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  if (!u.get("coffrets")) return NextResponse.json({ error: "?" }, { status: 400 });
  const num = (k: string) => (u.get(k) ? Number(u.get(k)) : undefined);
  try {
    const r = await filtrerCoffrets({ pour: u.get("pour") || undefined, base: u.get("base") || undefined, brille: u.get("brille") || undefined, budget_min: num("min"), budget_max: num("max") });
    return NextResponse.json({ total: r.length, coffrets: r.slice(0, 40).map(({ titre, url, image, prix, avant, reduit }) => ({ titre, url, image, prix, avant, reduit })) });
  } catch { return NextResponse.json({ error: "indisponible" }, { status: 500 }); }
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: "indisponible" }, { status: 503 });
  let body: { messages?: Msg[]; contexte?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "illisible" }, { status: 400 }); }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "question vide" }, { status: 400 });

  const date = new Date().toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });
  const contexte = String((body as { contexte?: string }).contexte || "").slice(0, 300);
  const system = [
    { type: "text", text: CONSIGNE + "\n\nPAGES DU SITE (elles font foi) :\n" + PAGES, cache_control: { type: "ephemeral" } },
    { type: "text", text: "Aujourd'hui : " + date + "." + (contexte ? "\nOù en est la personne dans le guide : " + contexte : "") },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conv: any[] = messages.map((m) => ({ role: m.role, content: m.content }));
  let texte = "";
  for (let tour = 0; tour < 4; tour++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: system.map((x, k) => k === 0 ? { ...x, text: x.text.replace("{DATE}", date) } : x), tools: OUTILS, messages: conv }),
    });
    if (!r.ok) return NextResponse.json({ error: "réponse impossible" }, { status: 502 });
    const j: { stop_reason?: string; content?: { type: string; text?: string; id?: string; name?: string; input?: { recherche?: string } & Filtres }[] } = await r.json();
    const blocs = j.content || [];
    texte = blocs.filter((c) => c.type === "text").map((c) => c.text || "").join("").trim();
    if (j.stop_reason !== "tool_use") break;
    conv.push({ role: "assistant", content: blocs });
    const res = await Promise.all(blocs.filter((c) => c.type === "tool_use").map(async (c) => ({ type: "tool_result", tool_use_id: c.id, content: await (c.name === "chercher_coffrets" ? texteCoffrets(c.input as Filtres) : chercherProduits(c.input?.recherche || "")).catch(() => "recherche impossible") })));
    conv.push({ role: "user", content: res });
  }
  let boutons: string[] = [];
  const m = texte.match(/\n?\s*BOUTONS\s*:\s*(.+)\s*$/i);
  if (m) { boutons = m[1].split("|").map((x) => x.trim()).filter(Boolean).slice(0, 3); texte = texte.slice(0, m.index).trim(); }
  return NextResponse.json({ texte: texte || "Je préfère qu'une personne de l'équipe te réponde : écris-nous à contact@yourmood.net 🤍", boutons });
}
