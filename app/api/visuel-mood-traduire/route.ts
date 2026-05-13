import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

export const maxDuration = 30;

const LANG_LABEL: Record<string, string> = {
  de: "German (allemand)",
  en: "English (anglais)",
  fr: "French (français)",
};

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    });
    const respText = await r.text();
    let respData: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    try { respData = JSON.parse(respText); }
    catch { return NextResponse.json({ error: `Gemini non-JSON (HTTP ${r.status})` }, { status: 502 }); }

    if (!r.ok) {
      return NextResponse.json({ error: `Gemini ${r.status}: ${respData?.error?.message || ""}` }, { status: 502 });
    }
    const out = respData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!out) return NextResponse.json({ error: "Pas de sortie Gemini" }, { status: 502 });

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(out);
    } catch {
      const m = out.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); }
        catch { return NextResponse.json({ error: `Sortie Gemini non parsable : ${out.slice(0, 200)}` }, { status: 502 }); }
      } else {
        return NextResponse.json({ error: `Pas de JSON dans la sortie : ${out.slice(0, 200)}` }, { status: 502 });
      }
    }
    return NextResponse.json({ traductions: parsed });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
