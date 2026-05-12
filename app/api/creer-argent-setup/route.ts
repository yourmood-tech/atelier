import { NextResponse } from "next/server";
import { auth } from "@/auth";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function shopifyREST(path: string, method: "POST" | "GET" = "GET", body?: unknown) {
  const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}${path}`, {
    method,
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Shopify ${r.status} on ${path}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function shopifyGraphQL(query: string, variables?: Record<string, unknown>) {
  const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const data = await r.json();
  if (data.errors) throw new Error(`Shopify GraphQL: ${JSON.stringify(data.errors).slice(0, 500)}`);
  return data.data;
}

async function getOnlineStorePublicationId() {
  const data = await shopifyGraphQL(`{ publications(first: 20) { edges { node { id name } } } }`);
  type Pub = { node: { id: string; name: string } };
  const pub = data.publications.edges.find((e: Pub) => e.node.name === "Online Store");
  return pub?.node?.id || null;
}

async function publierSurOnlineStore(productId: number) {
  const pubId = await getOnlineStorePublicationId();
  if (!pubId) throw new Error("Canal Online Store introuvable");
  const data = await shopifyGraphQL(`
    mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) { userErrors { field message } }
    }
  `, { id: `gid://shopify/Product/${productId}`, input: [{ publicationId: pubId }] });
  const errors = data.publishablePublish?.userErrors || [];
  if (errors.length > 0) throw new Error(`Publish failed: ${JSON.stringify(errors)}`);
}

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
}

async function redisGet(key: string): Promise<string | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const d = await r.json();
  return d.result || null;
}

// POST — Crée le produit "Bague personnalisée argent" sur Shopify (1 variant générique)
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (!STORE || !TOKEN) return NextResponse.json({ error: "Shopify env non configuré" }, { status: 503 });

  try {
    const created = await shopifyREST(`/products.json`, "POST", {
      product: {
        title: "Bague personnalisée argent",
        body_html: `<p>Bague en argent 925 personnalisée — gravée et sertie sur mesure dans nos ateliers suisses.</p>
        <p>Configure ta bague unique sur <a href="https://mood-tools.yourmood.net/creer-argent">notre configurateur</a> : 3 formats (Medium / Deux tiers / Addon), 4 finitions (Poli / Brossé / Neutre / Piqueté), gravure mécanique oxydée ou neutre, sertissage de pierres précieuses au choix (diamants, saphirs, émeraudes, rubis, topazes, améthystes, grenats).</p>
        <p>Prix dynamique selon ta création — sertissage et gravure inclus.</p>`,
        vendor: "Mood Collection",
        product_type: "Bague personnalisée argent",
        tags: "personnalisation, perso, argent, sertissage, gravure mécanique, configurateur",
        status: "active",
        published_scope: "web",
        variants: [{
          sku: "BAGUE-PERSO-ARGENT",
          price: "179.00",
          requires_shipping: true,
          taxable: true,
          inventory_management: null, // pas de tracking stock (matière premières trackées dans Katana)
        }],
      },
    });
    const product = created.product;
    const productId: number = product.id;
    const productHandle: string = product.handle;
    const variantId: number = product.variants[0].id;

    await publierSurOnlineStore(productId);

    // Stocker le variant_id dans Redis (fallback si ENV non défini)
    await redisSet("perso:argent:variant_id", String(variantId));
    await redisSet("perso:argent:product_id", String(productId));
    await redisSet("perso:argent:handle", productHandle);

    return NextResponse.json({
      ok: true,
      productId,
      variantId,
      handle: productHandle,
      message: `Produit créé. Variant ID : ${variantId}. Stocké dans Redis (utilisé en fallback si SHOPIFY_ARGENT_VARIANT_ID non défini dans Vercel ENV).`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// GET — Retourne la config actuelle depuis Redis
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const variantId = await redisGet("perso:argent:variant_id");
  const productId = await redisGet("perso:argent:product_id");
  const handle = await redisGet("perso:argent:handle");
  return NextResponse.json({
    config: variantId ? { variantId, productId, handle } : null,
    envConfigured: !!process.env.SHOPIFY_ARGENT_VARIANT_ID,
  });
}

// DELETE — Efface la config Redis (pour repartir de zéro si besoin)
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  await redisSet("perso:argent:variant_id", "");
  await redisSet("perso:argent:product_id", "");
  await redisSet("perso:argent:handle", "");
  return NextResponse.json({ ok: true });
}
