import type {
  Direction,
  KatanaRecipe,
  KatanaRecipeIngredient,
  KatanaRecipeIngredientWithSupplier,
  KatanaSupplier,
  KatanaPurchaseOrder,
  KatanaPurchaseOrderRow,
} from "./types";

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
const SUPPLIER_CACHE_TTL_MS = 10 * 60 * 1000;

const variantCache = new Map<string, CacheEntry<KatanaVariant>>();
const productNameCache = new Map<number, CacheEntry<string>>();
const supplierNameCache = new Map<number, CacheEntry<string>>();
let supplierCachePopulatedAt = 0;
let openPosCache: CacheEntry<Record<string, unknown>[]> | null = null;
const OPEN_POS_CACHE_TTL_MS = 5 * 60 * 1000;

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

async function katanaFetch(path: string, init?: RequestInit, retries = 3) {
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

  if (res.status === 429 && retries > 0) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 1);
    await new Promise((r) => setTimeout(r, (retryAfter || 1) * 1000));
    return katanaFetch(path, init, retries - 1);
  }

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

async function getSupplierName(supplierId: number): Promise<string> {
  const cached = getCachedValue(supplierNameCache, supplierId);
  if (cached !== null) return cached;

  // Populate cache from full list — /v1/suppliers/{id} doesn't exist in Katana API
  if (Date.now() - supplierCachePopulatedAt > SUPPLIER_CACHE_TTL_MS) {
    const data = (await katanaFetch("/v1/suppliers?limit=300", {
      method: "GET",
    })) as { data?: { id: number; name: string }[] };

    supplierCachePopulatedAt = Date.now();
    for (const sup of data?.data ?? []) {
      setCachedValue(supplierNameCache, sup.id, sup.name ?? "", SUPPLIER_CACHE_TTL_MS);
    }
  }

  return getCachedValue(supplierNameCache, supplierId) ?? "";
}

export async function getAllKatanaSuppliers(): Promise<{ id: number; name: string }[]> {
  const data = (await katanaFetch("/v1/suppliers?limit=300", { method: "GET" })) as {
    data?: { id: number; name: string }[];
  };
  return (data?.data ?? []).map((s) => ({ id: s.id, name: s.name ?? "" }));
}

export async function searchRecipes(query: string, limit = 20): Promise<KatanaRecipe[]> {
  const params = new URLSearchParams({ search: query, limit: String(limit) });
  const data = (await katanaFetch(`/v1/products?${params}`, { method: "GET" })) as {
    data?: Record<string, unknown>[];
  };

  if (!data?.data?.length) return [];

  return data.data.map((product) => ({
    id: product.id as number,
    name: (product.name as string) ?? "",
    sku: (product.sku as string | null) ?? null,
    ingredients: ((product.recipe_rows as Record<string, unknown>[]) ?? []).map(
      (row): KatanaRecipeIngredient => ({
        id: (row.ingredient_id ?? row.id) as number,
        name: ((row.ingredient_name ?? row.name) as string) ?? "",
        sku: ((row.ingredient_sku ?? row.sku) as string | null) ?? null,
        quantity: (row.quantity as number) ?? 1,
        unit: (row.unit as string | null) ?? null,
      })
    ),
  }));
}

