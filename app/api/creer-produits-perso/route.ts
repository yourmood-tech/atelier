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

async function shopifyGraphQL(query: string, variables?: Record<string, unknown>) {
  const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const data = await r.json();
  if (data.errors) throw new Error(`Shopify GraphQL: ${JSON.stringify(data.errors).slice(0, 300)}`);
  return data.data;
}

// Cache l'ID du canal Online Store
let onlineStorePublicationId: string | null = null;
async function getOnlineStorePublicationId() {
  if (onlineStorePublicationId) return onlineStorePublicationId;
  const data = await shopifyGraphQL(`{ publications(first: 20) { edges { node { id name } } } }`);
  type Pub = { node: { id: string; name: string } };
  const onlineStore = data.publications.edges.find((e: Pub) => e.node.name === "Online Store");
  onlineStorePublicationId = onlineStore?.node?.id || null;
  return onlineStorePublicationId;
}

async function publierSurOnlineStore(productId: number) {
  const pubId = await getOnlineStorePublicationId();
  if (!pubId) throw new Error("Canal Online Store introuvable");
  const mutation = `mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }`;
  const data = await shopifyGraphQL(mutation, {
    id: `gid://shopify/Product/${productId}`,
    input: [{ publicationId: pubId }],
  });
  const errors = data.publishablePublish?.userErrors || [];
  if (errors.length > 0) throw new Error(`Publish failed: ${JSON.stringify(errors)}`);
}

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  // Body raw : Upstash stocke la value telle quelle (pas de double-encoding JSON)
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
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
      // Publier sur le canal Online Store (sinon les permalinks cart renvoient 404)
      await publierSurOnlineStore(product.id);
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

  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({ error: "Redis non configuré" }, { status: 503 });
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent("perso:shopify:variants")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const data = await r.json();
  let resultats = null;
  if (data.result) {
    try { resultats = JSON.parse(data.result); } catch { resultats = null; }
  }
  return NextResponse.json({ resultats });
}

// Republier les produits déjà créés sur le canal Online Store (fix pour produits créés sans publishablePublish)
export async function PATCH() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({ error: "Redis non configuré" }, { status: 503 });

  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent("perso:shopify:variants")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const d = await r.json();
  if (!d.result) return NextResponse.json({ error: "Aucun produit à republier (mapping vide)" }, { status: 404 });
  type VariantsMap = Record<string, { productId: number; handle: string; variants: Record<string, number> }>;
  let mapping: VariantsMap;
  try { mapping = JSON.parse(d.result); } catch { return NextResponse.json({ error: "Mapping corrompu" }, { status: 500 }); }

  const resultats: Record<string, { productId: number; published: boolean; error?: string }> = {};
  for (const [fmtId, info] of Object.entries(mapping)) {
    try {
      await publierSurOnlineStore(info.productId);
      resultats[fmtId] = { productId: info.productId, published: true };
    } catch (e: unknown) {
      resultats[fmtId] = { productId: info.productId, published: false, error: (e as Error).message };
    }
  }
  return NextResponse.json({ ok: true, resultats });
}

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({ error: "Redis non configuré" }, { status: 503 });
  await fetch(`${REDIS_URL}/del/${encodeURIComponent("perso:shopify:variants")}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  return NextResponse.json({ ok: true });
}
