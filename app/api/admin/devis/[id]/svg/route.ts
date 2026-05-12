import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
}

function extractDesignId(url: string): { designId: string; type: "alu" | "argent" } | null {
  const aluMatch = url.match(/\/api\/design\/(design_[^/?]+)/);
  if (aluMatch) return { designId: aluMatch[1], type: "alu" };
  const argentMatch = url.match(/\/api\/design-argent\/(argent_[^/?]+)/);
  if (argentMatch) return { designId: argentMatch[1], type: "argent" };
  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Lire le SVG depuis le body (text/plain ou multipart)
  const contentType = req.headers.get("content-type") || "";
  let svgContent = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("svg") as File | null;
    if (!file) return NextResponse.json({ error: "Fichier SVG manquant" }, { status: 400 });
    svgContent = await file.text();
  } else {
    svgContent = await req.text();
  }

  if (!svgContent || !svgContent.includes("<svg")) {
    return NextResponse.json({ error: "Contenu SVG invalide" }, { status: 400 });
  }
  if (svgContent.length > 500_000) {
    return NextResponse.json({ error: "SVG trop volumineux (max 500KB)" }, { status: 413 });
  }

  try {
    // Récupérer le draft pour trouver l'URL du design existant
    const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      headers: { "X-Shopify-Access-Token": TOKEN },
    });
    const { draft_order } = await r.json();
    const props: Array<{ name: string; value: string }> = draft_order.line_items?.[0]?.properties ?? [];
    const designUrlProp = props.find((p) => p.name === "Design SVG" || p.name === "SVG Gravure" || p.name === "SVG Complet");

    if (!designUrlProp) {
      return NextResponse.json({ error: "Propriété Design SVG introuvable dans le draft" }, { status: 404 });
    }

    const meta = extractDesignId(designUrlProp.value);
    if (!meta) {
      return NextResponse.json({ error: "Design ID introuvable dans l'URL" }, { status: 404 });
    }

    // Remplacer le SVG dans Redis (l'URL reste la même)
    if (meta.type === "alu") {
      await redisSet(`perso:design:${meta.designId}`, svgContent);
    } else {
      // Argent : remplacer complet + gravure (plan sertissage conservé)
      await Promise.all([
        redisSet(`perso:argent:design:${meta.designId}:complet`, svgContent),
        redisSet(`perso:argent:design:${meta.designId}:gravure`, svgContent),
      ]);
    }

    return NextResponse.json({ ok: true, designId: meta.designId, type: meta.type });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
