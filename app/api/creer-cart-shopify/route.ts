import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "yourmood.net";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const d = await r.json();
  return d.result || null;
}

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
}

type Demande = {
  prenom: string;
  email: string;
  tel?: string;
  message?: string;
  format: string;
  taille?: string;
  couleur: string;
  couleurNom: string;
  svg: string;
  nbElements?: number;
};

export async function POST(req: Request) {
  let data: Partial<Demande>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { prenom, email, format, couleur, couleurNom, taille, svg, tel, message, nbElements } = data;
  if (!prenom || !email || !format || !couleur || !svg) {
    return NextResponse.json({ error: "Champs requis manquants (prénom, email, format, couleur, design)" }, { status: 400 });
  }
  if (svg.length > 200_000) {
    return NextResponse.json({ error: "Design SVG trop volumineux" }, { status: 413 });
  }

  // Récupérer le mapping format/couleur → variant ID depuis Redis
  const variantsRaw = await redisGet("perso:shopify:variants");
  if (!variantsRaw) {
    return NextResponse.json({ error: "Produits Shopify non créés. L'équipe Mood doit aller sur /setup-perso." }, { status: 503 });
  }
  type VariantsMap = Record<string, { productId: number; handle: string; variants: Record<string, number> }>;
  const variantsMap: VariantsMap = JSON.parse(variantsRaw);
  const variantId = variantsMap[format]?.variants[couleur];
  if (!variantId) {
    return NextResponse.json({ error: `Variant introuvable pour format=${format}, couleur=${couleur}` }, { status: 400 });
  }

  // Stocker le SVG dans Redis avec un ID unique → URL publique
  const designId = `design_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await redisSet(`perso:design:${designId}`, svg);
  const designUrl = `https://mood-tools.yourmood.net/api/design/${designId}`;

  // Construire le permalink Shopify cart avec line item properties
  // Format : https://{shop}/cart/{variantId}:{quantity}?attributes[Key]=Value...
  // Note : pour line item properties, on utilise les "cart attributes" qui apparaissent sur la commande
  const props = new URLSearchParams();
  props.set("attributes[Format]", format);
  props.set("attributes[Couleur]", couleurNom || couleur);
  props.set("attributes[Taille]", taille || "");
  props.set("attributes[Prenom]", prenom);
  props.set("attributes[Email]", email);
  if (tel) props.set("attributes[Telephone]", tel);
  if (message) props.set("attributes[Message]", message.slice(0, 500));
  props.set("attributes[Design SVG]", designUrl);
  if (typeof nbElements === "number") props.set("attributes[Nb elements]", String(nbElements));

  const cartUrl = `https://${STORE_DOMAIN}/cart/${variantId}:1?${props.toString()}`;

  // Logger la demande aussi pour suivi (au cas où)
  const demande = {
    designId,
    date: new Date().toISOString(),
    prenom, email, tel, message,
    format, couleur, couleurNom, taille,
    nbElements,
    variantId,
    cartUrl,
  };
  await redisSet(`perso:cart:${designId}`, JSON.stringify(demande));

  return NextResponse.json({ ok: true, cartUrl, designId });
}
