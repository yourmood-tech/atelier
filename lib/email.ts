import type { BackorderAnalysis, ProductionAnalysis, ProductionDirection } from "./types";

// ── Klaviyo — profile locale lookup ──────────────────────────────────────────
// Shopify REST API often returns a stale locale (e.g. "fr" for a de customer).
// Klaviyo's profile, synced by the native integration, is more reliable.

export async function getKlaviyoProfileLocale(email: string): Promise<string | null> {
  try {
    const apiKey = process.env.KLAVIYO_API_KEY!;
    const url = `https://a.klaviyo.com/api/profiles/?filter=equals(email,${JSON.stringify(email)})&fields[profile]=locale,properties`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2024-10-15",
      },
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { attributes?: Record<string, unknown> }[] };
    const attrs = data?.data?.[0]?.attributes;
    if (!attrs) return null;
    // Try standard locale field
    const locale = attrs.locale as string | null | undefined;
    if (locale) return locale.split("-")[0].toLowerCase();
    // Try custom properties synced from Shopify
    const props = attrs.properties as Record<string, unknown> | null | undefined;
    const propLocale = props?.locale ?? props?.Locale ?? props?.customer_locale;
    if (propLocale) return String(propLocale).split("-")[0].toLowerCase();
    return null;
  } catch {
    return null;
  }
}

// ── Klaviyo — track BackorderNotification event → triggers Flow ───────────────

export async function sendViaKlaviyo(params: {
  email: string;
  firstName: string;
  subject: string;
  body: string;
  orderId: string;
  productTitle: string;
  estimatedDelivery: string | null;
  supplierName: string | null;
  followupSubject?: string | null;
  followupBody?: string | null;
}): Promise<void> {
  const apiKey = process.env.KLAVIYO_API_KEY!;

  const res = await fetch("https://a.klaviyo.com/api/events/", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      "Content-Type": "application/json",
      revision: "2024-10-15",
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: params.email,
                first_name: params.firstName,
              },
            },
          },
          metric: {
            data: {
              type: "metric",
              attributes: { name: "BackorderNotification" },
            },
          },
          properties: {
            email_subject: params.subject,
            email_body: params.body,
            order_id: params.orderId,
            product_title: params.productTitle,
            estimated_delivery: params.estimatedDelivery ?? "À confirmer",
            supplier_name: params.supplierName ?? "",
            needs_followup: !!(params.followupSubject && params.followupBody),
            followup_subject: params.followupSubject ?? "",
            followup_body: params.followupBody ?? "",
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Klaviyo ${res.status}: ${text.slice(0, 200)}`);
  }
}

// ── Claude API — email generation ─────────────────────────────────────────────

const LOCALE_LABELS: Record<string, string> = {
  fr: "French",
  de: "German",
  en: "English",
  it: "Italian",
  es: "Spanish",
  nl: "Dutch",
  pt: "Portuguese",
};

export async function generateBackorderEmail(
  analysis: BackorderAnalysis
): Promise<{ subject: string; body: string }> {
  const { order, product, estimatedDelivery, leadTimeMin, leadTimeMax } = analysis;
  const language = LOCALE_LABELS[order.customer.locale] ?? "French";

  const etaText = estimatedDelivery
    ? `approximate delivery window based on supplier PO: around ${new Date(estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })} — phrase this as an estimate, not a guarantee`
    : (leadTimeMin && leadTimeMax)
    ? `estimated lead time: between ${leadTimeMin} and ${leadTimeMax} days from today`
    : leadTimeMin
    ? `estimated lead time: approximately ${leadTimeMin} days from today`
    : "no confirmed date yet — we will inform you as soon as possible";

  const prompt = `You are writing on behalf of Mood Collection, a Swiss jewelry brand known for precision and intentional production.
Write a clear, professional email informing a customer that one item in their order requires additional production time before it can be delivered.

Tone guidelines:
- Professional and direct — not overly warm, not cold
- Honest and confident, not apologetic or overly compensatory
- One brief mention that pieces are produced in small quantities by design (anti-overproduction), stated as a fact, not as a marketing pitch
- No emotional language, no "cheesy" reassurances
- NEVER use words like "magic", "magie", "special", "spécial", "worth the wait", "ça vaut l'attente" — state facts, not feelings
- When a delivery date is given, ALWAYS frame it as an estimate ("aux alentours du", "around", "etwa um den") — never as a confirmed or guaranteed date

