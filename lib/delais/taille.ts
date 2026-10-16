// Assistant des changements de taille (16.10.2026) — procédure mood donnée par Philippe :
//  • commande pas encore partie → on modifie la taille dans la commande, sans frais (action
//    manuelle dans Shopify, signalée à Philippe sur sa page) ;
//  • commande reçue → échange gratuit : dans les 15 jours après réception sans condition ;
//    après 15 jours, gratuit si la bague n'a pas été portée et revient comme neuve ;
//  • renvoi : Suisse → par la poste (recommandé ou A+), bien protégée, avec nom, n° de commande
//    et taille voulue, à « Mood Collection SA, SAV, Les Ducats 40B, 1350 Orbe » ;
//    hors de Suisse → avec l'étiquette retour déjà affranchie glissée dans chaque colis ;
//  • tailles impaires impossibles (69 → 68 ou 70).
import { shopifyGet } from "@/lib/shopify";
import { getShopifyProfileLocale, BRAND_INTRO } from "@/lib/email";

export type FaitsTaille = {
  commande: string | null; commandeId: number | null; passeeLe: string | null; prenom: string; langue: string;
  partie: boolean; envoyeeLe: string | null; joursDepuisEnvoi: number | null; dansLes15Jours: boolean | null;
  pays: string | null; suisse: boolean;
  articles: { lineItemId: number; titre: string; taille: string | null; aExpedier: boolean }[];
  tailleVoulue: string | null; tailleImpaire: boolean; proposition: string | null;
  aFaire: string | null;                 // action manuelle pour Philippe (affichée sur sa page)
};

export async function detecterTaille(texte: string): Promise<{ oui: boolean; commande: string | null; taille: string | null }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const r = await client.messages.create({
    model: "claude-haiku-4-5-20251001", max_tokens: 120,
    messages: [{ role: "user", content: `Customer message to a jewelry shop (French, German, English, Italian…).
Does the customer want to CHANGE or EXCHANGE THE SIZE of a ring / ring part they ordered (wrong size, too big, too small, doesn't fit, wants another size)? Questions about which size to choose BEFORE buying are NOT a size change.
Extract the order number if any (#12345, commande 12345, Bestellung 12345…) and the wanted size if stated (number like 54, 58, 62).
Return JSON only: {"size_change": boolean, "order_number": string|null, "wanted_size": string|null}

Message: ${JSON.stringify(texte.slice(-5000))}` }],
  });
  const t = r.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("");
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return { oui: false, commande: null, taille: null };
  const j = JSON.parse(m[0]) as { size_change?: boolean; order_number?: string | null; wanted_size?: string | null };
  return { oui: !!j.size_change, commande: j.order_number ?? null, taille: j.wanted_size ?? null };
}

export async function faitsTaille(numero: string | null, email: string, tailleVoulue: string | null): Promise<FaitsTaille | null> {
  let o: Record<string, unknown> | undefined;
  if (numero) o = ((await shopifyGet(`/orders.json?name=%23${numero.replace(/\D/g, "")}&status=any&limit=1`)).orders as Record<string, unknown>[] ?? [])[0];
  if (!o && email) {
    const os = ((await shopifyGet(`/orders.json?email=${encodeURIComponent(email)}&status=any&limit=5`)).orders as Record<string, unknown>[] ?? []).filter((x) => !x.cancelled_at);
    o = os[0];
  }
  if (!o) return null;
  const cust = (o.customer ?? {}) as Record<string, unknown>;
  const langue = (await getShopifyProfileLocale(String(o.email ?? cust.email ?? email))) ?? String(o.customer_locale ?? "fr").split("-")[0].toLowerCase();
  const envois = ((o.fulfillments ?? []) as Record<string, unknown>[]).filter((f) => f.status !== "cancelled");
  const envoyeeLe = envois.length ? String(envois[envois.length - 1].created_at).slice(0, 10) : null;
  const jours = envoyeeLe ? Math.floor((Date.now() - new Date(envoyeeLe).getTime()) / 86400000) : null;
  const adr = (o.shipping_address ?? o.billing_address ?? {}) as Record<string, unknown>;
  const pays = (adr.country_code as string) ?? null;
  const lignes = (o.line_items ?? []) as Record<string, unknown>[];
  const articles = lignes.map((l) => {
    const v = String(l.variant_title ?? "");
    const m = v.match(/\b(\d{2})\b/) ?? String(l.sku ?? "").match(/-(\d{2})$/);
    return { lineItemId: Number(l.id), titre: String(l.title), taille: m ? m[1] : null, aExpedier: Number(l.fulfillable_quantity ?? 0) > 0 };
  });
  const partie = articles.every((a) => !a.aExpedier) && envois.length > 0;
  const n = tailleVoulue ? Number(tailleVoulue.replace(/\D/g, "")) : NaN;
  const impaire = !isNaN(n) && n % 2 === 1;
  // les commandes partent en général 2 à 5 jours avant réception : 15 jours après réception ≈ 18 jours après l'envoi
  const dans15 = jours == null ? null : jours <= 18;
  const f: FaitsTaille = {
    commande: String(o.name), commandeId: Number(o.id), passeeLe: String(o.created_at).slice(0, 10),
    prenom: String(cust.first_name ?? ""), langue, partie, envoyeeLe, joursDepuisEnvoi: jours, dansLes15Jours: dans15,
    pays, suisse: pays === "CH" || pays === "LI", articles, tailleVoulue: tailleVoulue ?? null, tailleImpaire: impaire,
    proposition: impaire ? `${n - 1} ou ${n + 1}` : null, aFaire: null,
  };
  if (!partie) f.aFaire = `Modifier la taille dans la commande ${f.commande}${tailleVoulue ? ` → ${impaire ? f.proposition : tailleVoulue}` : " (taille voulue à confirmer)"}`;
  return f;
}

