import type { Direction } from "./types";

type KatanaVariant = {
  id: number;
  product_id?: number | null;
  material_id?: number | null;
  sku?: string | null;
  name?: string | null;
  internal_barcode?: string | null;
  registered_barcode?: string | null;
};

type KatanaProduct = {
  id: number;
  name?: string | null;
};

type KatanaMovementInput = {
  barcode: string;
  direction: Direction;
  quantity: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const BASE_URL = process.env.KATANA_BASE_URL!;
const API_KEY = process.env.KATANA_API_KEY!;
const DEFAULT_LOCATION_ID = Number(process.env.KATANA_DEFAULT_LOCATION_ID!);

const VARIANT_CACHE_TTL_MS = 10 * 60 * 1000;
const PRODUCT_CACHE_TTL_MS = 10 * 60 * 1000;

const variantCache = new Map<string, CacheEntry<KatanaVariant>>();
const productNameCache = new Map<number, CacheEntry<string>>();

function getCachedValue<T>(cache: Map<any, CacheEntry<T>>, key: any): T | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCachedValue<T>(
  cache: Map<any, CacheEntry<T>>,
  key: any,
  value: T,
  ttlMs: number
) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

async function katanaFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const rawText = await res.text();

  let data: unknown = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = { rawText };
  }

  if (!res.ok) {
    throw new Error(`Katana ${res.status} on ${path}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function findVariantByBarcode(barcode: string): Promise<KatanaVariant> {
  const cached = getCachedValue(variantCache, barcode);
  if (cached) {
    return cached;
  }

  const data = (await katanaFetch(
    `/v1/variants?internal_barcode=${encodeURIComponent(barcode)}`,
    { method: "GET" }
  )) as { data?: KatanaVariant[] };

  if (!data?.data?.length) {
    throw new Error(`Barcode introuvable dans Katana: ${barcode}`);
  }

  if (data.data.length > 1) {
    throw new Error(`Barcode non unique dans Katana: ${barcode}`);
  }

  const variant = data.data[0];
  setCachedValue(variantCache, barcode, variant, VARIANT_CACHE_TTL_MS);

  return variant;
}

async function getProductName(productId: number): Promise<string> {
  const cached = getCachedValue(productNameCache, productId);
  if (cached) {
    return cached;
  }

  const product = (await katanaFetch(`/v1/products/${productId}`, {
    method: "GET",
  })) as KatanaProduct;

  const productName = product?.name?.trim() || "";
  setCachedValue(productNameCache, productId, productName, PRODUCT_CACHE_TTL_MS);

  return productName;
}

async function resolveVariantLabel(variant: KatanaVariant): Promise<string> {
  if (typeof variant.name === "string" && variant.name.trim()) {
    return variant.name.trim();
  }

  if (variant.product_id) {
    const productName = await getProductName(variant.product_id);

    if (productName && variant.sku) {
      return `${productName} - ${variant.sku}`;
    }

    if (productName) {
      return productName;
    }
  }

  if (typeof variant.sku === "string" && variant.sku.trim()) {
    return variant.sku.trim();
  }

  return "";
}

function makeStockAdjustmentNumber() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SCN-${ts}-${randomSuffix}`;
}

async function createStockAdjustment(params: {
  variantId: number;
  quantity: number;
}) {
  const payload = {
    stock_adjustment_number: makeStockAdjustmentNumber(),
    location_id: DEFAULT_LOCATION_ID,
    stock_adjustment_rows: [
      {
        variant_id: params.variantId,
        quantity: params.quantity,
      },
    ],
  };

  return katanaFetch("/v1/stock_adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendStockMovementToKatana(input: KatanaMovementInput) {
  const variant = await findVariantByBarcode(input.barcode);
  const variantLabel = await resolveVariantLabel(variant);

  const quantitySigned =
    input.direction === "OUT"
      ? -Math.abs(input.quantity)
      : Math.abs(input.quantity);

  const stockAdjustment = await createStockAdjustment({
    variantId: variant.id,
    quantity: quantitySigned,
  });

  return {
    success: true,
    barcode: input.barcode,
    variant_id: variant.id,
    variant_name: variantLabel,
    quantity: quantitySigned,
    katana_response: stockAdjustment,
  };
}