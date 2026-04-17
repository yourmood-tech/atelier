import type { BackorderAnalysis } from "./types";

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
    ? `estimated delivery date: ${new Date(estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })}`
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
    max_tokens: 600,
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

  const etaText = estimatedDelivery
    ? `expected delivery: ${new Date(estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })}`
    : (leadTimeMin && leadTimeMax)
    ? `expected lead time: between ${leadTimeMin} and ${leadTimeMax} days from order date`
    : leadTimeMin
    ? `expected lead time: approximately ${leadTimeMin} days from order date`
    : "delivery timing not yet confirmed";

  const prompt = `You are writing on behalf of Mood Collection, a Swiss jewelry brand.
Write a brief follow-up email to a customer whose order is still being prepared. This is a proactive update — they have been waiting for more than two weeks.

Tone guidelines:
- Professional, direct, and reassuring without being apologetic or dramatic
- Acknowledge the wait matter-of-factly
- Confirm the order is progressing and will be delivered
- One sentence maximum on production being done in small quantities by design
- No emotional language, no "magic", no "special", no "worth the wait"
- Do NOT use words like "magie", "spécial", "ça vaut l'attente"

Rules:
- Write entirely in ${language}
- 3-4 sentences maximum
- Address by first name only — no "Madame/Monsieur"
- No sign-off or signature — body text only
- Use "livrer" / "deliver" — not "proposer" / "offer"
- Return JSON: { "subject": "...", "body": "..." }

Customer info:
- First name: ${order.customer.firstName}
- Order number: ${order.name}
- Product: ${product.productTitle}
- Status: ${etaText}`;

  return callClaude(prompt);
}
