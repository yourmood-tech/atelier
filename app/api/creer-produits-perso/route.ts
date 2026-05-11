import { NextResponse } from "next/server";
import { auth } from "@/auth";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// ============ Référentiels ============

const TAILLES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];

const COULEURS = [
  { id: "noir",           nom: "Noir",           sku: "NOIR"     },
  { id: "rouge",          nom: "Rouge",          sku: "ROUGE"    },
  { id: "bleu-marine",    nom: "Bleu marine",    sku: "MARINE"   },
  { id: "lilas-cashmere", nom: "Lilas cashmere", sku: "LILAS"    },
  { id: "belipastel",     nom: "Belipastel",     sku: "BELI"     },
  { id: "rose-pastel",    nom: "Rose pastel",    sku: "ROSEP"    },
  { id: "noisette",       nom: "Noisette",       sku: "NOISETTE" },
  { id: "peche",          nom: "Pêche",          sku: "PECHE"    },
  { id: "abricot",        nom: "Abricot",        sku: "ABRICOT"  },
  { id: "jaune-pastel",   nom: "Jaune pastel",   sku: "JAUNEP"   },
  { id: "vert-pastel",    nom: "Vert pastel",    sku: "VERTP"    },
  { id: "bleu-pastel",    nom: "Bleu pastel",    sku: "BLEUP"    },
];

const FORMATS = [
  { id: "addon",     nom: "Addon",      sku: "ADDON", prix: 85  },
  { id: "2-3",       nom: "Deux tiers", sku: "23",    prix: 75  },
  { id: "medium",    nom: "Medium",     sku: "MED",   prix: 65  },
  { id: "open-mood", nom: "Open mood",  sku: "OPEN",  prix: 109 },
];

// ============ Shopify helpers ============

async function shopifyREST(path: string, method: "POST" | "PUT" | "GET" = "GET", body?: unknown) {
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

let onlineStorePublicationId: string | null = null;
async function getOnlineStorePublicationId() {
  if (onlineStorePublicationId) return onlineStorePublicationId;
  const data = await shopifyGraphQL(`{ publications(first: 20) { edges { node { id name } } } }`);
  type Pub = { node: { id: string; name: string } };
  const pub = data.publications.edges.find((e: Pub) => e.node.name === "Online Store");
  onlineStorePublicationId = pub?.node?.id || null;
  return onlineStorePublicationId;
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

// ============ Types ============

type FormatConfig = { productId: number; handle: string; variants: Record<string, number> };
type FullConfig = Record<string, FormatConfig>;

// ============ Endpoints ============

// POST — Crée 4 produits Shopify (un par format), chacun avec 144 variants (12 tailles × 12 couleurs)
// SKU par variant : PERSO-{FORMAT}-{TAILLE}-{COULEUR} — ex: PERSO-ADDON-56-ROUGE
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (!STORE || !TOKEN) return NextResponse.json({ error: "Shopify env non configuré" }, { status: 503 });

  const resultats: FullConfig = {};

  try {
    for (const fmt of FORMATS) {
      // 1. Créer le produit via REST avec 2 options + 1er variant
      const allCombinations = TAILLES.flatMap((t) =>
        COULEURS.map((c) => ({
          taille: String(t),
          couleurId: c.id,
          couleurNom: c.nom,
          sku: `PERSO-${fmt.sku}-${t}-${c.sku}`,
        }))
      );
      const [first, ...rest] = allCombinations;

      const created = await shopifyREST(`/products.json`, "POST", {
        product: {
          title: `Bague personnalisée — ${fmt.nom}`,
          vendor: "Mood Collection",
          product_type: "Bague personnalisée",
          tags: "personnalisation, perso, gravure, configurateur",
          status: "active",
          published_scope: "web",
          options: [{ name: "Taille" }, { name: "Couleur" }],
          variants: [{
            option1: first.taille,
            option2: first.couleurNom,
            price: String(fmt.prix),
            sku: first.sku,
            requires_shipping: true,
            taxable: true,
          }],
        },
      });

      const product = created.product;
      const productId: number = product.id;
      const productHandle: string = product.handle;
      const productGid = `gid://shopify/Product/${productId}`;
      const firstVariantId: number = product.variants[0].id;

      const variantsByKey: Record<string, number> = {
        [`${first.taille}-${first.couleurId}`]: firstVariantId,
      };

      // 2. Bulk-créer les 143 variants restants via GraphQL (2 batchs de ~72)
      const BATCH_SIZE = 72;
      for (let i = 0; i < rest.length; i += BATCH_SIZE) {
        const batch = rest.slice(i, i + BATCH_SIZE);
        const variantsInput = batch.map((v) => ({
          price: String(fmt.prix),
          sku: v.sku,
          requiresShipping: true,
          taxable: true,
          optionValues: [
            { optionName: "Taille", name: v.taille },
            { optionName: "Couleur", name: v.couleurNom },
          ],
        }));

        const bulkData = await shopifyGraphQL(`
          mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkCreate(productId: $productId, variants: $variants) {
              productVariants { id sku selectedOptions { name value } }
              userErrors { field message }
            }
          }
        `, { productId: productGid, variants: variantsInput });

        const bulkErrors = bulkData.productVariantsBulkCreate?.userErrors || [];
        if (bulkErrors.length > 0) throw new Error(`bulkCreate failed (format ${fmt.id}, batch ${i}): ${JSON.stringify(bulkErrors)}`);

        for (const v of bulkData.productVariantsBulkCreate.productVariants as Array<{ id: string; selectedOptions: { name: string; value: string }[] }>) {
          const taille = v.selectedOptions.find((o) => o.name === "Taille")?.value;
          const couleurNom = v.selectedOptions.find((o) => o.name === "Couleur")?.value;
          const couleur = COULEURS.find((c) => c.nom === couleurNom);
          if (taille && couleur) {
            variantsByKey[`${taille}-${couleur.id}`] = parseInt(v.id.split("/").pop()!);
          }
        }
      }

      await publierSurOnlineStore(productId);
      resultats[fmt.id] = { productId, handle: productHandle, variants: variantsByKey };
    }

    await redisSet("perso:shopify:variants", JSON.stringify(resultats));
    return NextResponse.json({ ok: true, resultats });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// GET — Retourne la config actuelle depuis Redis
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const raw = await redisGet("perso:shopify:variants");
  let config: FullConfig | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Détecter l'ancien format (productId à la racine = config mono-produit)
      if (parsed && typeof parsed === "object" && !parsed.addon && !parsed["2-3"] && !parsed.medium && !parsed["open-mood"]) {
        config = null; // ancien format → on repart de zéro
      } else {
        config = parsed as FullConfig;
      }
    } catch { config = null; }
  }
  return NextResponse.json({ config });
}

// DELETE — Efface le mapping Redis
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  await redisSet("perso:shopify:variants", "");
  return NextResponse.json({ ok: true });
}
