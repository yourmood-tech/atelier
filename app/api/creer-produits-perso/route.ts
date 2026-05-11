import { NextResponse } from "next/server";
import { auth } from "@/auth";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// 12 couleurs avec leur abréviation SKU unifiée (utilisée dans SKU Shopify et Katana pour les perso)
const COULEURS = [
  { id: "noir",           sku: "NOIR",     nom: "Noir" },
  { id: "rouge",          sku: "ROUGE",    nom: "Rouge" },
  { id: "bleu-marine",    sku: "MARINE",   nom: "Bleu marine" },
  { id: "lilas-cashmere", sku: "LILAS",    nom: "Lilas cashmere" },
  { id: "belipastel",     sku: "BELI",     nom: "Belipastel" },
  { id: "rose-pastel",    sku: "ROSEP",    nom: "Rose pastel" },
  { id: "noisette",       sku: "NOISETTE", nom: "Noisette" },
  { id: "peche",          sku: "PECHE",    nom: "Pêche" },
  { id: "abricot",        sku: "ABRICOT",  nom: "Abricot" },
  { id: "jaune-pastel",   sku: "JAUNEP",   nom: "Jaune pastel" },
  { id: "vert-pastel",    sku: "VERTP",    nom: "Vert pastel" },
  { id: "bleu-pastel",    sku: "BLEUP",    nom: "Bleu pastel" },
];

// 4 formats avec leur abréviation SKU
const FORMATS = [
  { id: "medium",    sku: "MED",   nom: "Medium",     largeur_mm: 2.3, prix: 65 },
  { id: "2-3",       sku: "23",    nom: "Deux tiers", largeur_mm: 4.6, prix: 75 },
  { id: "addon",     sku: "ADDON", nom: "Addon",      largeur_mm: 7,   prix: 85 },
  { id: "open-mood", sku: "OPEN",  nom: "Open mood",  largeur_mm: 10,  prix: 109 },
];

const TAILLES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];

// ============ Shopify helpers ============

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

async function publierSurOnlineStore(productGid: string) {
  const pubId = await getOnlineStorePublicationId();
  if (!pubId) throw new Error("Canal Online Store introuvable");
  const data = await shopifyGraphQL(`
    mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }
  `, {
    id: productGid,
    input: [{ publicationId: pubId }],
  });
  const errors = data.publishablePublish?.userErrors || [];
  if (errors.length > 0) throw new Error(`Publish failed: ${JSON.stringify(errors)}`);
}

// ============ Redis helpers ============

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

// ============ Création d'un produit avec 144 variants ============

