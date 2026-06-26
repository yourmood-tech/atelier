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

// Variante qui expose l'en-tête Link (pagination par curseur Shopify).
async function shopifyFetchRaw(path: string): Promise<{ data: Record<string, unknown>; link: string | null }> {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}${path}`, {
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Shopify ${res.status} on ${path}: ${text.slice(0, 200)}`);
  return { data: JSON.parse(text), link: res.headers.get("link") };
}

// Récupère TOUTES les pages d'une collection (ex. orders) en suivant rel="next".
function nextPageInfo(link: string | null): string | null {
  if (!link) return null;
  const seg = link.split(",").find((s) => s.includes('rel="next"'));
  const url = seg?.match(/<([^>]+)>/)?.[1];
  if (!url) return null;
  try {
    return new URL(url).searchParams.get("page_info");
  } catch {
    return null;
  }
}

async function shopifyFetchPaginated(firstPath: string, key: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let path: string | null = firstPath;
  let guard = 0;
  while (path && guard < 50) {
    guard++;
    const { data, link } = await shopifyFetchRaw(path);
    all.push(...((data[key] as Record<string, unknown>[]) ?? []));
    const pi = nextPageInfo(link);
    path = pi ? `${firstPath.split("?")[0]}?limit=250&page_info=${pi}` : null;
  }
  return all;
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
      }
    : {};

  await shopifyPost(`/fulfillments.json`, {
    fulfillment: {
      line_items_by_fulfillment_order: lineItemsByFo,
      notify_customer: true,
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

// ---------------------------------------------------------------------------
// Mon Armoire Mood — espace client (V1)
// Construit "l'armoire virtuelle" d'une cliente à partir de ses vraies
// commandes Shopify (recherche par email). Aucune donnée inventée.
// ---------------------------------------------------------------------------

export type ArmoirePiece = {
  pid: number; // product_id Shopify (0 si produit supprimé) — clé pour "déplacer"/"photo perso"
  title: string;
  image: string | null;
  date: string; // ISO
  quantity: number;
};

export type ArmoireTiroir = {
  key: string;
  label: string;
  emoji: string;
  pieces: ArmoirePiece[];
};

export type ArmoireResult = {
  found: boolean;
  prenom: string;
  stats: { commandes: number; pieces: number; totalDepense: number; devise: string };
  tiroirs: ArmoireTiroir[];
  orderNames: string[]; // numéros de commande (#392523…) — pour vérifier la propriété
  // Budget de déblocage (jeux + déco) gagné PAR COMMANDE depuis le lancement (tout le monde part de 0)
  entitlements: { gamesBudget: number; decoBudget: number; commandesQualifiantes: number };
};

// Lancement de la gamification : seules les commandes à partir de cette date comptent.
export const ARMOIRE_GAME_START = "2026-06-26";

// Palier selon le TOTAL d'UNE commande → combien de jeux / objets déco elle débloque.
export function grantForOrderTotal(total: number): { games: number; deco: number } {
  if (total >= 901) return { games: 6, deco: 10 };
  if (total >= 501) return { games: 3, deco: 4 };
  if (total >= 301) return { games: 1, deco: 2 };
  if (total >= 101) return { games: 1, deco: 1 };
  if (total >= 20) return { games: 1, deco: 0 };
  return { games: 0, deco: 0 };
}

// Classement basé sur le TYPE DE PRODUIT Shopify (fiable : "addon argent", "base large",
// "mini acier", "Deux tiers argent", "coffret", "medium…", "clip & drop…") — PAS sur les tags
// (fourre-tout non fiable). Ordre = du plus spécifique au plus général.
const TIROIR_DEFS: { key: string; label: string; emoji: string; match: (s: string) => boolean }[] = [
  { key: "bases", label: "Mes bases", emoji: "💍", match: (s) => /\bbase\b/.test(s) },
  { key: "deuxtiers", label: "Mes deux tiers", emoji: "⅔", match: (s) => /deux ?tiers|2\/3/.test(s) },
  { key: "minis", label: "Mes minis", emoji: "🤍", match: (s) => /\bmini/.test(s) },
  { key: "medium", label: "Mes medium", emoji: "🌙", match: (s) => /\bmedium/.test(s) },
  { key: "clips", label: "Mes clips & drops", emoji: "👂", match: (s) => /clip|drop|insert|boucle/.test(s) },
  { key: "coffrets", label: "Mes coffrets & packs", emoji: "✨", match: (s) => /coffret|\bpack\b|coffin/.test(s) },
  { key: "rangement", label: "Mon rangement", emoji: "📦", match: (s) => /rangement|bo[iî]te|plateau/.test(s) },
  { key: "addons", label: "Mes addons", emoji: "🌸", match: (s) => /addon/.test(s) },
];

// type de produit prioritaire ; le titre ne sert que de secours si le type est vide.
function classifyPiece(productType: string, title: string): string {
  const t = (productType || "").toLowerCase();
  if (t) {
    for (const def of TIROIR_DEFS) if (def.match(t)) return def.key;
  }
  const ti = (title || "").toLowerCase();
  for (const def of TIROIR_DEFS) if (def.match(ti)) return def.key;
  return "autres";
}

export async function getCustomerArmoire(email: string): Promise<ArmoireResult> {
  const clean = email.trim().toLowerCase();
  const search = await shopifyFetch(
    `/customers/search.json?query=${encodeURIComponent(`email:${clean}`)}&limit=1`
  );
  const customer = search.customers?.[0];
  if (!customer) {
    return {
      found: false,
      prenom: "",
      stats: { commandes: 0, pieces: 0, totalDepense: 0, devise: "CHF" },
      tiroirs: [],
      orderNames: [],
      entitlements: { gamesBudget: 0, decoBudget: 0, commandesQualifiantes: 0 },
    };
  }

  // TOUTES les commandes du client (pagination par curseur — au-delà de 250).
  const orders: Record<string, unknown>[] = await shopifyFetchPaginated(
    `/orders.json?customer_id=${customer.id}&status=any&limit=250`,
    "orders"
  );

  // Collecte des line items + total dépensé + budget de déblocage (par commande, depuis le lancement)
  let totalDepense = 0;
  let devise = "CHF";
  let gamesBudget = 0;
  let decoBudget = 0;
  let commandesQualifiantes = 0;
  const orderNames: string[] = [];
  const items: { title: string; productId: number; date: string; quantity: number }[] = [];
  for (const o of orders) {
    if (o.name) orderNames.push(String(o.name));
    const orderTotal = parseFloat((o.total_price as string) ?? "0") || 0;
    totalDepense += orderTotal;
    devise = (o.currency as string) ?? devise;
    const date = (o.created_at as string) ?? new Date().toISOString();
    // Déblocage : tout le monde part de 0 → seules les commandes depuis le lancement comptent.
    if (date >= ARMOIRE_GAME_START) {
      const g = grantForOrderTotal(orderTotal);
      if (g.games || g.deco) commandesQualifiantes++;
      gamesBudget += g.games;
      decoBudget += g.deco;
    }
    for (const li of (o.line_items as Record<string, unknown>[]) ?? []) {
      items.push({
        title: (li.title as string) ?? "Pièce mood",
        productId: (li.product_id as number) ?? 0,
        date,
        quantity: (li.quantity as number) ?? 1,
      });
    }
  }

  // Images + catégorisation : récupération EN LOT (jusqu'à 250 produits par appel,
  // au lieu d'un appel par produit) → couvre toutes les pièces, pas seulement les 60 premières.
  const uniqueIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  const productInfo = new Map<number, { image: string | null; productType: string }>();
  for (let i = 0; i < uniqueIds.length; i += 250) {
    const chunk = uniqueIds.slice(i, i + 250);
    try {
      const data = await shopifyFetch(
        `/products.json?ids=${chunk.join(",")}&limit=250&fields=id,title,product_type,image,images`
      );
      for (const raw of (data.products as Record<string, unknown>[]) ?? []) {
        const product = raw as {
          id: number;
          title?: string;
          product_type?: string;
          image?: { src?: string } | null;
          images?: { src?: string }[];
        };
        const img = product.image?.src ?? product.images?.[0]?.src ?? null;
        productInfo.set(product.id, { image: img, productType: product.product_type ?? "" });
      }
    } catch {
      // lot en échec → ces pièces resteront sans image (non bloquant)
    }
  }

  const tiroirMap = new Map<string, ArmoireTiroir>();
  function ensureTiroir(key: string): ArmoireTiroir {
    if (!tiroirMap.has(key)) {
      const def = TIROIR_DEFS.find((d) => d.key === key);
      tiroirMap.set(key, {
        key,
        label: def?.label ?? "Mes autres pièces",
        emoji: def?.emoji ?? "💎",
        pieces: [],
      });
    }
    return tiroirMap.get(key)!;
  }

  for (const it of items) {
    const info = productInfo.get(it.productId);
    const key = classifyPiece(info?.productType ?? "", it.title);
    ensureTiroir(key).pieces.push({
      pid: it.productId,
      title: it.title,
      image: info?.image ?? null,
      date: it.date,
      quantity: it.quantity,
    });
  }

  // Ordre des tiroirs = ordre défini, puis "autres"
  const order = [...TIROIR_DEFS.map((d) => d.key), "autres"];
  const tiroirs = order
    .map((k) => tiroirMap.get(k))
    .filter((t): t is ArmoireTiroir => !!t && t.pieces.length > 0);

  return {
    found: true,
    prenom: (customer.first_name as string) ?? "",
    stats: {
      commandes: orders.length,
      pieces: items.reduce((n, i) => n + i.quantity, 0),
      totalDepense: Math.round(totalDepense),
      devise,
    },
    tiroirs,
    orderNames,
    entitlements: { gamesBudget, decoBudget, commandesQualifiantes },
  };
}

// --- Personnalisation cliente : "déplacer" un bijou + "photo perso" ---------
// Stockées par cliente (clé email) ; appliquées par-dessus l'armoire calculée.

export type ArmoireOverride = { tiroir?: string; image?: string };
export type ArmoireOverrides = Record<string, ArmoireOverride>;

// Clé stable d'une pièce : son product_id, ou un repli sur le titre si produit supprimé.
export function pieceKey(p: { pid: number; title: string }): string {
  return p.pid ? String(p.pid) : "t:" + p.title;
}

export function applyArmoireOverrides(armoire: ArmoireResult, overrides: ArmoireOverrides | null): ArmoireResult {
  if (!overrides || Object.keys(overrides).length === 0) return armoire;

  const byKey = new Map<string, ArmoireTiroir>(armoire.tiroirs.map((t) => [t.key, t]));
  function ensure(key: string): ArmoireTiroir {
    if (!byKey.has(key)) {
      const def = TIROIR_DEFS.find((d) => d.key === key);
      byKey.set(key, { key, label: def?.label ?? "Mes autres pièces", emoji: def?.emoji ?? "💎", pieces: [] });
    }
    return byKey.get(key)!;
  }

  for (const t of [...byKey.values()]) {
    for (let i = t.pieces.length - 1; i >= 0; i--) {
      const p = t.pieces[i];
      const ov = overrides[pieceKey(p)];
      if (!ov) continue;
      if (ov.image) p.image = ov.image;
      if (ov.tiroir && ov.tiroir !== t.key) {
        t.pieces.splice(i, 1);
        ensure(ov.tiroir).pieces.unshift(p);
      }
    }
  }

  const order = [...TIROIR_DEFS.map((d) => d.key), "autres"];
  const tiroirs = order
    .map((k) => byKey.get(k))
    .filter((t): t is ArmoireTiroir => !!t && t.pieces.length > 0);
  return { ...armoire, tiroirs };
}

// Liste des tiroirs proposés au déplacement (clé + label) — pour l'UI.
export function tiroirChoices(): { key: string; label: string }[] {
  return [...TIROIR_DEFS.map((d) => ({ key: d.key, label: d.label })), { key: "autres", label: "Mes autres pièces" }];
}

