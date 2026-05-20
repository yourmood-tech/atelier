/**
 * Wrapper pour appeler l'API Claude (Anthropic) — utilisé pour la génération
 * de TEXTE dans atelier. Les outils image continuent d'utiliser Gemini 3 Pro
 * Image (Nano Banana Pro) qui reste sans concurrent pour notre usage.
 *
 * Modèles dispos :
 *  - claude-haiku-4-5     → rapide + bon marché (défaut)
 *  - claude-sonnet-4-6    → meilleure qualité éditoriale
 *  - claude-opus-4-7      → pour rédaction premium
 */

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const DEFAULT_MODEL = "claude-haiku-4-5";

type ImageInput = { mimeType?: string; data: string };

type ClaudeOpts = {
  prompt: string;
  image?: ImageInput;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
};

export async function callClaude(opts: ClaudeOpts): Promise<string | null> {
  const { prompt, image, model, maxTokens = 1024, temperature = 0.7, jsonMode = false } = opts;
  if (!ANTHROPIC_KEY) {
    console.warn("[claude-ai] ANTHROPIC_API_KEY manquante — appel ignoré");
    return null;
  }

  const content = image
    ? [
        { type: "image", source: { type: "base64", media_type: image.mimeType || "image/png", data: image.data } },
        { type: "text", text: prompt },
      ]
    : prompt;

  const body: Record<string, unknown> = {
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content }],
  };

  if (jsonMode) {
    body.system = "Tu réponds UNIQUEMENT avec du JSON valide. Pas de balises markdown, pas de préambule, pas d'explication. Le premier caractère de ta réponse doit être { et le dernier }.";
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const errTxt = await r.text();
      console.error(`[claude-ai] erreur HTTP ${r.status} :`, errTxt.slice(0, 300));
      return null;
    }
    const data = await r.json() as { content?: Array<{ text?: string }> };
    const text = data?.content?.[0]?.text;
    if (!text) {
      console.error("[claude-ai] réponse vide", data);
      return null;
    }
    return text.trim();
  } catch (e) {
    console.error("[claude-ai] exception :", (e as Error)?.message || e);
    return null;
  }
}

export async function callClaudeJson<T = unknown>(opts: ClaudeOpts): Promise<T | null> {
  const text = await callClaude({ ...opts, jsonMode: true });
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("[claude-ai] JSON parse échec :", cleaned.slice(0, 300));
    return null;
  }
}