async function createUnProduit(fmt: typeof FORMATS[number]) {
  // 1. Créer le produit avec ses options (Couleur + Taille)
  const createData = await shopifyGraphQL(`
    mutation productCreate($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product {
          id
          handle
          options { id name optionValues { id name } }
        }
        userErrors { field message }
      }
    }
  `, {
    product: {
      title: `Bague personnalisée — ${fmt.nom}`,
      descriptionHtml: `<p>Bague aluminium ${fmt.nom} (${fmt.largeur_mm} mm) personnalisée avec votre design unique. Crée ta bague sur <a href="https://mood-tools.yourmood.net/creer">notre configurateur</a>.</p>`,
      vendor: "Mood Collection",
      productType: "Bague personnalisée",
      tags: ["personnalisation", "perso", "gravure", "configurateur"],
      status: "ACTIVE",
      productOptions: [
        { name: "Couleur", values: COULEURS.map((c) => ({ name: c.nom })) },
        { name: "Taille",  values: TAILLES.map((t) => ({ name: String(t) })) },
      ],
    },
  });

  const errsCreate = createData.productCreate?.userErrors || [];
  if (errsCreate.length > 0) throw new Error(`productCreate ${fmt.id}: ${JSON.stringify(errsCreate)}`);
  const product = createData.productCreate.product;

  // 2. Préparer les 144 variants (12 couleurs × 12 tailles)
  const variantsInput = [];
  for (const couleur of COULEURS) {
    for (const taille of TAILLES) {
      variantsInput.push({
        price: fmt.prix.toFixed(2),
        inventoryItem: {
          sku: `${fmt.sku}-PERSO-${couleur.sku}-ALU-${taille}`,
          tracked: false, // Le stock est géré côté Katana, pas Shopify
        },
        optionValues: [
          { name: couleur.nom, optionName: "Couleur" },
          { name: String(taille), optionName: "Taille" },
        ],
        taxable: true,
      });
    }
  }

  // 3. Bulk create les 144 variants (limite Shopify : 250 par appel)
  const bulkData = await shopifyGraphQL(`
    mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {
      productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
        productVariants {
          id
          selectedOptions { name value }
        }
        userErrors { field message }
      }
    }
  `, {
    productId: product.id,
    variants: variantsInput,
    strategy: "REMOVE_STANDALONE_VARIANT", // supprime le variant par défaut créé automatiquement
  });

  const errsBulk = bulkData.productVariantsBulkCreate?.userErrors || [];
  if (errsBulk.length > 0) throw new Error(`bulkCreate ${fmt.id}: ${JSON.stringify(errsBulk)}`);

  // 4. Mapping variants : "couleurId-taille" → numericVariantId
  const variantsMap: Record<string, number> = {};
  type V = { id: string; selectedOptions: { name: string; value: string }[] };
  bulkData.productVariantsBulkCreate.productVariants.forEach((v: V) => {
    const couleurNom = v.selectedOptions.find((o) => o.name === "Couleur")?.value;
    const taille = v.selectedOptions.find((o) => o.name === "Taille")?.value;
    const couleur = COULEURS.find((c) => c.nom === couleurNom);
    if (couleur && taille) {
      const numericId = Number(v.id.split("/").pop());
      variantsMap[`${couleur.id}-${taille}`] = numericId;
    }
  });

  // 5. Publier sur Online Store
  await publierSurOnlineStore(product.id);

  return {
    productId: Number(product.id.split("/").pop()),
    productGid: product.id,
    handle: product.handle,
    variants: variantsMap,
  };
}

// ============ Endpoints ============

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (!STORE || !TOKEN) return NextResponse.json({ error: "Shopify env non configuré" }, { status: 503 });

  const resultats: Record<string, { productId: number; handle: string; variants: Record<string, number> }> = {};

  try {
    for (const fmt of FORMATS) {
      const r = await createUnProduit(fmt);
      resultats[fmt.id] = {
        productId: r.productId,
        handle: r.handle,
        variants: r.variants,
      };
    }
    await redisSet("perso:shopify:variants", JSON.stringify(resultats));
    return NextResponse.json({ ok: true, resultats });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message, resultatsPartiels: resultats }, { status: 500 });
  }
}

export async function PATCH() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const raw = await redisGet("perso:shopify:variants");
  if (!raw) return NextResponse.json({ error: "Aucun produit à republier" }, { status: 404 });
  type Map = Record<string, { productId: number; handle: string; variants: Record<string, number> }>;
  let mapping: Map;
  try { mapping = JSON.parse(raw); } catch { return NextResponse.json({ error: "Mapping corrompu" }, { status: 500 }); }

  const resultats: Record<string, { productId: number; published: boolean; error?: string }> = {};
  for (const [fmtId, info] of Object.entries(mapping)) {
    try {
      await publierSurOnlineStore(`gid://shopify/Product/${info.productId}`);
      resultats[fmtId] = { productId: info.productId, published: true };
    } catch (e: unknown) {
      resultats[fmtId] = { productId: info.productId, published: false, error: (e as Error).message };
    }
  }
  return NextResponse.json({ ok: true, resultats });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const raw = await redisGet("perso:shopify:variants");
  let resultats = null;
  if (raw) {
    try { resultats = JSON.parse(raw); } catch { resultats = null; }
  }
  return NextResponse.json({ resultats });
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
