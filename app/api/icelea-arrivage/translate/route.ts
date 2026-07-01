import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// POST { text } → traduction FR→EN (pour les remarques du rapport envoyé au fournisseur).
export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text || !text.trim()) return NextResponse.json({ translation: "" });
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Translate the following French text to English for a jewelry supplier (Icelea). Keep it concise and professional. Return ONLY the translation, no preamble:\n\n${text}`,
      }],
    });
    const out = response.content.find((c) => c.type === "text");
    return NextResponse.json({ translation: out && out.type === "text" ? out.text.trim() : "" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur traduction" }, { status: 500 });
  }
}