export async function getRecipeWithSuppliers(shopifyVariantSku: string): Promise<{
  id: number;
  name: string;
  sku: string | null;
  ingredients: KatanaRecipeIngredientWithSupplier[];
} | null> {
  // 1. Find the Katana variant by exact SKU
  const variantData = (await katanaFetch(
    `/v1/variants?sku=${encodeURIComponent(shopifyVariantSku)}&limit=3`,
    { method: "GET" }
  )) as { data?: Record<string, unknown>[] };

  const katanaVariant = variantData?.data?.[0];
  if (!katanaVariant) return null;

  const katanaVariantId = katanaVariant.id as number;
  const productId = katanaVariant.product_id as number;
  if (!productId) return null;

  // 2. Fetch product name + all recipe rows for this product
  const [productRes, recipeRes] = await Promise.all([
    katanaFetch(`/v1/products/${productId}`, { method: "GET" }) as Promise<Record<string, unknown>>,
    katanaFetch(`/v1/recipes?product_id=${productId}&limit=500`, { method: "GET" }) as Promise<{ data?: Record<string, unknown>[] }>,
  ]);

  const productName = ((productRes as Record<string, unknown>).name as string) ?? "";
  const allRows = (recipeRes as { data?: Record<string, unknown>[] }).data ?? [];

  // 3. Keep only rows for our specific variant
  const variantRows = allRows.filter(
    (row) => Number(row.product_variant_id) === katanaVariantId
  );

  if (!variantRows.length) return null;

  // 4. Fetch each ingredient variant → then its material/product for name + supplier
  const ingredients = await Promise.all(
    variantRows.map(async (row): Promise<KatanaRecipeIngredientWithSupplier> => {
      const ingredientVariantId = row.ingredient_variant_id as number;
      const quantity = (row.quantity as number) ?? 1;

      let name = "";
      let sku: string | null = null;
      let supplier: KatanaSupplier | null = null;

      try {
        const ingVariant = (await katanaFetch(
          `/v1/variants/${ingredientVariantId}`,
          { method: "GET" }
        )) as Record<string, unknown>;

        sku = (ingVariant.sku as string | null) ?? null;

        const materialId = ingVariant.material_id as number | null;
        const ingProductId = ingVariant.product_id as number | null;

        // Price is on the variant, not the material
        const rawPrice = ingVariant.purchase_price;
        const purchasePrice: number | null =
          rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;

        if (materialId) {
          // Purchased material → fetch for name + supplier
          const mat = (await katanaFetch(`/v1/materials/${materialId}`, {
            method: "GET",
          })) as Record<string, unknown>;

          name = (mat.name as string) ?? "";

          const supplierId = mat.default_supplier_id as number | null;
          if (supplierId) {
            const supName = await getSupplierName(supplierId);
            if (supName) supplier = { id: supplierId, name: supName };
          }
        } else if (ingProductId) {
          // Sub-assembly product
          const subProd = (await katanaFetch(`/v1/products/${ingProductId}`, {
            method: "GET",
          })) as Record<string, unknown>;
          name = (subProd.name as string) ?? "";
        }

        // Fallback to variant name
        if (!name && ingVariant.name) name = ingVariant.name as string;

        return { id: ingredientVariantId, name, sku, quantity, unit: null, supplier, purchasePrice };
      } catch {
        // Non-critical — ingredient without details
      }

      return { id: ingredientVariantId, name, sku, quantity, unit: null, supplier, purchasePrice: null };
    })
  );

  return {
    id: productId,
    name: productName,
    sku: shopifyVariantSku,
    ingredients,
  };
}

function buildPoResult(
  po: Record<string, unknown>,
  supplierId: number,
  supplierName: string
): KatanaPurchaseOrder {
  const poId = po.id as number;
  const rows = (po.purchase_order_rows as Record<string, unknown>[]) ?? [];

  const poRows: KatanaPurchaseOrderRow[] = rows.map((row) => ({
    id: row.id as string,
    variantId: row.variant_id as number,
    variantSku: null,
    variantName: "",
    quantity: (row.quantity as number) ?? 0,
    receivedQuantity: (row.received_quantity as number) ?? 0,
  }));

  return {
    id: poId,
    number: (po.order_no ?? String(poId)) as string,
    supplierId,
    supplierName,
    status: (po.status as string) ?? "NOT_RECEIVED",
    estimatedDelivery: (po.expected_arrival_date as string | null) ?? null,
    rows: poRows,
  };
}

async function fetchAllOpenPos(): Promise<Record<string, unknown>[]> {
  if (openPosCache && Date.now() < openPosCache.expiresAt) {
    return openPosCache.value;
  }
  const [notReceived, partiallyReceived] = await Promise.all([
    katanaFetch(`/v1/purchase_orders?status=NOT_RECEIVED&limit=100`, { method: "GET" }) as Promise<{ data?: Record<string, unknown>[] }>,
    katanaFetch(`/v1/purchase_orders?status=PARTIALLY_RECEIVED&limit=100`, { method: "GET" }) as Promise<{ data?: Record<string, unknown>[] }>,
  ]);
  const pos = [
    ...(notReceived?.data ?? []),
    ...(partiallyReceived?.data ?? []),
  ];
  openPosCache = { value: pos, expiresAt: Date.now() + OPEN_POS_CACHE_TTL_MS };
  return pos;
}

