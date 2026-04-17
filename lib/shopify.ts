import type { ShopifyVariantInfo } from "./types";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

async function shopifyFetch(path: string) {
  const res = await fetch(
    `https://${STORE}/admin/api/${API_VERSION}${path}`,
    {
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Shopify ${res.status} on ${path}: ${text.slice(0, 200)}`);
  }

  return JSON.parse(text);
}

async function getVariantById(id: string): Promise<ShopifyVariantInfo> {
  const { variant: v } = await shopifyFetch(`/variants/${id}.json`);
  const { product: p } = await shopifyFetch(
    `/products/${v.product_id}.json?fields=id,title`
  );
  return {
    variantId: v.id,
    productId: v.product_id,
    productTitle: p.title,
    variantTitle: v.title,
    sku: v.sku ?? "",
  };
}

async function getProductById(id: string): Promise<ShopifyVariantInfo> {
  const { product: p } = await shopifyFetch(`/products/${id}.json`);
  const variants: Record<string, unknown>[] = p.variants ?? [];

  // Always use size 50 as the recipe reference — recipe is the same for all sizes
  const v =
    variants.find((v) => String(v.title) === "50") ??
    variants.find((v) => String(v.sku).endsWith("-50")) ??
    variants[0];

  return {
    variantId: (v?.id as number) ?? 0,
    productId: p.id,
    productTitle: p.title,
    variantTitle: (v?.title as string) ?? "",
    sku: (v?.sku as string) ?? "",
  };
}

export async function lookupShopifyId(id: string): Promise<ShopifyVariantInfo> {
  // Scanned ID is always a Shopify product ID (not a variant ID)
  return getProductById(id);
}

export async function lookupShopifyBySku(sku: string): Promise<ShopifyVariantInfo> {
  const query = `
    query($q: String!) {
      productVariants(first: 1, query: $q) {
        edges {
          node {
            id
            sku
            title
            product { id title }
          }
        }
      }
    }
  `;

  const res = await fetch(
    `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { q: `sku:${sku}` } }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify GraphQL ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json() as {
    data?: { productVariants?: { edges?: { node: { id: string; sku: string; title: string; product: { id: string; title: string } } }[] } };
  };

  const node = json.data?.productVariants?.edges?.[0]?.node;
  if (!node) throw new Error(`Aucune variante Shopify trouvée pour SKU: ${sku}`);

  return {
    variantId: parseInt(node.id.split("/").pop()!, 10),
    productId: parseInt(node.product.id.split("/").pop()!, 10),
    productTitle: node.product.title,
    variantTitle: node.title,
    sku: node.sku ?? sku,
  };
}

// ── Shopify GraphQL — add a tag to an order (non-destructive, merges with existing tags) ──

export async function addOrderTag(orderId: number, tag: string): Promise<void> {
  const gid = `gid://shopify/Order/${orderId}`;
  const query = `
    mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node { id }
        userErrors { field message }
      }
    }
  `;

  const res = await fetch(
    `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { id: gid, tags: [tag] } }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify GraphQL ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json() as { data?: { tagsAdd?: { userErrors?: { message: string }[] } } };
  const errors = json.data?.tagsAdd?.userErrors;
  if (errors?.length) {
    throw new Error(`Shopify tagsAdd: ${errors[0].message}`);
  }
}

// Returns a tag string like "Rupture 17.04.26 10:30"
export function makeOrderTag(reason: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${String(now.getFullYear()).slice(2)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `${reason} ${ts}`;
}

export async function getOrderById(id: string): Promise<import("./types").ShopifyOrder> {
  const { order: o } = await shopifyFetch(`/orders/${id}.json`);

  const customer = o.customer ?? {};
  const locale: string =
    (o.customer_locale as string | null)?.split("-")[0]?.toLowerCase() ?? "fr";

  return {
    id: o.id,
    name: o.name,
    customer: {
      id: customer.id ?? 0,
      firstName: customer.first_name ?? "",
      lastName: customer.last_name ?? "",
      email: o.email ?? customer.email ?? "",
      locale,
    },
    lineItems: (o.line_items ?? []).map((li: Record<string, unknown>) => ({
      id: li.id as number,
      productId: li.product_id as number,
      variantId: li.variant_id as number,
      title: li.title as string,
      sku: (li.sku as string) ?? "",
      quantity: li.quantity as number,
    })),
  };
}
