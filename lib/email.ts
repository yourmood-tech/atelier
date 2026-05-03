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
  greeting: string;
  body: string;
  sign_off: string;
  orderId: string;
  productTitle: string;
  estimatedDelivery: string | null;
  supplierName: string | null;
  followupSubject?: string | null;
  followupGreeting?: string | null;
  followupBody?: string | null;
  followupSignOff?: string | null;
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
            email_greeting: params.greeting,
            email_body: params.body,
            email_sign_off: params.sign_off,
            order_id: params.orderId,
            product_title: params.productTitle,
            estimated_delivery: params.estimatedDelivery ?? "À confirmer",
            supplier_name: params.supplierName ?? "",
            needs_followup: !!(params.followupSubject && params.followupBody),
            followup_subject: params.followupSubject ?? "",
            followup_greeting: params.followupGreeting ?? "",
            followup_body: params.followupBody ?? "",
            followup_sign_off: params.followupSignOff ?? "",
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
): Promise<{ subject: string; greeting: string; body: string; sign_off: string }> {
  const { order, product, estimatedDelivery, leadTimeMin, leadTimeMax, supplierName } = analysis;
  const locale = order.customer.locale;
  const language = LOCALE_LABELS[locale] ?? "French";
  // Strip double-quotes from product title — Claude recopies them unescaped into JSON strings
  const safeProductTitle = product.productTitle.replace(/"/g, "'");
  const isIcelea = supplierName?.toLowerCase().includes("icelea") ?? false;

  const greeting = locale === "de" ? `Liebe ${order.customer.firstName},`
    : locale === "en" ? `Dear ${order.customer.firstName},`
    : locale === "it" ? `Cara ${order.customer.firstName},`
    : locale === "es" ? `Estimada ${order.customer.firstName},`
    : `Chère ${order.customer.firstName},`;

  const sign_off = locale === "de" ? "Das Produktionsteam von Mood"
    : locale === "en" ? "The Mood production team"
    : locale === "it" ? "Il team di produzione Mood"
    : locale === "es" ? "El equipo de producción Mood"
    : "L'équipe de production Mood";

  const etaText = estimatedDelivery
    ? `approximate delivery window: around ${new Date(estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })} — phrase this as an estimate, not a guarantee`
    : (leadTimeMin && leadTimeMax)
    ? `estimated lead time: between ${leadTimeMin} and ${leadTimeMax} days from today`
    : leadTimeMin
    ? `estimated lead time: approximately ${leadTimeMin} days from today`
    : "no confirmed date yet — we will inform you as soon as possible";

  const prompt = isIcelea
    ? `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write the body of a clear, professional email informing a customer that one item in their order is produced in small quantities, mostly made-to-order.

Key message to convey (state as facts, not marketing):
- This type of item is produced in small quantities, for the most part after the order is placed
- This approach allows Mood Collection to offer the widest possible choice of models and sizes
- It guarantees the best quality and avoids overproduction
- Include the estimated delivery date as an estimate

Tone guidelines:
- Professional and factual — not apologetic, not effusive
- State the production approach as a deliberate, positive choice — not as an excuse
- NEVER use words like "magic", "magie", "special", "spécial", "worth the wait", "ça vaut l'attente"
- When a delivery date is given, ALWAYS frame it as an estimate ("aux alentours du", "around", "etwa um den") — never as confirmed or guaranteed

Rules:
- Write entirely in ${language}
- Be concise: 3-4 sentences maximum
- CRITICAL: start the body DIRECTLY with the first sentence — do NOT open with any salutation ("Chère", "Liebe", "Dear", the customer's name, etc.)
- Do NOT include a sign-off or signature
- Return JSON: { "subject": "...", "body": "..." } — body is a single paragraph, NO newlines inside string values

Customer info:
- First name: ${order.customer.firstName} (for subject personalization only — NOT in body)
- Order number: ${order.name}
- Product: ${safeProductTitle}
- Delivery situation: ${etaText}`

    : `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write the body of a clear, professional email informing a customer that one item in their order is currently affected by a raw materials stock shortage at the supplier.

Key message to convey:
- There is unfortunately a current raw materials stock shortage affecting this item
- Include the estimated delivery date as an estimate

Tone guidelines:
- Professional and direct — honest about the situation, not overly apologetic
- No emotional language, no "cheesy" reassurances
- NEVER use words like "magic", "magie", "special", "spécial", "worth the wait", "ça vaut l'attente"
- When a delivery date is given, ALWAYS frame it as an estimate ("aux alentours du", "around", "etwa um den") — never as confirmed or guaranteed

Rules:
- Write entirely in ${language}
- Be concise: 2-3 sentences maximum
- CRITICAL: start the body DIRECTLY with the first sentence — do NOT open with any salutation ("Chère", "Liebe", "Dear", the customer's name, etc.)
- Do NOT include a sign-off or signature
- Return JSON: { "subject": "...", "body": "..." } — body is a single paragraph, NO newlines inside string values

Customer info:
- First name: ${order.customer.firstName} (for subject personalization only — NOT in body)
- Order number: ${order.name}
- Product: ${safeProductTitle}
- Delivery situation: ${etaText}`;

  const result = await callClaude(prompt);
  return { subject: result.subject, greeting, body: result.body, sign_off };
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

  // Try direct parse first; fall back to replacing literal newlines with spaces
  // (Claude occasionally outputs unescaped control characters inside JSON string values)
  try {
    return JSON.parse(jsonMatch[0]) as { subject: string; body: string };
  } catch {
    return JSON.parse(jsonMatch[0].replace(/\r?\n/g, " ")) as { subject: string; body: string };
  }
}

export async function generateFollowUpEmail(
  analysis: BackorderAnalysis
): Promise<{ subject: string; greeting: string; body: string; sign_off: string }> {
  const { order, product, estimatedDelivery, leadTimeMin, leadTimeMax, supplierName } = analysis;
  const isIcelea = supplierName?.toLowerCase().includes("icelea") ?? false;
  const locale = order.customer.locale;
  const language = LOCALE_LABELS[locale] ?? "French";
  const safeProductTitle = product.productTitle.replace(/"/g, "'");

  const greeting = locale === "de" ? `Liebe ${order.customer.firstName},`
    : locale === "en" ? `Dear ${order.customer.firstName},`
    : locale === "it" ? `Cara ${order.customer.firstName},`
    : locale === "es" ? `Estimada ${order.customer.firstName},`
    : `Chère ${order.customer.firstName},`;

  const sign_off = locale === "de" ? "Das Produktionsteam von Mood"
    : locale === "en" ? "The Mood production team"
    : locale === "it" ? "Il team di produzione Mood"
    : locale === "es" ? "El equipo de producción Mood"
    : "L'équipe de production Mood";

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

  const prompt = isIcelea
    ? `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write a brief follow-up email to a customer. This is a proactive status update sent 15 days after their initial notification.

Purpose of this email:
- Confirm that production is still ongoing and the delivery timeline has not changed
- Restate the estimated delivery date
- Nothing else — do NOT mention again that the item is made-to-order or any production philosophy

Tone guidelines:
- Professional and factual — one or two sentences, no padding
- No emotional language, no "magic", no "special", no "worth the wait"
- When a delivery date is given, ALWAYS frame it as an estimate — never as confirmed or guaranteed

Rules:
- Write entirely in ${language}
- 2 sentences maximum
- CRITICAL: start the body DIRECTLY with the first sentence — do NOT open with any salutation
- Do NOT include a sign-off or signature
- Return JSON: { "subject": "...", "body": "..." } — body is a single paragraph, NO newlines inside string values

Customer info:
- First name: ${order.customer.firstName} (for subject personalization only — NOT in body)
- Order number: ${order.name}
- Product: ${safeProductTitle}
- Current status: ${remainingText}`

    : `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write a brief follow-up email to a customer. This is a proactive status update sent 15 days after their initial notification about a raw materials stock shortage.

Purpose of this email:
- Confirm the situation is being handled and the delivery timeline has not changed
- Give the customer the remaining estimated time before delivery
- NOT announce any new delay or problem — everything is on track

Tone guidelines:
- Professional and factual — this is an update, not an apology
- Honest and straightforward
- No emotional language, no "magic", no "special", no "worth the wait"

Rules:
- Write entirely in ${language}
- 2-3 sentences maximum
- CRITICAL: start the body DIRECTLY with the first sentence — do NOT open with any salutation
- Do NOT include a sign-off or signature
- Return JSON: { "subject": "...", "body": "..." } — body is a single paragraph, NO newlines inside string values

Customer info:
- First name: ${order.customer.firstName} (for subject personalization only — NOT in body)
- Order number: ${order.name}
- Product: ${safeProductTitle}
- Current status: ${remainingText}`;

  const result = await callClaude(prompt);
  return { subject: result.subject, greeting, body: result.body, sign_off };
}

// ── Multi-product backorder emails (one email per customer across all orders) ─

type MultiProduct = { productTitle: string; orderId: string };

function buildGreeting(firstName: string, locale: string): string {
  return locale === "de" ? `Liebe ${firstName},`
    : locale === "en" ? `Dear ${firstName},`
    : locale === "it" ? `Cara ${firstName},`
    : locale === "es" ? `Estimada ${firstName},`
    : `Chère ${firstName},`;
}

function buildSignOff(locale: string): string {
  return locale === "de" ? "Das Produktionsteam von Mood"
    : locale === "en" ? "The Mood production team"
    : locale === "it" ? "Il team di produzione Mood"
    : locale === "es" ? "El equipo de producción Mood"
    : "L'équipe de production Mood";
}

export async function generateBackorderEmailMulti(params: {
  firstName: string;
  locale: string;
  products: MultiProduct[];
  estimatedDelivery: string | null;
  supplierName: string | null;
}): Promise<{ subject: string; greeting: string; body: string; sign_off: string }> {
  const { firstName, locale, products, estimatedDelivery, supplierName } = params;
  const language = LOCALE_LABELS[locale] ?? "French";
  const isIcelea = supplierName?.toLowerCase().includes("icelea") ?? false;

  const etaText = estimatedDelivery
    ? `approximate delivery window: around ${new Date(estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })} — phrase this as an estimate, not a guarantee`
    : "no confirmed date yet — we will inform you as soon as possible";

  const safeProducts = products.map((p) => ({
    ...p,
    productTitle: p.productTitle.replace(/"/g, "'"),
  }));

  const productLines = safeProducts.length === 1
    ? `- ${safeProducts[0].productTitle} (order ${safeProducts[0].orderId})`
    : safeProducts.map((p) => `- ${p.productTitle} (order ${p.orderId})`).join("\n");

  const multiNote = safeProducts.length > 1
    ? "IMPORTANT: the customer has MULTIPLE affected items across one or more orders — mention all of them briefly in the body."
    : "";

  const prompt = isIcelea
    ? `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write the body of a clear, professional email informing a customer that one or more items in their order(s) are produced in small quantities, mostly made-to-order.
${multiNote}

Key message to convey (state as facts, not marketing):
- This type of item is produced in small quantities, for the most part after the order is placed
- This approach allows Mood Collection to offer the widest possible choice of models and sizes
- It guarantees the best quality and avoids overproduction
- Include the estimated delivery date as an estimate

Tone guidelines:
- Professional and factual — not apologetic, not effusive
- State the production approach as a deliberate, positive choice — not as an excuse
- NEVER use words like "magic", "magie", "special", "spécial", "worth the wait", "ça vaut l'attente"
- When a delivery date is given, ALWAYS frame it as an estimate — never as confirmed or guaranteed

Rules:
- Write entirely in ${language}
- Be concise: 3-5 sentences maximum
- CRITICAL: start the body DIRECTLY with the first sentence — do NOT open with any salutation
- Do NOT include a sign-off or signature
- Return JSON: { "subject": "...", "body": "..." } — body is a single paragraph, NO newlines inside string values

Customer info:
- First name: ${firstName} (for subject personalization only — NOT in body)
- Affected item(s):
${productLines}
- Delivery situation: ${etaText}`

    : `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write the body of a clear, professional email informing a customer that one or more items in their order(s) are currently affected by a raw materials stock shortage at the supplier.
${multiNote}

Key message to convey:
- There is unfortunately a current raw materials stock shortage affecting this item / these items
- Include the estimated delivery date as an estimate

Tone guidelines:
- Professional and direct — honest about the situation, not overly apologetic
- No emotional language, no "cheesy" reassurances
- NEVER use words like "magic", "magie", "special", "spécial", "worth the wait", "ça vaut l'attente"
- When a delivery date is given, ALWAYS frame it as an estimate — never as confirmed or guaranteed

Rules:
- Write entirely in ${language}
- Be concise: 2-4 sentences maximum
- CRITICAL: start the body DIRECTLY with the first sentence — do NOT open with any salutation
- Do NOT include a sign-off or signature
- Return JSON: { "subject": "...", "body": "..." } — body is a single paragraph, NO newlines inside string values

Customer info:
- First name: ${firstName} (for subject personalization only — NOT in body)
- Affected item(s):
${productLines}
- Delivery situation: ${etaText}`;

  const result = await callClaude(prompt);
  return { subject: result.subject, greeting: buildGreeting(firstName, locale), body: result.body, sign_off: buildSignOff(locale) };
}

export async function generateFollowUpEmailMulti(params: {
  firstName: string;
  locale: string;
  products: MultiProduct[];
  estimatedDelivery: string | null;
  supplierName: string | null;
}): Promise<{ subject: string; greeting: string; body: string; sign_off: string }> {
  const { firstName, locale, products, estimatedDelivery, supplierName } = params;
  const isIcelea = supplierName?.toLowerCase().includes("icelea") ?? false;
  const language = LOCALE_LABELS[locale] ?? "French";

  const FOLLOWUP_DELAY_DAYS = 15;
  let remainingText: string;
  if (estimatedDelivery) {
    const daysFromNow = Math.ceil((new Date(estimatedDelivery).getTime() - Date.now()) / 86_400_000);
    const daysRemaining = daysFromNow - FOLLOWUP_DELAY_DAYS;
    const deliveryDate = new Date(estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
    remainingText = daysRemaining > 0
      ? `delivery still estimated around ${deliveryDate} — approximately ${daysRemaining} days remaining from the date this email is sent — phrase as estimate, not a guarantee`
      : `delivery still estimated around ${deliveryDate} — phrase as estimate, not a guarantee`;
  } else {
    remainingText = "delivery timing confirmed — no change to original estimate";
  }

  const safeProducts = products.map((p) => ({ ...p, productTitle: p.productTitle.replace(/"/g, "'") }));
  const productLines = safeProducts.length === 1
    ? `- ${safeProducts[0].productTitle} (order ${safeProducts[0].orderId})`
    : safeProducts.map((p) => `- ${p.productTitle} (order ${p.orderId})`).join("\n");

  const prompt = isIcelea
    ? `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write a brief follow-up email to a customer. This is a proactive status update sent 15 days after their initial notification.

Purpose of this email:
- Confirm that production is still ongoing and the delivery timeline has not changed
- Restate the estimated delivery date
- Nothing else — do NOT mention again that the item is made-to-order or any production philosophy

Tone guidelines:
- Professional and factual — one or two sentences, no padding
- No emotional language, no "magic", no "special", no "worth the wait"
- When a delivery date is given, ALWAYS frame it as an estimate — never as confirmed or guaranteed

Rules:
- Write entirely in ${language}
- 2 sentences maximum
- CRITICAL: start the body DIRECTLY with the first sentence — do NOT open with any salutation
- Do NOT include a sign-off or signature
- Return JSON: { "subject": "...", "body": "..." } — body is a single paragraph, NO newlines inside string values

Customer info:
- First name: ${firstName} (for subject personalization only — NOT in body)
- Affected item(s):
${productLines}
- Current status: ${remainingText}`

    : `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write a brief follow-up email to a customer. This is a proactive status update sent 15 days after their initial notification about a raw materials stock shortage.

Purpose of this email:
- Confirm the situation is being handled and the delivery timeline has not changed
- Give the customer the remaining estimated time before delivery
- NOT announce any new delay or problem — everything is on track

Tone guidelines:
- Professional and factual — this is an update, not an apology
- Honest and straightforward
- No emotional language, no "magic", no "special", no "worth the wait"

Rules:
- Write entirely in ${language}
- 2-3 sentences maximum
- CRITICAL: start the body DIRECTLY with the first sentence — do NOT open with any salutation
- Do NOT include a sign-off or signature
- Return JSON: { "subject": "...", "body": "..." } — body is a single paragraph, NO newlines inside string values

Customer info:
- First name: ${firstName} (for subject personalization only — NOT in body)
- Affected item(s):
${productLines}
- Current status: ${remainingText}`;

  const result = await callClaude(prompt);
  return { subject: result.subject, greeting: buildGreeting(firstName, locale), body: result.body, sign_off: buildSignOff(locale) };
}

// ── Klaviyo — production step events ──────────────────────────────────────────

export async function sendProductionEventToKlaviyo(params: {
  email: string;
  firstName: string;
  subject: string;
  greeting: string;
  body: string;
  sign_off: string;
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
            email_greeting: params.greeting,
            email_body: params.body,
            email_sign_off: params.sign_off,
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
): Promise<{ subject: string; greeting: string; body: string; sign_off: string }> {
  const { order, step, direction } = analysis;
  const product = analysis.product ?? null;
  const locale = order.customer.locale;
  const language = LOCALE_LABELS[locale] ?? "French";

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

  const greeting = locale === "de" ? `Liebe ${order.customer.firstName},`
    : locale === "en" ? `Dear ${order.customer.firstName},`
    : locale === "it" ? `Cara ${order.customer.firstName},`
    : locale === "es" ? `Estimada ${order.customer.firstName},`
    : `Chère ${order.customer.firstName},`;

  const sign_off = locale === "de" ? "Das Produktionsteam von Mood"
    : locale === "en" ? "The Mood production team"
    : locale === "it" ? "Il team di produzione Mood"
    : locale === "es" ? "El equipo de producción Mood"
    : "L'équipe de production Mood";

  const productLine = product ? `\n- Product: ${product.productTitle}` : "";
  const mentionProduct = product
    ? `- Always mention the product name (${product.productTitle})`
    : "- Do NOT mention a specific product name — refer to \"your order\" only";

  const prompt = direction === "IN"
    ? `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write the body of a short email informing a customer that their order has just entered the "${stepName}" production stage.${stepDescription ? `\n\nAbout this step: ${stepDescription}` : ""}

Purpose: inform the customer their piece is now being actively worked on, and give an estimated duration for this step.

Tone guidelines:
- Professional and factual — this is a status update
- Brief and informative, no corporate fluff
- No emotional language, no "magic", no "special"

Rules:
- Write entirely in ${language}
- 2 short paragraphs separated by a blank line
- Do NOT include a greeting or sign-off — body only
- ${mentionProduct}
- Return JSON: { "subject": "...", "body": "..." } where body uses \\n\\n between paragraphs

Context:
- Order number: ${order.name}${productLine}
- Step: ${stepName}${durationText ? `\n- Estimated duration: ${durationText}` : ""}`

    : `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write the body of a short email informing a customer that their order has just completed the "${stepName}" production stage and is moving forward.

Purpose: confirm this step is done, signal progress — do not announce delivery date.

Tone guidelines:
- Professional and factual
- Positive but not effusive
- No emotional language, no "magic", no "special"

Rules:
- Write entirely in ${language}
- 2 short paragraphs separated by a blank line
- Do NOT include a greeting or sign-off — body only
- ${mentionProduct}
- Return JSON: { "subject": "...", "body": "..." } where body uses \\n\\n between paragraphs

Context:
- Order number: ${order.name}${productLine}
- Completed step: ${stepName}`;

  const result = await callClaude(prompt);
  return { subject: result.subject, greeting, body: result.body, sign_off };
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
