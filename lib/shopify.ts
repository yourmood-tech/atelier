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