Rules:
- Write entirely in ${language}
- Be concise: 3-4 sentences maximum
- Address the customer by first name only — no "Madame/Monsieur"
- Do NOT add a sign-off or signature — body text only
- Use "livrer" / "deliver" — not "proposer" / "offer"
- Return JSON with two fields: "subject" (email subject line) and "body" (email body text)

Customer info:
- First name: ${order.customer.firstName}
- Order number: ${order.name}
- Product: ${product.productTitle}
- Delivery situation: ${etaText}`;

  return callClaude(prompt);
}

async function callClaude(prompt: string): Promise<{ subject: string; body: string }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");
  return JSON.parse(jsonMatch[0]) as { subject: string; body: string };
}

export async function generateFollowUpEmail(
  analysis: BackorderAnalysis
): Promise<{ subject: string; body: string }> {
  const { order, product, estimatedDelivery, leadTimeMin, leadTimeMax } = analysis;
  const language = LOCALE_LABELS[order.customer.locale] ?? "French";

  // This email is sent 15 days after the first — compute remaining time from that point
  const FOLLOWUP_DELAY_DAYS = 15;

  let remainingText: string;
  if (estimatedDelivery) {
    const daysFromNow = Math.ceil(
      (new Date(estimatedDelivery).getTime() - Date.now()) / 86_400_000
    );
    const daysRemaining = daysFromNow - FOLLOWUP_DELAY_DAYS;
    const deliveryDate = new Date(estimatedDelivery).toLocaleDateString("fr-CH", {
      day: "numeric", month: "long", year: "numeric",
    });
    remainingText = daysRemaining > 0
      ? `delivery still estimated around ${deliveryDate} — approximately ${daysRemaining} days remaining from the date this email is sent — phrase as estimate, not a guarantee`
      : `delivery still estimated around ${deliveryDate} — phrase as estimate, not a guarantee`;
  } else if (leadTimeMin) {
    const remMin = Math.max(0, leadTimeMin - FOLLOWUP_DELAY_DAYS);
    const remMax = leadTimeMax ? Math.max(0, leadTimeMax - FOLLOWUP_DELAY_DAYS) : null;
    remainingText = remMax
      ? `approximately ${remMin}–${remMax} days remaining from the date this email is sent`
      : `approximately ${remMin} days remaining from the date this email is sent`;
  } else {
    remainingText = "delivery timing confirmed — no change to original estimate";
  }

  const prompt = `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write a brief reassurance email to a customer. Their order is in production and on track — this is a proactive status update sent 15 days after their initial backorder notification.

Purpose of this email:
- Confirm the order is still in production and the delivery timeline has not changed
- Give the customer the remaining estimated time before delivery
- NOT announce any delay or problem — everything is on schedule

Tone guidelines:
- Professional and factual — this is an update, not an apology
- Confident: the order is progressing as planned
- No emotional language, no "magic", no "special", no "worth the wait"
- Do NOT use words like "magie", "spécial", "ça vaut l'attente"

Rules:
- Write entirely in ${language}
- 3 sentences maximum
- Address by first name only — no "Madame/Monsieur"
- No sign-off or signature — body text only
- Use "livrer" / "deliver" — not "proposer" / "offer"
- Return JSON: { "subject": "...", "body": "..." }

Customer info:
- First name: ${order.customer.firstName}
- Order number: ${order.name}
- Product: ${product.productTitle}
- Current status: ${remainingText}`;

  return callClaude(prompt);
}

// ── Klaviyo — production step events ──────────────────────────────────────────

export async function sendProductionEventToKlaviyo(params: {
  email: string;
  firstName: string;
  subject: string;
  body: string;
  orderId: string;
  productTitle: string;
  stepName: string;
  direction: ProductionDirection;
  leadTimeMin: number | null;
  leadTimeMax: number | null;
  leadTimeUnit: string;
  customerLocale?: string;
}): Promise<void> {
  const apiKey = process.env.KLAVIYO_API_KEY!;
  const metricName = params.direction === "IN" ? "ProductionStepStarted" : "ProductionStepCompleted";

  const res = await fetch("https://a.klaviyo.com/api/events/", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      "Content-Type": "application/json",
      revision: "2024-10-15",
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          profile: {
            data: {
              type: "profile",
              attributes: { email: params.email, first_name: params.firstName },
            },
          },
          metric: {
            data: {
              type: "metric",
              attributes: { name: metricName },
            },
          },
          properties: {
            email_subject: params.subject,
            email_body: params.body,
            order_id: params.orderId,
            product_title: params.productTitle,
            step_name: params.stepName,
            direction: params.direction,
            lead_time_min: params.leadTimeMin ?? "",
            lead_time_max: params.leadTimeMax ?? "",
            lead_time_unit: params.leadTimeUnit,
            customer_locale: params.customerLocale ?? "",
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Klaviyo ${res.status}: ${text.slice(0, 200)}`);
  }
}

