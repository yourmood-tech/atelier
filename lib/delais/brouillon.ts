// Assistant des délais — rédige le brouillon de réponse à partir des SEULS faits Shopify.
// Ton calqué sur les réponses du support (vouvoiement par e-mail, « Merci pour votre commande
// et patience », « Excellente journée. Cordialement, Philippe »). Aucune date inventée.
import { BLANC_DATE, type Faits } from "./faits";
import { BRAND_INTRO } from "@/lib/email";
import { notesPourRedaction } from "./notes";

const MODELE = "claude-sonnet-5-5";

const NOMS_LANGUE: Record<string, string> = { fr: "French", de: "German", en: "English", it: "Italian", es: "Spanish", nl: "Dutch" };

function faitsEnClair(f: Faits): string {
  const L: string[] = [];
  L.push(`Order: ${f.commande ?? "not found"} placed on ${f.passeeLe ?? "?"}. Main status code: ${f.statut}.`);
  if (f.articlesEnAttente.length) L.push(`Items still to ship (exact names): ${f.articlesEnAttente.join(" | ")}`);
  f.envois.forEach((e) => L.push(`Shipped on ${e.date}${e.transporteur ? ` with ${e.transporteur}` : ""}${e.numero ? `, tracking number ${e.numero}` : ""}${e.lien ? `, tracking link ${e.lien}` : ""} — items: ${e.articles.join(" | ")}`));
  if (f.iceleaArrivee) L.push(`A component the order was waiting for arrived at our workshop on ${f.iceleaArrivee.date}${f.iceleaArrivee.complet ? " (all awaited components are now there)" : " (some components are still awaited)"}. The piece is now being finished in the workshop.`);
  if (f.iceleaEnRoute) L.push(f.iceleaEnRoute.depassee
    ? `The missing component${f.iceleaEnRoute.complet ? "s have" : " has"} already been shipped by our partner workshop and should reach our workshop in the coming days (the planned date has just passed): do NOT give a date; say it is on its way and that the piece will be finished and shipped as soon as it arrives.${f.iceleaEnRoute.complet ? "" : " Some other components of this order are still awaited."} Never name the supplier.`
    : `The missing component${f.iceleaEnRoute.complet ? "s have" : " has"} already been shipped by our partner workshop and ${f.iceleaEnRoute.complet ? "are" : "is"} expected at our workshop around ${f.iceleaEnRoute.date} (estimate). After that, finishing and shipping usually take a few days.${f.iceleaEnRoute.complet ? "" : " Some other components of this order are still awaited, so do not promise the whole order for that date."} Never name the supplier.`);
  if (f.iceleaPO && !f.iceleaLivraison && !f.iceleaEnRoute) L.push(`The missing component has already been ordered from our partner workshop${f.iceleaPO.commandeLe ? ` (order placed on ${f.iceleaPO.commandeLe})` : ""} and has not arrived at our workshop yet. No reliable arrival date is known: do NOT give any date; say the component is ordered and on its way, that the piece will be finished and shipped as soon as it arrives, and that we will come back with a precise date. Never name the supplier.`);
  if (f.iceleaLivraison && !f.iceleaEnRoute) L.push(`A component is ordered from our partner workshop, expected delivery to our workshop around ${f.iceleaLivraison} (estimate). After that, finishing and shipping usually take a few days.`);
  if (f.etape) {
    const dl = f.etape.delaiMin != null ? ` Typical duration of this step: ${f.etape.delaiMin}${f.etape.delaiMax && f.etape.delaiMax !== f.etape.delaiMin ? `–${f.etape.delaiMax}` : ""} ${f.etape.unite ?? "days"}.` : "";
    L.push(`Workshop step: ${f.etape.entree ? "entered" : "finished"} the step "${f.etape.nom}" on ${f.etape.date}.${dl}`);
  }
  if (f.estimation && !f.estimation.depassee && !f.boites.length) L.push(`Based on the content of the order, it needs components from a partner workshop whose usual lead time is ${f.estimation.delaiMin}–${f.estimation.delaiMax} days after the order: estimated delivery window between ${f.estimation.du} and ${f.estimation.au} (estimate, never a promise — phrase it like "entre fin octobre et mi-novembre"). Never name the supplier.`);
  if (f.estimation?.depassee) L.push(`The usual lead time for this order is already exceeded: do NOT give any date; say the piece is in its final production steps and that we will come back with a precise date very soon.`);
  if (f.boites.length) L.push(`IMPORTANT — the order contains a mood storage box that has not arrived yet: ${f.boites.join(" | ")}. Its delivery date is NOT known. Write one sentence saying the order will be shipped complete together with this box, and put the exact placeholder ${BLANC_DATE} where the approximate delivery date goes (e.g. "… prévue aux alentours du ${BLANC_DATE}"). Do NOT give any other date or estimate in the e-mail.`);
  if (f.rupture) L.push(`A component was marked as temporarily unavailable on ${f.rupture} (do not say "out of stock").`);
  return L.join("\n");
}