// Find the first open PO that contains any of the given ingredient variant IDs.
// Works even when materials have no default_supplier_id set in Katana.
export async function getOpenPurchaseOrderForVariants(
  ingredientVariantIds: number[],
  afterDate?: string // only consider POs created after this ISO date (e.g. order.createdAt)
): Promise<KatanaPurchaseOrder | null> {
  if (!ingredientVariantIds.length) return null;

  const pos = await fetchAllOpenPos();

  // Sort by estimated delivery ascending — prefer earliest delivery date
  const sorted = [...pos].sort((a, b) => {
    const dA = (a.expected_arrival_date as string | null) ?? "";
    const dB = (b.expected_arrival_date as string | null) ?? "";
    return dA.localeCompare(dB);
  });

  for (const po of sorted) {
    if (afterDate) {
      const poCreatedAt = (po.created_at as string | null) ?? "";
      if (poCreatedAt && poCreatedAt <= afterDate) continue;
    }

    const rows = (po.purchase_order_rows as Record<string, unknown>[]) ?? [];
    const hasMatch = rows.some((row) =>
      ingredientVariantIds.includes(row.variant_id as number)
    );

    if (hasMatch) {
      const supplierId = po.supplier_id as number;
      const supplierName = await getSupplierName(supplierId);
      return buildPoResult(po, supplierId, supplierName);
    }
  }

  return null;
}

// Legacy: search by supplier ID (kept for cases where supplier is already known)
export async function getOpenPurchaseOrdersForSupplier(
  supplierId: number,
  materialVariantIds: number[]
): Promise<KatanaPurchaseOrder | null> {
  const [notReceived, partiallyReceived] = await Promise.all([
    katanaFetch(`/v1/purchase_orders?supplier_id=${supplierId}&status=NOT_RECEIVED&limit=50`, { method: "GET" }) as Promise<{ data?: Record<string, unknown>[] }>,
    katanaFetch(`/v1/purchase_orders?supplier_id=${supplierId}&status=PARTIALLY_RECEIVED&limit=50`, { method: "GET" }) as Promise<{ data?: Record<string, unknown>[] }>,
  ]);

  const pos = [
    ...(notReceived?.data ?? []),
    ...(partiallyReceived?.data ?? []),
  ];

  for (const po of pos) {
    const rows = (po.purchase_order_rows as Record<string, unknown>[]) ?? [];
    const hasMatch = rows.some((row) =>
      materialVariantIds.includes(row.variant_id as number)
    );
    if (hasMatch) {
      const supplierName = await getSupplierName(supplierId);
      return buildPoResult(po, supplierId, supplierName);
    }
  }

  return null;
}

export async function getKatanaVariantIdBySku(sku: string): Promise<number | null> {
  const data = (await katanaFetch(
    `/v1/variants?sku=${encodeURIComponent(sku)}&limit=1`,
    { method: "GET" }
  )) as { data?: Record<string, unknown>[] };
  const v = data?.data?.[0];
  return v ? (v.id as number) : null;
}

export async function getKatanaVariantWithPriceBySku(
  sku: string
): Promise<{ id: number; purchasePrice: number | null } | null> {
  const data = (await katanaFetch(
    `/v1/variants?sku=${encodeURIComponent(sku)}&limit=1`,
    { method: "GET" }
  )) as { data?: Record<string, unknown>[] };
  const v = data?.data?.[0];
  if (!v) return null;
  const rawPrice = v.purchase_price;
  const purchasePrice =
    rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
  return { id: v.id as number, purchasePrice };
}

// Résolution GROUPÉE — récupère plusieurs SKU en un seul appel via le filtre sku[]
// (Katana limite à 60 requêtes/minute ; on évite ainsi 1 appel par SKU).
export async function getKatanaVariantsBySkus(
  skus: string[]
): Promise<Map<string, { id: number; purchasePrice: number | null }>> {
  const result = new Map<string, { id: number; purchasePrice: number | null }>();
  const CHUNK = 40;

  for (let i = 0; i < skus.length; i += CHUNK) {
    const batch = skus.slice(i, i + CHUNK);
    const qs = batch.map((s) => `sku[]=${encodeURIComponent(s)}`).join("&");
    const data = (await katanaFetch(`/v1/variants?${qs}&limit=250`, {
      method: "GET",
    })) as { data?: Record<string, unknown>[] };

    for (const v of data?.data ?? []) {
      const sku = v.sku as string | undefined;
      if (!sku) continue;
      const rawPrice = v.purchase_price;
      const purchasePrice =
        rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
      result.set(sku, { id: v.id as number, purchasePrice });
    }
  }

  return result;
}

