import type { BackorderAnalysis } from "./types";

// ── Gmail send ────────────────────────────────────────────────────────────────

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.default.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });

  await transporter.sendMail({
    from: `"Mood Collection" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });
}

// ── Email generation via Claude API ──────────────────────────────────────────

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

  const { order, product, estimatedDelivery, leadTimeDays } = analysis;
  const locale = order.customer.locale;
  const language = LOCALE_LABELS[locale] ?? "French";

  const etaText = estimatedDelivery
    ? `estimated delivery date: ${new Date(estimatedDelivery).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })}`
    : leadTimeDays
    ? `estimated lead time: ${leadTimeDays} days from today`
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

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude did not return valid JSON for email generation");
  }

  const parsed = JSON.parse(jsonMatch[0]) as { subject: string; body: string };
  return { subject: parsed.subject, body: parsed.body };
}
