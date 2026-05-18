import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Pré-traitement classique (sans IA) pour extraire le motif gravé d'un rendu IA :
 * 1. Grayscale
 * 2. Augmentation contraste (sigmoidal stretch) puis threshold high → binarisation
 * 3. Skeletonization Zhang-Suen → traits fins de 1 pixel
 * 4. Réencodage PNG noir/blanc pur
 *
 * Sortie : un bitmap noir/blanc avec UNIQUEMENT les traits gravés en noir fin sur fond blanc.
 * Ce bitmap est prêt à être vectorisé par Potrace pour produire un SVG à traits simples.
 */
export async function POST(req: Request) {
  let body: { image?: string; threshold?: number; invert?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { image, threshold = 100, invert = false } = body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante ou invalide" }, { status: 400 });
  }
  const m = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Format image invalide" }, { status: 400 });
  const buffer = Buffer.from(m[2], "base64");

  try {
    // Étape 1+2 : grayscale + linear contrast stretch + threshold → binary 0/255
    // threshold (0-255) : plus haut = on garde plus de pixels (lignes plus généreuses)
    // par défaut 100 → on garde tous les pixels < 100 de luminance = traits foncés
    let { data: gray, info } = await sharp(buffer)
      .grayscale()
      .linear(1.5, -40) // contraste boost
      .raw()
      .toBuffer({ resolveWithObject: true });

    const W = info.width;
    const H = info.height;

    // Binarisation : 1 = trait (noir), 0 = fond (blanc)
    // (Convention skeletonization : 1 = pixel à conserver, 0 = fond)
    let bin = new Uint8Array(W * H);
    for (let i = 0; i < gray.length; i++) {
      const isDark = gray[i] < threshold;
      bin[i] = (invert ? !isDark : isDark) ? 1 : 0;
    }

    // Étape 3 : Zhang-Suen skeletonization
    skeletonize(bin, W, H);

    // Étape 4 : réencoder en PNG noir/blanc pur
    const out = Buffer.alloc(W * H);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin[i] === 1 ? 0 : 255; // noir sur blanc
    }
    const png = await sharp(out, { raw: { width: W, height: H, channels: 1 } })
      .png()
      .toBuffer();

    return NextResponse.json({ image: `data:image/png;base64,${png.toString("base64")}` });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}

/** Zhang-Suen thinning algorithm — réduit chaque trait épais à un trait de 1 pixel d'épaisseur. */
function skeletonize(bin: Uint8Array, W: number, H: number) {
  const idx = (x: number, y: number) => y * W + x;
  let changed = true;
  let pass = 0;
  while (changed && pass < 100) {
    changed = false;
    pass++;
    for (const step of [0, 1] as const) {
      const toRemove: number[] = [];
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (bin[idx(x, y)] !== 1) continue;
          const p2 = bin[idx(x, y - 1)];
          const p3 = bin[idx(x + 1, y - 1)];
          const p4 = bin[idx(x + 1, y)];
          const p5 = bin[idx(x + 1, y + 1)];
          const p6 = bin[idx(x, y + 1)];
          const p7 = bin[idx(x - 1, y + 1)];
          const p8 = bin[idx(x - 1, y)];
          const p9 = bin[idx(x - 1, y - 1)];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const A =
            (p2 === 0 && p3 === 1 ? 1 : 0) +
            (p3 === 0 && p4 === 1 ? 1 : 0) +
            (p4 === 0 && p5 === 1 ? 1 : 0) +
            (p5 === 0 && p6 === 1 ? 1 : 0) +
            (p6 === 0 && p7 === 1 ? 1 : 0) +
            (p7 === 0 && p8 === 1 ? 1 : 0) +
            (p8 === 0 && p9 === 1 ? 1 : 0) +
            (p9 === 0 && p2 === 1 ? 1 : 0);
          if (A !== 1) continue;
          if (step === 0) {
            if (p2 * p4 * p6 !== 0) continue;
            if (p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0) continue;
            if (p2 * p6 * p8 !== 0) continue;
          }
          toRemove.push(idx(x, y));
        }
      }
      if (toRemove.length > 0) {
        for (const i of toRemove) bin[i] = 0;
        changed = true;
      }
    }
  }
}