export async function redigerTaille(f: FaitsTaille, messageClient: string): Promise<string> {
  const NOMS: Record<string, string> = { fr: "French", de: "German", en: "English", it: "Italian", es: "Spanish" };
  const cas = !f.partie
    ? `The order is NOT shipped yet. Say we change the size directly in the order, at no cost${f.tailleVoulue && !f.tailleImpaire ? ` (new size ${f.tailleVoulue})` : ""}. Nothing to send back.`
    : f.dansLes15Jours
      ? `The order was shipped on ${f.envoyeeLe} and the customer is within 15 days after reception: the exchange is free, no condition.`
      : `The order was shipped on ${f.envoyeeLe} (more than 15 days after reception): the exchange is still free, provided the ring has not been worn and comes back as new. Say it kindly.`;
  const retour = !f.partie
    ? ""
    : f.suisse
      ? `How to send it back: by post, registered ("recommandé") or A+, well protected, with her name, the order number ${f.commande} and the wanted size, to:\nMood Collection SA\nSAV\nLes Ducats 40B\n1350 Orbe\nWe start producing the new size right away, without waiting for her parcel; she only needs to send the original piece back.`
      : `How to send it back: with the prepaid return label that is included in her parcel, well protected, with her name, the order number ${f.commande} and the wanted size, to Mood Collection SA, SAV, Les Ducats 40B, 1350 Orbe (Switzerland). We start producing the new size right away, without waiting for her parcel; she only needs to send the original piece back.`;
  const taille = f.tailleImpaire ? `The wanted size ${f.tailleVoulue} does not exist (odd sizes are not produced): ask her to choose between ${f.proposition}.`
    : f.tailleVoulue ? `Wanted size: ${f.tailleVoulue}.` : `The wanted size is not stated: ask her which size she needs, and give the link https://www.yourmood.net/pages/comment-connaitre-ma-taille-de-bague to measure it.`;
  const prompt = `${BRAND_INTRO}

You draft an e-mail reply to a customer who wants to change the size of her order. Philippe reviews it before sending.

Facts: order ${f.commande} placed on ${f.passeeLe}. Items: ${f.articles.map((a) => `${a.titre}${a.taille ? ` (size ${a.taille})` : ""}`).join(" | ")}.
${cas}
${retour}
${taille}

Customer message: ${JSON.stringify(messageClient.slice(0, 2500))}

Write in ${NOMS[f.langue] ?? "the customer's language"}, formal address. Structure: greeting "Bonjour${f.prenom ? " " + f.prenom : ""}," (translated) / we received the request / what we do / how to send back (if any, keep the address lines exactly) / "Merci pour votre commande." / "Excellente journée." / "Cordialement," / "Philippe" (translated, each on its own line). Short, warm, no excessive apologies. Never state anything not in the facts. Plain text only.`;
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  for (const modele of ["claude-sonnet-5-5", "claude-haiku-4-5-20251001"]) {
    try {
      const r = await client.messages.create({ model: modele, max_tokens: 900, messages: [{ role: "user", content: prompt }] });
      const t = r.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("\n").trim();
      if (t) return t;
    } catch (e) { console.error(`[taille] rédaction ${modele} :`, e); }
  }
  return `Bonjour${f.prenom ? " " + f.prenom : ""},\n\nNous avons bien reçu votre demande de changement de taille pour la commande ${f.commande}.\n\n${retour || "Nous modifions la taille directement dans votre commande, sans frais."}\n\nMerci pour votre commande.\n\nExcellente journée.\n\nCordialement,\nPhilippe`;
}
