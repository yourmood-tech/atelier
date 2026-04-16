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
  const v = p.variants?.[0];
  return {
    variantId: v?.id ?? 0,
    productId: p.id,
    productTitle: p.title,
    variantTitle: v?.title ?? "",
    sku: v?.sku ?? "",
  };
}

export async function lookupShopifyId(id: string): Promise<ShopifyVariantInfo> {
  try {
    return await getVariantById(id);
  } catch {
    return await getProductById(id);
  }
}