export const TON_WHATSAPP = `- This is a WhatsApp message, not an e-mail: informal "tu" (French) / "du" (German) / first name in English, 2 to 5 short lines, warm and direct, like our shop team writes on WhatsApp.
- Start with "Coucou {first name} 🌸" or "Hello {first name} 🌸" (translated naturally), no "Madame", no "Cordialement".
- One or two emojis maximum, ONLY from: 🌸 🫶🏼 💎 ✨ 🤍 💙. Tracking numbers or links on their own line.
- End with a short warm line and "Philippe" (no "Cordialement", no "Excellente journée").`;

export async function redigerBrouillon(p: { faits: Faits; autres?: Faits[]; messageClient: string; prenom: string; canal?: "email" | "whatsapp" }): Promise<string> {
  const f = p.faits;
  const autres = p.autres ?? [];
  // plusieurs commandes citées : les faits de chacune, séparés, et une consigne pour répondre sur toutes
  const faitsTous = autres.length
    ? [f, ...autres].map((x) => `=== ${x.commande ?? "?"} ===\n${faitsEnClair(x)}\n${notesPourRedaction(x.notes ?? [])}`).join("\n\n")
      + `\n\nThe customer asks about ${autres.length + 1} orders: give the status of EACH order (${[f, ...autres].map((x) => x.commande).join(", ")}), one short paragraph per order, in this order, each starting with its order number. The status rules below apply to each order separately.`
    : `${faitsEnClair(f)}\n${notesPourRedaction(f.notes ?? [])}`;
  const langue = NOMS_LANGUE[f.langue] ?? "the same language as the customer's message";
  const prompt = `${BRAND_INTRO}

You draft an e-mail reply to a customer asking about the delivery / delay of an order. A human (Philippe) will review it before sending.

FACTS FROM OUR SHOP SYSTEM (the ONLY things you may state):
${faitsTous}

Customer message:
${JSON.stringify(p.messageClient.slice(0, 2500))}

How to write:
- Language: ${langue}.${p.canal === "whatsapp" ? "\n" + TON_WHATSAPP + "\n- The status rules below still apply, but ignore the e-mail structure (greeting/closing lines)." : ' Formal address ("vous" / "Sie" / "you").'}
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
  // tout le texte de la réponse (certains modèles placent d'abord un autre type de bloc)
  const texte = (r: { content: { type: string; text?: string }[] }) =>
    r.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
  for (const modele of [MODELE, "claude-haiku-4-5-20251001"]) {
    try {
      // la réflexion du modèle compte dans la longueur permise : une limite trop courte coupait le brouillon en pleine phrase
      const r = await client.messages.create({ model: modele, max_tokens: 4000, messages: [{ role: "user", content: prompt }] });
      const t = texte(r as unknown as { content: { type: string; text?: string }[] });
      const arret = (r as { stop_reason?: string }).stop_reason;
      if (t && arret !== "max_tokens") return t;
      console.error(`[délais] brouillon ${t ? "coupé" : "vide"} (${modele}), arrêt : ${arret}`);
    } catch (e) { console.error(`[délais] rédaction ${modele} :`, e); }
  }
  return brouillonDeSecours(f, p.prenom, autres);
}

// Dernier recours si la rédaction échoue : un texte simple tiré des faits (Philippe le complète).
function brouillonDeSecours(f0: Faits, prenom: string, autres: Faits[] = []): string {
  const de = f0.langue === "de", en = f0.langue === "en";
  const salut = de ? `Guten Tag${prenom ? " " + prenom : ""},` : en ? `Hello${prenom ? " " + prenom : ""},` : `Bonjour${prenom ? " " + prenom : ""},`;
  const statuts = [f0, ...autres].map((f) => statutDeSecours(f, de, en)).join("\n\n");
  const fin = de ? "Vielen Dank für Ihre Bestellung und Ihre Geduld.\n\nEinen schönen Tag.\n\nFreundliche Grüsse,\nPhilippe"
    : en ? "Thank you for your order and your patience.\n\nHave a lovely day.\n\nKind regards,\nPhilippe"
    : "Merci pour votre commande et patience.\n\nExcellente journée.\n\nCordialement,\nPhilippe";
  return `${salut}\n\n${statuts}\n\n${fin}`;
}
function statutDeSecours(f: Faits, de: boolean, en: boolean): string {
  const e = f.envois[f.envois.length - 1];
  let statut: string;
  if ((f.statut === "expediee" || f.statut === "expediee_partiel") && e)
    statut = de ? `Ihre Bestellung ${f.commande} wurde am ${e.date} versandt${e.numero ? ` (Sendungsnummer ${e.numero})` : ""}.`
      : en ? `Your order ${f.commande} was shipped on ${e.date}${e.numero ? ` (tracking number ${e.numero})` : ""}.`
      : `Votre commande ${f.commande} est partie le ${e.date}${e.numero ? ` (numéro de suivi ${e.numero})` : ""}.`;
  else if (f.boites.length)
    statut = de ? `Ihre Bestellung ${f.commande} wird vollständig mit der Aufbewahrungsbox versandt, die Lieferung ist um den ${BLANC_DATE} vorgesehen.`
      : en ? `Your order ${f.commande} will be shipped complete together with the storage box, delivery expected around ${BLANC_DATE}.`
      : `Votre commande ${f.commande} partira complète avec la boîte de rangement, la livraison est prévue aux alentours du ${BLANC_DATE}.`;
  else if (f.statut === "attente_icelea")
    statut = de ? `Für Ihre Bestellung ${f.commande} ist ein Bauteil bereits bestellt${f.iceleaLivraison ? `, es wird um den ${f.iceleaLivraison} in unserem Atelier erwartet (Schätzung)` : ""}. Sobald es eintrifft, wird Ihr Schmuckstück fertiggestellt und versandt.`
      : en ? `A component for your order ${f.commande} has already been ordered${f.iceleaLivraison ? ` and is expected at our workshop around ${f.iceleaLivraison} (estimate)` : ""}. As soon as it arrives, your piece will be finished and shipped.`
      : `Une pièce de votre commande ${f.commande} est déjà commandée${f.iceleaLivraison ? `, elle est attendue à notre atelier aux alentours du ${f.iceleaLivraison} (estimation)` : ""}. Dès son arrivée, votre bijou sera terminé et expédié.`;
  else if (f.estimation && !f.estimation.depassee)
    statut = de ? `Ihre Bestellung ${f.commande} ist in Produktion, die Lieferung ist zwischen dem ${f.estimation.du} und dem ${f.estimation.au} vorgesehen (Schätzung).`
      : en ? `Your order ${f.commande} is in production; delivery is expected between ${f.estimation.du} and ${f.estimation.au} (estimate).`
      : `Votre commande ${f.commande} est en cours de production, la livraison est prévue entre le ${f.estimation.du} et le ${f.estimation.au} (estimation).`;
  else statut = de ? `Ihre Bestellung ${f.commande ?? ""} ist in unserem Atelier in Produktion. Wir melden uns sehr bald mit einem genauen Datum.`
      : en ? `Your order ${f.commande ?? ""} is in production in our workshop. We will come back to you very soon with a precise date.`
      : `Votre commande ${f.commande ?? ""} est en cours de production dans notre atelier. Nous revenons vers vous très vite avec une date précise.`;
  return statut;
}