export async function getVariantStock(variantId: number): Promise<{
  inStock: number;
  committed: number;
  available: number;
  toReceive: number;
}> {
  const data = (await katanaFetch(
    `/v1/inventory?variant_id=${variantId}`,
    { method: "GET" }
  )) as { data?: Record<string, unknown>[] };

  const rows = data?.data ?? [];
  // Filter in code to target location — API may ignore location_id param
  const row = rows.find((r) => Number(r.location_id) === DEFAULT_LOCATION_ID) ?? rows[0];
  if (!row) return { inStock: 0, committed: 0, available: 0, toReceive: 0 };

  const inStock = Number(row.quantity_in_stock ?? 0);
  const toReceive = Number(row.quantity_expected ?? 0);

  return { inStock, committed: 0, available: inStock, toReceive };
}

export async function getKatanaVariantByBarcode(barcode: string): Promise<{
  id: number;
  sku: string | null;
  name: string;
}> {
  const data = (await katanaFetch(
    `/v1/variants?internal_barcode=${encodeURIComponent(barcode)}`,
    { method: "GET" }
  )) as { data?: KatanaVariant[] };

  if (!data?.data?.length) {
    throw new Error(`Barcode introuvable dans Katana: ${barcode}`);
  }

  const variant = data.data[0];
  const name = await resolveVariantLabel(variant);
  return { id: variant.id, sku: variant.sku ?? null, name };
}

