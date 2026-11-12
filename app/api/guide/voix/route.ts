// La voix du bonhomme (voix « Kore », choisie par Amila le 12.11.2026).
// GET ?t=<phrase> → un son à jouer. Les phrases identiques sont gardées en mémoire par le réseau
// (une phrase fixe du chemin ne coûte donc qu'une seule fois).

export const dynamic = "force-dynamic";
const KEY = process.env.GEMINI_API_KEY || "";
const VOIX = "Kore";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };
export async function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

function wav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function GET(req: Request) {
  const t = String(new URL(req.url).searchParams.get("t") || "").trim().slice(0, 900);
  if (!t || !KEY) return new Response("", { status: 400, headers: CORS });
  const consigne = "Dis avec une petite voix joyeuse, douce et chaleureuse, comme un petit personnage de dessin animé, à un rythme naturel : " + t;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: consigne }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOIX } } } } }),
  });
  if (!r.ok) return new Response("", { status: 502, headers: CORS });
  const j: { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] } = await r.json();
  const b64 = j.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) return new Response("", { status: 502, headers: CORS });
  return new Response(new Uint8Array(wav(Buffer.from(b64, "base64"))), {
    headers: { ...CORS, "Content-Type": "audio/wav", "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
