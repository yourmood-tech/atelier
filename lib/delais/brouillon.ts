// Assistant des délais — rédige le brouillon de réponse à partir des SEULS faits Shopify.
// Ton calqué sur les réponses du support (vouvoiement par e-mail, « Merci pour votre commande
// et patience », « Excellente journée. Cordialement, Philippe »). Aucune date inventée.
import type { Faits } from "./faits";
import { BRAND_INTRO } from "@/lib/email";

const MODELE = "claude-sonnet-5-5";

const NOMS_LANGUE: Record<string, string> = { fr: "French", de: "German", en: "English", it: "Italian", es: "Spanish", nl: "Dutch" };

function faitsEnClair(f: Faits): string {
  const L: string[] = [];
  L.push(`Order: ${f.commande ?? "not found"} placed on ${f.passeeLe ?? "?"}. Main status code: ${f.statut}.`);
  if (f.articlesEnAttente.length) L.push(`Items still to ship (exact names): ${f.articlesEnAttente.join(" | ")}`);
  f.envois.forEach((e) => L.push(`Shipped on ${e.date}${e.transporteur ? ` with ${e.transporteur}` : ""}${e.numero ? `, tracking number ${e.numero}` : ""}${e.lien ? `, tracking link ${e.lien}` : ""} — items: ${e.articles.join(" | ")}`));
  if (f.iceleaArrivee) L.push(`A component the order was waiting for arrived at our workshop on ${f.iceleaArrivee.date}${f.iceleaArrivee.complet ? " (all awaited components are now there)" : " (some components are still awaited)"}. The piece is now being finished in the workshop.`);
  if (f.iceleaLivraison) L.push(`A component is ordered from our partner workshop, expected delivery to our workshop around ${f.iceleaLivraison} (estimate). After that, finishing and shipping usually take a few days.`);
  if (f.etape) {
    const dl = f.etape.delaiMin != null ? ` Typical duration of this step: ${f.etape.delaiMin}${f.etape.delaiMax && f.etape.delaiMax !== f.etape.delaiMin ? `–${f.etape.delaiMax}` : ""} ${f.etape.unite ?? "days"}.` : "";
    L.push(`Workshop step: ${f.etape.entree ? "entered" : "finished"} the step "${f.etape.nom}" on ${f.etape.date}.${dl}`);
  }
  if (f.estimation && !f.estimation.depassee) L.push(`Based on the content of the order, it needs components from a partner workshop whose usual lead time is ${f.estimation.delaiMin}–${f.estimation.delaiMax} days after the order: estimated delivery window between ${f.estimation.du} and ${f.estimation.au} (estimate, never a promise — phrase it like "entre fin octobre et mi-novembre"). Never name the supplier.`);
  if (f.estimation?.depassee) L.push(`The usual lead time for this order is already exceeded: do NOT give any date; say the piece is in its final production steps and that we will come back with a precise date very soon.`);
  if (f.rupture) L.push(`A component was marked as temporarily unavailable on ${f.rupture} (do not say "out of stock").`);
  return L.join("\n");
}

export async function redigerBrouillon(p: { faits: Faits; messageClient: string; prenom: string }): Promise<string> {
  const f = p.faits;
  const langue = NOMS_LANGUE[f.langue] ?? "the same language as the customer's message";
  const prompt = `${BRAND_INTRO}

You draft an e-mail reply to a customer asking about the delivery / delay of an order. A human (Philippe) will review it before sending.

FACTS FROM OUR SHOP SYSTEM (the ONLY things you may state):
${faitsEnClair(f)}

Customer message:
${JSON.stringify(p.messageClient.slice(0, 2500))}

How to write:
- Language: ${langue}. Formal address ("vous" / "Sie" / "you").
- Structure, like our support team does:
  "Bonjour${p.prenom ? " " + p.prenom : ""}," (or the equivalent greeting in the language) /
  one line acknowledging the request /
  the status in 1 to 3 short sentences, ONLY from the facts above /
  "Merci pour votre commande et patience." (translated) /
  "Excellente journée." then "Cordialement," then "Philippe" (translated, each on its own line).
- If shipped: give the shipping date, carrier and the tracking number / link exactly as given.
- If waiting for a component with a date: say the piece is in production and give the date as an estimate ("aux alentours du …"), never as a promise.
- If a workshop step is known: say at which stage the piece is (use the step name naturally) and, if a typical duration is given, an approximate remaining time.
- Never state a date, duration or fact that is not in the facts. If the facts say nothing precise, say the piece is in production at our workshop and that we will come back with a precise date.
- Never say "rupture de stock" / "out of stock". No excessive apologies. No marketing. No hashtags.
- Return the e-mail body only, plain text.`;
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  let r;
  try { r = await client.messages.create({ model: MODELE, max_tokens: 700, messages: [{ role: "user", content: prompt }] }); }
  catch { r = await client.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 700, messages: [{ role: "user", content: prompt }] }); }
  return r.content[0]?.type === "text" ? r.content[0].text.trim() : "";
}