export async function createKatanaPOWithRows(
  supplierId: number,
  rows: { variantId: number; quantity: number; pricePerUnit: number }[],
  expectedArrival?: string | null,
  orderPrefix = "ICE"
): Promise<{ id: number; number: string; deliveryDate: string | null }> {
  // Find 0% tax rate (imports) — fallback to default, then first available
  const taxData = (await katanaFetch("/v1/tax_rates?limit=50", { method: "GET" })) as {
    data?: { id: number; name: string; rate?: number | null; percentage?: number; is_default?: boolean; is_default_purchases?: boolean }[];
  };
  const taxRates = taxData?.data ?? [];
  const taxRate =
    taxRates.find((t) => t.rate === null || (t.name as string)?.toLowerCase().includes("no tax")) ??
    taxRates.find((t) => t.is_default_purchases) ??
    taxRates[0];
  if (!taxRate) throw new Error("Aucun taux de taxe configuré dans Katana");

  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const payload: Record<string, unknown> = {
    supplier_id: supplierId,
    order_no: `${orderPrefix}-${ts}-${rand}`,
    location_id: DEFAULT_LOCATION_ID,
    ...(expectedArrival ? { expected_arrival_date: expectedArrival } : {}),
    purchase_order_rows: rows.map((r) => ({
      variant_id: r.variantId,
      quantity: r.quantity,
      price_per_unit: r.pricePerUnit,
      tax_rate_id: taxRate.id,
    })),
  };
  const result = (await katanaFetch("/v1/purchase_orders", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as Record<string, unknown>;

  const poId = result.id as number;

  // Katana ignores expected_arrival_date on POST — update it with a PATCH.
  // Field name is arrivalDate, format is ISO 8601 datetime.
  if (expectedArrival) {
    await katanaFetch(`/v1/purchase_orders/${poId}`, {
      method: "PATCH",
      body: JSON.stringify({ expected_arrival_date: `${expectedArrival}T00:00:00.000Z` }),
    });
  }

  const katanaDate = result.expected_arrival_date as string | null | undefined;
  return {
    id: poId,
    number: (result.order_no ?? String(poId)) as string,
    deliveryDate: expectedArrival ?? katanaDate ?? null,
  };
}

export async function checkKatanaVariants(
  skus: string[]
): Promise<{ sku: string; exists: boolean; katanaId?: number; katanaProductId?: number; configMissing?: boolean }[]> {
  return Promise.all(
    skus.map(async (sku) => {
      try {
        const data = (await katanaFetch(
          `/v1/variants?sku=${encodeURIComponent(sku)}&limit=1`,
          { method: "GET" }
        )) as { data?: { id: number; product_id?: number; config_attributes?: unknown[] }[] };
        const v = data?.data?.[0];
        if (v) return {
          sku,
          exists: true,
          katanaId: v.id,
          katanaProductId: v.product_id ?? undefined,
          configMissing: (v.config_attributes ?? []).length === 0,
        };
        return { sku, exists: false };
      } catch {
        return { sku, exists: false };
      }
    })
  );
}

export async function ensureKatanaVariantsExist(
  productTitle: string,
  missingVariants: { sku: string; variantName: string; options?: Record<string, string> }[],
  katanaProductId?: number
): Promise<{ sku: string; created: boolean; error?: string }[]> {
  if (!missingVariants.length) return [];

  const results: { sku: string; created: boolean; error?: string }[] = [];

  // Prefer known product ID (from existing variants) over name search
  let productId = katanaProductId;

  if (!productId) {
    const searchData = (await katanaFetch(
      `/v1/products?search=${encodeURIComponent(productTitle)}&limit=20`,
      { method: "GET" }
    )) as { data?: { id: number; name: string }[] };

    const exactMatch = (searchData?.data ?? []).find(
      (p) => p.name.toLowerCase().trim() === productTitle.toLowerCase().trim()
    );
    productId = exactMatch?.id;
  }

  if (productId) {
    // Fetch product configs once to build config_attributes for each variant
    let katanaConfigs: { name: string }[] = [];
    try {
      const productData = (await katanaFetch(`/v1/products/${productId}`, { method: "GET" })) as {
        configs?: { id: number; name: string; values: string[] }[];
      };
      katanaConfigs = productData?.configs ?? [];
    } catch { /* proceed without configs */ }

    for (const v of missingVariants) {
      try {
        const config_attributes = katanaConfigs
          .filter((c) => v.options?.[c.name] !== undefined)
          .map((c) => ({ config_name: c.name, config_value: v.options![c.name] }));

        await katanaFetch("/v1/variants", {
          method: "POST",
          body: JSON.stringify({
            product_id: productId,
            sku: v.sku,
            ...(config_attributes.length ? { config_attributes } : {}),
          }),
        });
        results.push({ sku: v.sku, created: true });
      } catch (e) {
        results.push({ sku: v.sku, created: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
  } else {
    // No product in Katana at all — create it with all missing variants
    try {
      await katanaFetch("/v1/products", {
        method: "POST",
        body: JSON.stringify({
          name: productTitle,
          is_sellable: true,
          variants: missingVariants.map((v) => ({ sku: v.sku })),
        }),
      });
      for (const v of missingVariants) results.push({ sku: v.sku, created: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const v of missingVariants) results.push({ sku: v.sku, created: false, error: msg });
    }
  }

  return results;
}

export async function fixKatanaVariantConfigs(
  katanaProductId: number,
  variants: { katanaId: number; sku: string; options: Record<string, string> }[]
): Promise<{ sku: string; fixed: boolean; error?: string }[]> {
  if (!variants.length) return [];

  let katanaConfigs: { name: string }[] = [];
  try {
    const productData = (await katanaFetch(`/v1/products/${katanaProductId}`, { method: "GET" })) as {
      configs?: { id: number; name: string; values: string[] }[];
    };
    katanaConfigs = productData?.configs ?? [];
  } catch { /* proceed without configs */ }

  return Promise.all(
    variants.map(async (v) => {
      try {
        const config_attributes = katanaConfigs
          .filter((c) => v.options[c.name] !== undefined)
          .map((c) => ({ config_name: c.name, config_value: v.options[c.name] }));

        await katanaFetch(`/v1/variants/${v.katanaId}`, {
          method: "PATCH",
          body: JSON.stringify({ config_attributes }),
        });
        return { sku: v.sku, fixed: true };
      } catch (e) {
        return { sku: v.sku, fixed: false, error: e instanceof Error ? e.message : String(e) };
      }
    })
  );
}

export async function pushRecipesToKatana(
  katanaProductId: number,
  rows: { productVariantId: number; ingredientVariantId: number; quantity: number }[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  if (!rows.length) return { created: 0, skipped: 0, errors: [] };

  // Fetch existing recipes to avoid duplicates
  const existing = (await katanaFetch(
    `/v1/recipes?product_id=${katanaProductId}&limit=500`,
    { method: "GET" }
  )) as { data?: { product_variant_id: number; ingredient_variant_id: number }[] };

  const existingKeys = new Set(
    (existing?.data ?? []).map((r) => `${r.product_variant_id}-${r.ingredient_variant_id}`)
  );

  const newRows = rows.filter((r) => !existingKeys.has(`${r.productVariantId}-${r.ingredientVariantId}`));
  const skipped = rows.length - newRows.length;

  if (!newRows.length) return { created: 0, skipped, errors: [] };

  const BATCH = 150;
  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < newRows.length; i += BATCH) {
    const batch = newRows.slice(i, i + BATCH);
    try {
      await katanaFetch("/v1/recipes", {
        method: "POST",
        body: JSON.stringify({
          rows: batch.map((r) => ({
            product_variant_id: r.productVariantId,
            ingredient_variant_id: r.ingredientVariantId,
            quantity: r.quantity,
          })),
        }),
      });
      created += batch.length;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { created, skipped, errors };
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