// ── Claude API — production step email generation ─────────────────────────────

export async function generateProductionEmail(
  analysis: ProductionAnalysis
): Promise<{ subject: string; emailBody: string }> {
  const { order, product, step, direction } = analysis;
  const locale = order.customer.locale;
  const language = LOCALE_LABELS[locale] ?? "French";

  // Pick translated step name/description based on customer locale
  const stepName = locale === "de" ? (step.name_de ?? step.name)
    : locale === "en" ? (step.name_en ?? step.name)
    : step.name;
  const stepDescription = locale === "de" ? (step.description_de ?? step.description)
    : locale === "en" ? (step.description_en ?? step.description)
    : step.description;

  const durationText = (step.lead_time_min && step.lead_time_max)
    ? `between ${step.lead_time_min} and ${step.lead_time_max} ${step.lead_time_unit}`
    : step.lead_time_min
    ? `approximately ${step.lead_time_min} ${step.lead_time_unit}`
    : null;

  const signOff = locale === "de" ? "Das Produktionsteam von Mood"
    : locale === "en" ? "The Mood production team"
    : locale === "it" ? "Il team di produzione Mood"
    : locale === "es" ? "El equipo de producción Mood"
    : "L'équipe de production Mood";

  const prompt = direction === "IN"
    ? `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write a short email to a customer informing them that their order has just entered the "${stepName}" production stage.${stepDescription ? `\n\nAbout this step: ${stepDescription}` : ""}

Purpose: inform the customer their piece is now being actively worked on, and give an estimated duration for this step.

Tone guidelines:
- Professional and factual — this is a status update
- Brief and informative, no corporate fluff
- No emotional language, no "magic", no "special"

Rules:
- Write entirely in ${language}
- 2 short paragraphs separated by a blank line
- First paragraph: address the customer by first name and give the status update with estimated duration
- Second paragraph: one reassuring sentence about the piece moving forward
- End with a sign-off line on its own line: "${signOff}"
- Separate each paragraph and the sign-off with a blank line (\\n\\n)
- Always mention the product name (${product.productTitle}) in the email body
- Return JSON: { "subject": "...", "body": "..." } where body uses \\n\\n between paragraphs

Customer info:
- First name: ${order.customer.firstName}
- Order number: ${order.name}
- Product: ${product.productTitle}
- Step: ${stepName}${durationText ? `\n- Estimated duration: ${durationText}` : ""}`

    : `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write a short email to a customer informing them that their order has just completed the "${stepName}" production stage and is moving forward.

Purpose: confirm this step is done, signal progress — do not announce delivery date.

Tone guidelines:
- Professional and factual
- Positive but not effusive
- No emotional language, no "magic", no "special"

Rules:
- Write entirely in ${language}
- 2 short paragraphs separated by a blank line
- First paragraph: address the customer by first name and confirm the step is complete
- Second paragraph: one brief sentence indicating the order continues moving forward
- End with a sign-off line on its own line: "${signOff}"
- Separate each paragraph and the sign-off with a blank line (\\n\\n)
- Always mention the product name (${product.productTitle}) in the email body
- Return JSON: { "subject": "...", "body": "..." } where body uses \\n\\n between paragraphs

Customer info:
- First name: ${order.customer.firstName}
- Order number: ${order.name}
- Product: ${product.productTitle}
- Completed step: ${stepName}`;

  const result = await callClaude(prompt);
  const emailBody = result.body
    .split(/\n\n+/)
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
  return { subject: result.subject, emailBody };
}

// ── Gorgias — detect delay inquiry + extract order number ────────────────────

export async function detectDelayInquiry(
  messageText: string
): Promise<{ is_delay_inquiry: boolean; order_number: string | null }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Analyze this customer support message (may be in French, German, English or other languages).

Is the customer asking anything about their order — including: where it is, delivery status, when it will arrive, a delay, production status, tracking, or any question about receiving their order?
Be permissive: "où en est ma commande", "wo ist meine Bestellung", "where is my order", "quand vais-je recevoir" all count as YES.

