import { NextResponse } from "next/server";
import { auth } from "@/auth";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// ============ Shopify helpers ============

async function shopifyREST(path: string, method: "POST" | "PUT" | "GET" = "GET", body?: unknown) {
  const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}${path}`, {
    method,
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
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
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const data = await r.json();
  if (data.errors) throw new Error(`Shopify GraphQL: ${JSON.stringify(data.errors).slice(0, 500)}`);
  return data.data;
}

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
  const data = await shopifyGraphQL(`
    mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }
  `, {
    id: `gid://shopify/Product/${productId}`,
    input: [{ publicationId: pubId }],
  });
  const errors = data.publishablePublish?.userErrors || [];
  if (errors.length > 0) throw new Error(`Publish failed: ${JSON.stringify(errors)}`);
}

// ============ Redis ============

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

// ============ Endpoints ============

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (!STORE || !TOKEN) return NextResponse.json({ error: "Shopify env non configuré" }, { status: 503 });

  const TAILLES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];

  try {
    const created = await shopifyREST(`/products.json`, "POST", {
      product: {
        title: "Bague personnalisée",
        body_html: `<p>Crée ta bague unique avec ton design personnalisé : empreintes, dessins, symboles, textes gravés au laser sur l'aluminium de ton choix.</p>
<p><strong>4 formats disponibles</strong> : Medium (2.3 mm) · Deux tiers (4.6 mm) · Addon (7 mm) · Open mood (10 mm)</p>
<p><strong>12 couleurs d'aluminium</strong> · 12 tailles de bague · gravure à vie</p>
<p style="margin-top:20px"><a href="https://mood-tools.yourmood.net/creer" style="display:inline-block;background:#c9a96e;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">✨ Configurer ma bague →</a></p>`,
        vendor: "Mood Collection",
        product_type: "Bague personnalisée",
        tags: "personnalisation, perso, gravure, configurateur",
        status: "active",
        published_scope: "web",
        options: [{ name: "Taille" }],
        variants: TAILLES.map((t) => ({
          option1: String(t),
          price: "65.00",
          sku: `BAGUE-PERSO-${t}`,
          requires_shipping: true,
          taxable: true,
        })),
      },
    });

    const product = created.product;
    const variantsByTaille: Record<string, number> = {};
    for (const v of product.variants as Array<{ id: number; option1: string }>) {
      variantsByTaille[v.option1] = v.id;
    }

    await publierSurOnlineStore(product.id);

    const config = {
      productId: product.id,
      handle: product.handle,
      variants: variantsByTaille,
    };

    await redisSet("perso:shopify:variants", JSON.stringify(config));
    return NextResponse.json({ ok: true, config });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const raw = await redisGet("perso:shopify:variants");
  if (!raw) return NextResponse.json({ error: "Aucun produit trouvé — lance POST d'abord" }, { status: 404 });
  let config: { productId: number; handle: string };
  try { config = JSON.parse(raw); } catch { return NextResponse.json({ error: "Config corrompue" }, { status: 500 }); }

  const TAILLES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];
  const pid = config.productId;

  try {
    // 1. Récupérer le produit (option ID + premier variant ID)
    const product = (await shopifyREST(`/products/${pid}.json?fields=id,options,variants`)).product;
    const option = product.options?.[0];
    const firstVariant = product.variants?.[0];
    if (!option || !firstVariant) throw new Error("Structure produit inattendue");

    // 2. Renommer l'option en "Taille"
    await shopifyREST(`/products/${pid}.json`, "PUT", {
      product: { id: pid, options: [{ id: option.id, name: "Taille" }] },
    });

    // 3. Mettre à jour le premier variant → taille 48, SKU vide pour saisie manuelle
    await shopifyREST(`/products/${pid}/variants/${firstVariant.id}.json`, "PUT", {
      variant: { id: firstVariant.id, option1: "50", sku: ""},
    });
    const variantsByTaille: Record<string, number> = { "50": firstVariant.id };

    // 4. Créer les 11 variants restants (50→70) — SKU vide, à remplir manuellement dans Shopify
    for (const t of TAILLES.slice(1)) {
      const created = await shopifyREST(`/products/${pid}/variants.json`, "POST", {
        variant: { option1: String(t), price: "65.00", requires_shipping: true, taxable: true },
      });
      variantsByTaille[String(t)] = created.variant.id;
    }

    // 5. Republier sur Online Store
    await publierSurOnlineStore(pid);

    // 6. Mettre à jour Redis
    const newConfig = { productId: pid, handle: config.handle, variants: variantsByTaille };
    await redisSet("perso:shopify:variants", JSON.stringify(newConfig));

    return NextResponse.json({ ok: true, config: newConfig });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const raw = await redisGet("perso:shopify:variants");
  let config = null;
  if (raw) {
    try { config = JSON.parse(raw); } catch { config = null; }
  }
  return NextResponse.json({ config });
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
