import { NextRequest, NextResponse } from "next/server";
import { callClaudeJson } from "@/lib/claude-ai";

export const maxDuration = 30;

const LANG_LABEL: Record<string, string> = {
  de: "German (allemand)",
  en: "English (anglais)",
  fr: "French (français)",
};

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante côté serveur — Philippe doit l'ajouter dans Vercel" }, { status: 500 });
  }

  let body: { textes?: Record<string, string>; cible?: string; contexte?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

  const { textes, cible, contexte } = body;
  if (!textes || typeof textes !== "object" || !cible || !LANG_LABEL[cible]) {
    return NextResponse.json({ error: "Paramètres manquants ou invalides (textes, cible)" }, { status: 400 });
  }

  const targetLang = LANG_LABEL[cible];
  const contextNote = contexte ? `\nTemplate context: ${contexte}` : "";

  const prompt = `You are a luxury jewelry brand copywriter for Mood Collection (Swiss interchangeable rings brand).

Translate the following French marketing texts into ${targetLang}.

RULES:
- Keep the punchy, short, evocative marketing tone — never literal/clunky translations.
- For UPPERCASE CTAs (e.g., "EN PROFITER", "JE DÉCOUVRE"), output UPPERCASE CTAs in the target language (e.g., "JETZT PROFITIEREN" / "ENTDECKEN" for German; "SHOP NOW" / "DISCOVER" for English).
- For collection names in script (e.g., "océan", "Riviera Rose"), DO NOT translate the proper name — keep it as-is.
- For percentages (e.g., "-50%", "55%"), keep the number identical.
- For promo codes (e.g., "WELCOMESPRING", "COLORSSS"), keep the code identical (codes are universal).
- Keep approximately the same length per field — these are visual designs, longer text breaks the layout.
- If a field is empty or just numbers/codes, return it unchanged.

${contextNote}

Input JSON (keys are field IDs, values are French texts):
${JSON.stringify(textes, null, 2)}

Output STRICT JSON with the SAME keys, values are the translations. No prose, no markdown fences, just the JSON object.`;

  try {
    const parsed = await callClaudeJson<Record<string, string>>({ prompt, maxTokens: 2048, temperature: 0.4 });
    if (!parsed) {
      return NextResponse.json({ error: "Claude n'a pas pu traduire (vérifier ANTHROPIC_API_KEY dans Vercel)" }, { status: 502 });
    }
    return NextResponse.json({ traductions: parsed });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
