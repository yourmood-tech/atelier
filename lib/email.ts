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
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const { order, product, estimatedDelivery, leadTimeMin, leadTimeMax } = analysis;
  const locale = order.customer.locale;
  const language = LOCALE_LABELS[locale] ?? "French";

  const etaText = estimatedDelivery
    ? `estimated delivery date: ${new Date(estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })}`
    : (leadTimeMin && leadTimeMax)
    ? `estimated lead time: between ${leadTimeMin} and ${leadTimeMax} days from today`
    : leadTimeMin
    ? `estimated lead time: approximately ${leadTimeMin} days from today`
    : "no confirmed date yet — we will inform you as soon as possible";

  const prompt = `You are a customer service representative for Mood Collection, a Swiss jewelry brand.
Write a professional and warm email to a customer informing them that one item in their order is temporarily out of stock.

Rules:
- Write entirely in ${language}
- Tone: warm, professional, sincere — not corporate
- Be concise (4-6 sentences max)
- Do NOT use "Madame/Monsieur" — use first name only
- Do NOT add a sign-off or signature — just the body text
- Return JSON with two fields: "subject" (email subject line) and "body" (email body text)

Customer info:
- First name: ${order.customer.firstName}
- Order number: ${order.name}
- Product: ${product.productTitle}
- Stock situation: ${etaText}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude did not return valid JSON for email generation");
  }

  const parsed = JSON.parse(jsonMatch[0]) as { subject: string; body: string };
  return { subject: parsed.subject, body: parsed.body };
}
