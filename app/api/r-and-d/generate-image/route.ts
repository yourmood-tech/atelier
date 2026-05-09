import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
// Gemini Image Generation Model (Nano Banana Pro)
const MODEL = "gemini-3-pro-image-preview";

const STYLE_MOOD_VISUEL = `Style photographique Mood Collection : minimaliste, éclairage doux et naturel, fond uni neutre (blanc cassé, gris clair, ou crème), focus net sur la bague, ambiance précieuse et délicate. Pas de texte, pas de watermark, pas de logo. Cadrage produit centré, vue 3/4 légère. Lumière chaude type studio joaillerie suisse.`;

export async function POST(request: Request) {
  if (!GEMINI_KEY)
    return NextResponse.json({ error: "GEMINI_API_KEY manquante" }, { status: 500 });

  const body = await request.json();
  const { idee } = body || {};

  if (!idee || !idee.nom)
    return NextResponse.json({ error: 'champ "idee" requis avec au moins un nom' }, { status: 400 });

  // Construire le prompt visuel à partir de l'idée
  const composantes = [
    `bague mood "${idee.nom}"`,
    idee.type && `format ${idee.type}`,
    idee.matiere && `en ${idee.matiere}`,
    idee.pvd && `coloration PVD ${idee.pvd}`,
    idee.couleur && !idee.pvd && `couleur ${idee.couleur}`,
    idee.pierre && `serti de ${idee.pierre}`,
    idee.description,
  ].filter(Boolean).join(', ');

  const prompt = `${STYLE_MOOD_VISUEL}

PRODUIT À VISUALISER : ${composantes}.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1" },
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: "erreur Gemini Image", detail: data }, { status: r.status });
    }
    // Extraire l'image base64 de la réponse
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: { inlineData?: { mimeType?: string; data?: string } }) =>
      p.inlineData?.mimeType?.startsWith?.("image/")
    );
    if (!imagePart?.inlineData?.data) {
      return NextResponse.json(
        { error: "réponse sans image", detail: data },
        { status: 500 }
      );
    }
    const dataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    return NextResponse.json({ image: dataUrl });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