Also extract the order number if mentioned anywhere (formats: #12345, commande 12345, order 12345, Bestellung 12345, numéro 12345, etc.)
Return JSON only: { "is_delay_inquiry": boolean, "order_number": string | null }

Message: ${JSON.stringify(messageText)}`,
      },
    ],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { is_delay_inquiry: false, order_number: null };
  return JSON.parse(match[0]) as { is_delay_inquiry: boolean; order_number: string | null };
}

// ── Gorgias — generate draft customer reply ───────────────────────────────────

type GorgiasBackorderItem = {
  productTitle: string;
  estimatedDelivery: string | null;
  leadTimeMin: number | null;
  leadTimeMax: number | null;
};

export async function generateGorgiasResponse(params: {
  orderName: string;
  customerFirstName: string;
  customerMessage: string;
  backorderItems: GorgiasBackorderItem[];
}): Promise<string> {
  const { orderName, customerFirstName, customerMessage, backorderItems } = params;

  const itemsText = backorderItems.length
    ? backorderItems.map((item) => {
        const eta = item.estimatedDelivery
          ? `estimated delivery around ${new Date(item.estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })} (estimate, not guaranteed)`
          : item.leadTimeMin && item.leadTimeMax
          ? `estimated lead time: ${item.leadTimeMin}–${item.leadTimeMax} days`
          : item.leadTimeMin
          ? `estimated lead time: approximately ${item.leadTimeMin} days`
          : "no confirmed date yet";
        return `- ${item.productTitle}: ${eta}`;
      }).join("\n")
    : "No backorder detected — order appears to be processing normally.";

  const prompt = `You are writing on behalf of Mood Collection, a Swiss jewelry brand, responding to a customer support inquiry.

Brand context (use naturally, not as a pitch):
- Mood Collection intentionally keeps a very small ready stock
- Most pieces are crafted after purchase — this guarantees the widest choice and artisan quality
- Never say "rupture de stock" or "out of stock" — say the piece is "en cours de production" / "in production" / "in Produktion"
- Frame production time as a deliberate brand choice, stated as a fact, not an apology

Customer message: ${JSON.stringify(customerMessage)}

Order: ${orderName}
Customer first name: ${customerFirstName}
Production status:
${itemsText}

Instructions:
- Write entirely in the same language as the customer's message
- Address the customer by first name only
- Be professional and factual — no excessive apologies
- Mention that the piece is in production and briefly explain that Mood Collection keeps a small stock and produces certain pieces after purchase to guarantee the widest choice and artisan quality (one sentence, stated as a fact — never say "each piece" / "chaque pièce" / "jedes Stück", always say "certain pieces" / "certaines pièces" / "bestimmte Stücke")
- If an estimated timeframe is available, mention it as an estimate, not a guarantee
- 3–4 sentences maximum
- No sign-off or signature — body text only
- Return plain text only (no JSON, no subject line)`;

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].type === "text" ? response.content[0].text.trim() : "";
}

// ── Resend — internal fulfillment notification ────────────────────────────────

export async function sendFulfillmentNotification(params: {
  action: "fulfill" | "unfulfill";
  orderName: string;
  lineItemTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  performedBy: string;
  siblingsUnfulfilled?: { title: string }[];
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const actionLabel = params.action === "fulfill" ? "✅ Fulfillé" : "↩️ Unfulfillé";
  const variant = params.variantTitle && params.variantTitle !== "Default Title"
    ? ` — ${params.variantTitle}` : "";

  const siblingsNote = params.siblingsUnfulfilled?.length
    ? `<p style="color:#b45309;margin-top:16px">⚠️ ${params.siblingsUnfulfilled.length} autre(s) article(s) unfulfillé(s) par la même opération :<br>${params.siblingsUnfulfilled.map(s => `&nbsp;&nbsp;• ${s.title}`).join("<br>")}</p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;color:#111">
      <h2 style="margin-bottom:4px">${actionLabel}</h2>
      <p style="color:#555;margin-top:0">Commande <strong>${params.orderName}</strong></p>
      <table style="border-collapse:collapse;width:100%;margin-top:16px">
        <tr><td style="padding:6px 0;color:#555;width:120px">Article</td><td><strong>${params.lineItemTitle}${variant}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#555">SKU</td><td>${params.sku || "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Quantité</td><td>${params.quantity}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Par</td><td>${params.performedBy}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Heure</td><td>${new Date().toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })}</td></tr>
      </table>
      ${siblingsNote}
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "katana@yourmood.net",
      to: "philippe@yourmood.net",
      subject: `${actionLabel} — ${params.orderName} · ${params.lineItemTitle}${variant}`,
      html,
    }),
  });
}
