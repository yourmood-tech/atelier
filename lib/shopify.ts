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

async function shopifyPut(path: string, body: unknown) {
  const res = await fetch(
    `https://${STORE}/admin/api/${API_VERSION}${path}`,
    {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Shopify ${res.status} on ${path}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

async function shopifyPost(path: string, body: unknown) {
  const res = await fetch(
    `https://${STORE}/admin/api/${API_VERSION}${path}`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Shopify ${res.status} on ${path}: ${text.slice(0, 300)}`);
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

// ── Shopify REST — look up an order by name ──────────────────────────────────

export async function lookupOrderByName(name: string): Promise<{ id: number; name: string }> {
  const orderName = name.startsWith("#") ? name : `#${name}`;
  const data = await shopifyFetch(
    `/orders.json?name=${encodeURIComponent(orderName)}&status=any&limit=1&fields=id,name`
  );
  const order = (data.orders as { id: number; name: string }[] | undefined)?.[0];
  if (!order) throw new Error(`Commande introuvable: ${orderName}`);
  return { id: order.id, name: order.name };
}

// ── Shopify REST — add a tag to an order (non-destructive, merges with existing tags) ──

export async function addOrderTag(orderId: number, tag: string): Promise<void> {
  const current = await shopifyFetch(`/orders/${orderId}.json?fields=id,tags`);
  const existing: string[] = (current.order.tags as string)
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  if (existing.includes(tag)) return;
  const newTags = [...existing, tag].join(", ");
  console.log(`[addOrderTag] orderId=${orderId} existingCount=${existing.length} existingLen=${current.order.tags.length} newLen=${newTags.length} tag="${tag}"`);
  await shopifyPut(`/orders/${orderId}.json`, { order: { id: orderId, tags: newTags } });
}

export async function removeOrderTagsBySkuKey(orderId: number, skuKey: string): Promise<void> {
  const current = await shopifyFetch(`/orders/${orderId}.json?fields=id,tags`);
  const existing: string[] = (current.order.tags as string)
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  const newTags = existing.filter(t => !(t.startsWith("prod-ok-") && t.endsWith(`-${skuKey}`)));
  if (newTags.length === existing.length) return;
  await shopifyPut(`/orders/${orderId}.json`, { order: { id: orderId, tags: newTags.join(", ") } });
}

export async function setOrderCoffretCountTag(orderId: number, skuPart: string, count: number): Promise<void> {
  const current = await shopifyFetch(`/orders/${orderId}.json?fields=id,tags`);
  const existing: string[] = (current.order.tags as string)
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  const prefix = `coffret-count-${skuPart}-`;
  const filtered = existing.filter(t => !t.startsWith(prefix));
  const newTags = [...filtered, `${prefix}${count}`].join(", ");
  await shopifyPut(`/orders/${orderId}.json`, { order: { id: orderId, tags: newTags } });
}

// Replace Icelea-PO and Icelea-livraison tags in one read+write (removes previous PO tags if any)
export async function setIceleaTags(orderId: number, poNumber: string, deliveryFormatted: string): Promise<void> {
  const current = await shopifyFetch(`/orders/${orderId}.json?fields=id,tags`);
  const existing: string[] = (current.order.tags as string)
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  const filtered = existing.filter(t => !t.startsWith("Icelea-PO:") && !t.startsWith("Icelea-livraison:"));
  const newTags = [...filtered, `Icelea-PO:${poNumber}`, `Icelea-livraison:${deliveryFormatted}`].join(", ");
  await shopifyPut(`/orders/${orderId}.json`, { order: { id: orderId, tags: newTags } });
}

// Returns a tag string like "Rupture 17.04.26 10:30"
export function makeOrderTag(reason: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(2)}-${pad(now.getHours())}h${pad(now.getMinutes())}`;
  const safeReason = reason.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${safeReason}-${ts}`;
}

// Map billing/shipping country code → language when customer_locale is absent
const COUNTRY_TO_LOCALE: Record<string, string> = {
  DE: "de", AT: "de",           // German-speaking
  FR: "fr", BE: "fr", LU: "fr", // CH omitted — multilingual, customer_locale is the only reliable source
  IT: "it",
  ES: "es",
  NL: "nl",
  PT: "pt",
  GB: "en", US: "en", CA: "en", AU: "en", IE: "en",
};

export async function getOrderById(id: string): Promise<import("./types").ShopifyOrder> {
  // Shopify internal IDs are 10+ digits. Shorter values are order names (#392523 → "392523").
  const isInternalId = /^\d{10,}$/.test(id.trim());
  let o: Record<string, unknown>;
  if (isInternalId) {
    ({ order: o } = await shopifyFetch(`/orders/${id}.json`));
  } else {
    const name = id.startsWith("#") ? id : `#${id}`;
    const { orders } = await shopifyFetch(`/orders.json?name=${encodeURIComponent(name)}&status=any&limit=1`);
    if (!orders?.length) throw new Error(`Commande introuvable: ${name}`);
    o = orders[0] as Record<string, unknown>;
  }

  const customer = (o.customer ?? {}) as Record<string, unknown>;

  // order.customer_locale — storefront language at order time (fallback only)
  const fromOrderLocale = (o.customer_locale as string | null)?.split("-")[0]?.toLowerCase();

  // billing address country → locale (last resort)
  const billingCountry = ((o.billing_address as Record<string, unknown> | null)?.country_code as string | null)?.toUpperCase();
  const fromCountry = billingCountry ? COUNTRY_TO_LOCALE[billingCountry] : undefined;

  // customer.locale — "Will receive notifications in X" — ALWAYS fetched, takes priority over order locale
  let fromCustomer: string | undefined;
  if (customer.id) {
    try {
      const { customer: fullCustomer } = await shopifyFetch(`/customers/${customer.id}.json?fields=id,locale`);
      fromCustomer = (fullCustomer?.locale as string | null)?.split("-")[0]?.toLowerCase() || undefined;
    } catch {
      // non-blocking
    }
  }

  const locale: string = fromCustomer ?? fromOrderLocale ?? fromCountry ?? "fr";

  return {
    id: o.id as number,
    name: o.name as string,
    createdAt: (o.created_at as string) ?? new Date().toISOString(),
    customer: {
      id: (customer.id as number) ?? 0,
      firstName: (customer.first_name as string) ?? "",
      lastName: (customer.last_name as string) ?? "",
      email: (o.email as string) ?? (customer.email as string) ?? "",
      locale,
    },
    lineItems: ((o.line_items as Record<string, unknown>[]) ?? []).map((li) => ({
      id: li.id as number,
      productId: li.product_id as number,
      variantId: li.variant_id as number,
      title: li.title as string,
      sku: (li.sku as string) ?? "",
      quantity: li.quantity as number,
    })),
  };
}

export async function getProductByHandle(handle: string): Promise<{
  id: number;
  title: string;
  variants: { id: number; title: string; sku: string }[];
} | null> {
  const { products } = await shopifyFetch(
    `/products.json?handle=${encodeURIComponent(handle)}&limit=1&fields=id,title,variants`
  );
  const p = (products as Record<string, unknown>[])?.[0];
  if (!p) return null;
  const variants = ((p.variants as Record<string, unknown>[]) ?? [])
    .map((v) => ({
      id: v.id as number,
      title: (v.title as string) ?? "",
      sku: (v.sku as string) ?? "",
    }))
    .filter((v) => v.sku);
  return { id: p.id as number, title: p.title as string, variants };
}

export async function getOrderFulfillmentData(orderNameOrId: string): Promise<import("./types").OrderFulfillmentData> {
  const isInternalId = /^\d{10,}$/.test(orderNameOrId.trim());
  let o: Record<string, unknown>;
  if (isInternalId) {
    ({ order: o } = await shopifyFetch(`/orders/${orderNameOrId}.json`));
  } else {
    const name = orderNameOrId.startsWith("#") ? orderNameOrId : `#${orderNameOrId}`;
    const { orders } = await shopifyFetch(`/orders.json?name=${encodeURIComponent(name)}&status=any&limit=1`);
    if (!orders?.length) throw new Error(`Commande introuvable: ${name}`);
    o = orders[0] as Record<string, unknown>;
  }

  const orderId = o.id as number;
  const orderName = o.name as string;
  const tags = ((o.tags as string) ?? "").split(",").map((t: string) => t.trim()).filter(Boolean);

  const fulfillmentsData = await shopifyFetch(`/orders/${orderId}/fulfillments.json`);
  const fulfillments = (fulfillmentsData.fulfillments ?? []) as Record<string, unknown>[];

  // lineItemId → { fulfillmentId, fulfilledQuantity }
  const lineItemToFulfillmentId = new Map<number, number>();
  const lineItemToFulfilledQty = new Map<number, number>();
  for (const f of fulfillments) {
    if ((f.status as string) === "success") {
      for (const li of ((f.line_items as Record<string, unknown>[]) ?? [])) {
        lineItemToFulfillmentId.set(li.id as number, f.id as number);
        lineItemToFulfilledQty.set(li.id as number, (li.quantity as number) ?? 0);
      }
    }
  }

  const lineItems = ((o.line_items as Record<string, unknown>[]) ?? []).map((li) => {
    const lineItemId = li.id as number;
    const rawStatus = (li.fulfillment_status as string | null) ?? "unfulfilled";
    const fulfillmentStatus = (["fulfilled", "partial", "restocked"].includes(rawStatus) ? rawStatus : "unfulfilled") as import("./types").FulfillmentStatus;

    return {
      lineItemId,
      productId: li.product_id as number,
      title: li.title as string,
      quantity: li.quantity as number,
      fulfilledQuantity: lineItemToFulfilledQty.get(lineItemId) ?? 0,
      sku: (li.sku as string) ?? "",
      variantTitle: (li.variant_title as string) ?? "",
      fulfillmentStatus,
      fulfillmentId: lineItemToFulfillmentId.get(lineItemId) ?? null,
    };
  });

  return { orderId, orderName, tags, lineItems };
}

export async function cancelShopifyFulfillment(fulfillmentId: number): Promise<void> {
  await shopifyPost(`/fulfillments/${fulfillmentId}/cancel.json`, {});
}

export async function createShopifyFulfillment(
  orderId: number,
  lineItemId: number,
  quantity: number
): Promise<void> {
  // Use Fulfillment Orders API (required in 2025-01+)
  const { fulfillment_orders } = await shopifyFetch(`/orders/${orderId}/fulfillment_orders.json`);

  for (const fo of ((fulfillment_orders ?? []) as Record<string, unknown>[])) {
    if ((fo.status as string) === "closed" || (fo.status as string) === "cancelled") continue;
    const foLineItem = ((fo.line_items as Record<string, unknown>[]) ?? []).find(
      (li) =>
        (li.line_item_id as number) === lineItemId &&
        ((li.fulfillable_quantity as number) ?? 0) > 0
    );
    if (foLineItem) {
      await shopifyPost(`/fulfillments.json`, {
        fulfillment: {
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_id: fo.id,
              fulfillment_order_line_items: [{ id: foLineItem.id, quantity }],
            },
          ],
        },
      });
      return;
    }
  }

  throw new Error(`Article ${lineItemId} introuvable dans les fulfillment orders de la commande ${orderId}`);
}

// Bulk fulfillment: fulfill multiple line items at once, with optional tracking.
// lineItemIds empty = fulfill all unfulfilled items in the order.
export async function createBulkFulfillment(
  orderId: number,
  lineItemIds: number[],
  trackingNumber?: string
): Promise<void> {
  const { fulfillment_orders } = await shopifyFetch(`/orders/${orderId}/fulfillment_orders.json`);
  const fos = (fulfillment_orders ?? []) as Record<string, unknown>[];

  const fulfillAll = lineItemIds.length === 0;

  const lineItemsByFo: { fulfillment_order_id: number; fulfillment_order_line_items?: { id: number; quantity: number }[] }[] = [];

  for (const fo of fos) {
    if ((fo.status as string) === "closed" || (fo.status as string) === "cancelled") continue;

    const foLineItems = (fo.line_items as Record<string, unknown>[]) ?? [];
    const fulfillableItems = foLineItems.filter((li) => ((li.fulfillable_quantity as number) ?? 0) > 0);

    if (!fulfillableItems.length) continue;

    if (fulfillAll) {
      // No item filter — fulfill all items in this fulfillment order
      lineItemsByFo.push({ fulfillment_order_id: fo.id as number });
    } else {
      // Only items whose line_item_id is in the requested list
      const selected = fulfillableItems.filter((li) => lineItemIds.includes(li.line_item_id as number));
      if (!selected.length) continue;
      lineItemsByFo.push({
        fulfillment_order_id: fo.id as number,
        fulfillment_order_line_items: selected.map((li) => ({
          id: li.id as number,
          quantity: li.fulfillable_quantity as number,
        })),
      });
    }
  }

  if (!lineItemsByFo.length) throw new Error("Aucun article fulfillable trouvé");

  const tracking = trackingNumber
    ? {
        tracking_info: {
          number: trackingNumber,
          company: "Swiss Post",
          url: `https://service.post.ch/ekp-web/ui/list/rap/item/details/${trackingNumber}`,
        },
        notify_customer: true,
      }
    : {};

  await shopifyPost(`/fulfillments.json`, {
    fulfillment: {
      line_items_by_fulfillment_order: lineItemsByFo,
      ...tracking,
    },
  });
}

export async function getProductCoffretCount(productId: number): Promise<number | null> {
  try {
    const data = await shopifyFetch(`/products/${productId}/metafields.json?namespace=atelier&key=coffret_count`);
    const mf = data.metafields?.[0];
    if (!mf) return null;
    const n = parseInt(mf.value, 10);
    return isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export async function setProductCoffretCount(productId: number, count: number): Promise<void> {
  const data = await shopifyFetch(`/products/${productId}/metafields.json?namespace=atelier&key=coffret_count`);
  const existing = data.metafields?.[0];
  if (existing) {
    await shopifyPut(`/metafields/${existing.id}.json`, {
      metafield: { id: existing.id, value: String(count), type: "number_integer" },
    });
  } else {
    await shopifyPost(`/products/${productId}/metafields.json`, {
      metafield: { namespace: "atelier", key: "coffret_count", value: String(count), type: "number_integer" },
    });
  }
}

export async function getAtelierTunnelUrl(): Promise<string | null> {
  try {
    const data = await shopifyFetch("/metafields.json?namespace=atelier&key=tunnel_url");
    return data.metafields?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

