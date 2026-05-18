import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Déroulement polaire d'une bague 3D :
 * 1. Détecte la bbox du contenu (non-blanc) dans le rendu IA
 * 2. Estime le centre + demi-axes de l'ellipse externe (horizontale) et interne (trou de la bague)
 * 3. Projection polaire → cartésienne : la bague 3D devient une bande horizontale plate
 * 4. Retourne l'image rectangulaire de la bague dépliée
 *
 * Aucune IA dans le pipeline. Pixel-fidèle.
 * Échec attendu si : background non blanc, bague non centrée, ratio atypique.
 */
export async function POST(req: Request) {
  let body: { image?: string; bgThreshold?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { image, bgThreshold = 230 } = body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante ou invalide" }, { status: 400 });
  }
  const m = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Format image invalide" }, { status: 400 });
  const buffer = Buffer.from(m[2], "base64");

  try {
    // Décompresser en RGBA raw
    const { data: rgba, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width;
    const H = info.height;
    const channels = info.channels;
    if (channels < 3) {
      return NextResponse.json({ error: "Image en niveaux de gris non supportée" }, { status: 400 });
    }

    // Luminance d'un pixel
    const lum = (i: number) => 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];

    // 1. Bounding box du contenu non-blanc
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * channels;
        if (lum(i) < bgThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0 || maxX - minX < 50 || maxY - minY < 50) {
      return NextResponse.json({ error: "Impossible de détecter la bague (background non blanc ou bague trop petite)" }, { status: 422 });
    }

    // Centre + demi-axes de l'ellipse externe
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const aOut = (maxX - minX) / 2; // demi-grand axe horizontal
    const bOut = (maxY - minY) / 2; // demi-petit axe vertical

    // 2. Détection du trou interne — scan multi-rays depuis le centre pour trouver le rayon interne moyen
    // On scanne dans 8 directions cardinales et on prend la médiane
    const scanRayInner = (dx: number, dy: number): number => {
      // Avance depuis cx,cy dans direction (dx,dy) jusqu'à toucher un pixel non-blanc
      const maxR = Math.min(aOut, bOut);
      for (let r = 2; r < maxR; r++) {
        const sx = Math.round(cx + dx * r);
        const sy = Math.round(cy + dy * r);
        if (sx < 0 || sx >= W || sy < 0 || sy >= H) return r;
        const i = (sy * W + sx) * channels;
        if (lum(i) < bgThreshold) return r;
      }
      return maxR;
    };
    const innerRadii = [
      scanRayInner(1, 0), scanRayInner(-1, 0),
      scanRayInner(0, 1), scanRayInner(0, -1),
      scanRayInner(0.707, 0.707), scanRayInner(-0.707, 0.707),
      scanRayInner(0.707, -0.707), scanRayInner(-0.707, -0.707),
    ].sort((p, q) => p - q);
    // Médiane des 4 plus petits (le trou est typiquement plus petit que les axes externes)
    const rInnerMedian = innerRadii[3];
    // Si trou trop petit → bague pleine, fallback : on prend 60% du rayon externe
    const aIn = rInnerMedian > 10 ? rInnerMedian * (aOut / Math.min(aOut, bOut)) : aOut * 0.5;
    const bIn = rInnerMedian > 10 ? rInnerMedian * (bOut / Math.min(aOut, bOut)) : bOut * 0.5;
    const hadInnerHole = rInnerMedian > 10;

    // 3. Projection polaire → cartésienne (180° SEULEMENT — moitié visible de la bague)
    // Épaisseur de la bague (moyenne entre les 2 axes)
    const thickness = ((aOut - aIn) + (bOut - bIn)) / 2;
    // Rayon moyen pour la circonférence (formule simple de Ramanujan)
    const aMid = (aOut + aIn) / 2;
    const bMid = (bOut + bIn) / 2;
    const fullCircumference = Math.PI * (3 * (aMid + bMid) - Math.sqrt((3 * aMid + bMid) * (aMid + 3 * bMid)));
    // On ne déroule que 180° (la moitié visible) — l'arrière n'est pas dans la photo
    const halfCircumference = fullCircumference / 2;

    // Dimensions de sortie (avec un peu de margin)
    const OUT_W = Math.max(200, Math.round(halfCircumference));
    const OUT_H = Math.max(50, Math.round(thickness * 1.1));

    // Buffer RGBA de sortie
    const out = new Uint8ClampedArray(OUT_W * OUT_H * 4);

    // On déroule la MOITIÉ SUPÉRIEURE du cercle (où la face visible se trouve typiquement)
    // theta varie de -π (côté gauche) à 0 (côté droit), en passant par -π/2 (haut)
    const THETA_START = -Math.PI;
    const THETA_RANGE = Math.PI; // 180° seulement

    for (let py = 0; py < OUT_H; py++) {
      // t = 0 (bord externe) → 1 (bord interne)
      const t = py / (OUT_H - 1);
      const ra = aOut - t * (aOut - aIn);
      const rb = bOut - t * (bOut - bIn);
      for (let px = 0; px < OUT_W; px++) {
        const theta = THETA_START + (px / OUT_W) * THETA_RANGE;
        const sx = cx + ra * Math.cos(theta);
        const sy = cy + rb * Math.sin(theta);
        const dstIdx = (py * OUT_W + px) * 4;
        if (sx < 0 || sx >= W - 1 || sy < 0 || sy >= H - 1) {
          out[dstIdx] = 255; out[dstIdx + 1] = 255; out[dstIdx + 2] = 255; out[dstIdx + 3] = 255;
          continue;
        }
        // Bilinéaire
        const x0 = Math.floor(sx), x1 = x0 + 1;
        const y0 = Math.floor(sy), y1 = y0 + 1;
        const fx = sx - x0;
        const fy = sy - y0;
        const wx0 = 1 - fx, wx1 = fx;
        const wy0 = 1 - fy, wy1 = fy;
        for (let c = 0; c < 3; c++) {
          const v00 = rgba[(y0 * W + x0) * channels + c];
          const v01 = rgba[(y0 * W + x1) * channels + c];
          const v10 = rgba[(y1 * W + x0) * channels + c];
          const v11 = rgba[(y1 * W + x1) * channels + c];
          out[dstIdx + c] = wx0 * (wy0 * v00 + wy1 * v10) + wx1 * (wy0 * v01 + wy1 * v11);
        }
        out[dstIdx + 3] = 255;
      }
    }

    // 4. Réencoder en PNG
    const png = await sharp(Buffer.from(out.buffer, out.byteOffset, out.byteLength), {
      raw: { width: OUT_W, height: OUT_H, channels: 4 },
    }).png().toBuffer();

    return NextResponse.json({
      image: `data:image/png;base64,${png.toString("base64")}`,
      detection: {
        cx: Math.round(cx), cy: Math.round(cy),
        aOut: Math.round(aOut), bOut: Math.round(bOut),
        aIn: Math.round(aIn), bIn: Math.round(bIn),
        hadInnerHole,
        outW: OUT_W, outH: OUT_H,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
