import { NextResponse } from "next/server";
import { auth } from "@/auth";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const COULEURS = [
  { id: "noir", nom: "Noir" },
  { id: "rouge", nom: "Rouge" },
  { id: "bleu-marine", nom: "Bleu marine" },
  { id: "lilas-cashmere", nom: "Lilas cashmere" },
  { id: "belipastel", nom: "Belipastel" },
  { id: "rose-pastel", nom: "Rose pastel" },
  { id: "noisette", nom: "Noisette" },
  { id: "peche", nom: "Pêche" },
  { id: "abricot", nom: "Abricot" },
  { id: "jaune-pastel", nom: "Jaune pastel" },
  { id: "vert-pastel", nom: "Vert pastel" },
  { id: "bleu-pastel", nom: "Bleu pastel" },
];

const FORMATS = [
  { id: "medium", nom: "Medium", largeur_mm: 2.3, prix: 65 },
  { id: "2-3", nom: "Deux tiers", largeur_mm: 4.6, prix: 75 },
  { id: "addon", nom: "Addon", largeur_mm: 7, prix: 85 },
  { id: "open-mood", nom: "Open mood", largeur_mm: 10, prix: 109 },
];

async function shopifyPost(path: string, body: unknown) {
  const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}${path}`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Shopify ${r.status} on ${path}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  if (!STORE || !TOKEN) {
    return NextResponse.json({ error: "Shopify env non configuré" }, { status: 503 });
  }

  const resultats: Record<string, { productId: number; handle: string; variants: Record<string, number> }> = {};

  try {
    for (const fmt of FORMATS) {
      const variants = COULEURS.map((c) => ({
        option1: c.nom,
        price: fmt.prix.toFixed(2),
        sku: `perso-${fmt.id}-${c.id}`,
        // Pas d'inventory_management → vente illimitée (le stock est géré par Katana)
        requires_shipping: true,
        taxable: true,
      }));

      const body = {
        product: {
          title: `Bague personnalisée — ${fmt.nom}`,
          body_html: `<p>Bague aluminium ${fmt.nom} (${fmt.largeur_mm} mm) personnalisée avec votre design unique. Choisissez votre couleur, taille et créez votre gravure sur <a href="https://mood-tools.yourmood.net/creer">notre configurateur</a>.</p>`,
          vendor: "Mood Collection",
          product_type: "Bague personnalisée",
          tags: "personnalisation, perso, gravure, configurateur",
          status: "active",
          published_scope: "web",
          options: [{ name: "Couleur" }],
          variants,
        },
      };

      const created = await shopifyPost(`/products.json`, body);
      const product = created.product;
      const variantsMap: Record<string, number> = {};
      product.variants.forEach((v: { id: number; option1: string }) => {
        const couleur = COULEURS.find((c) => c.nom === v.option1);
        if (couleur) variantsMap[couleur.id] = v.id;
      });
      resultats[fmt.id] = {
        productId: product.id,
        handle: product.handle,
        variants: variantsMap,
      };
    }

    // Stocker dans Redis pour que /creer puisse récupérer les variant IDs
    await redisSet("perso:shopify:variants", JSON.stringify(resultats));

    return NextResponse.json({ ok: true, resultats });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  // Renvoie les variants déjà créés (depuis Redis) pour vérification
  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({ error: "Redis non configuré" }, { status: 503 });
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent("perso:shopify:variants")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const data = await r.json();
  return NextResponse.json({ resultats: data.result ? JSON.parse(data.result) : null });
}
