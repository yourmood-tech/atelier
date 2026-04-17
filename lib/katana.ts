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

  // 3. Keep only rows for our specific variant (size 50)
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
      } catch {
        // Non-critical — ingredient without details
      }

      return { id: ingredientVariantId, name, sku, quantity, unit: null, supplier };
    })
  );

  return {
    id: productId,
    name: productName,
    sku: shopifyVariantSku,
    ingredients,
  };
}

export async function getOpenPurchaseOrdersForSupplier(
  supplierId: number,
  materialVariantIds: number[]
): Promise<KatanaPurchaseOrder | null> {
  // Fetch open POs for this supplier
  const data = (await katanaFetch(
    `/v1/purchase_orders?supplier_id=${supplierId}&status=open&limit=50`,
    { method: "GET" }
  )) as { data?: Record<string, unknown>[] };

  const pos = data?.data ?? [];
  if (!pos.length) return null;

  // For each PO, fetch its rows to find if our material variant is included
  for (const po of pos) {
    const poId = po.id as number;

    const rowsData = (await katanaFetch(
      `/v1/purchase_order_rows?purchase_order_id=${poId}&limit=100`,
      { method: "GET" }
    )) as { data?: Record<string, unknown>[] };

    const rows = rowsData?.data ?? [];

    // Check if any of our material variants appear in this PO
    const matchingRows = rows.filter((row) =>
      materialVariantIds.includes(row.variant_id as number)
    );

    if (matchingRows.length) {
      const supplierName = await getSupplierName(supplierId);

      const poRows: KatanaPurchaseOrderRow[] = rows.map((row) => ({
        id: row.id as string,
        variantId: row.variant_id as number,
        variantSku: (row.variant_sku as string | null) ?? null,
        variantName: (row.variant_name ?? row.name ?? "") as string,
        quantity: (row.quantity as number) ?? 0,
        receivedQuantity: (row.received_quantity as number) ?? 0,
      }));

      // Estimated delivery: try multiple field names Katana might use
      const eta =
        (po.estimated_delivery_date as string | null) ??
        (po.expected_delivery_date as string | null) ??
        (po.delivery_date as string | null) ??
        null;

      return {
        id: poId,
        number: (po.number ?? po.purchase_order_number ?? String(poId)) as string,
        supplierId,
        supplierName,
        status: (po.status as string) ?? "open",
        estimatedDelivery: eta,
        rows: poRows,
      };
    }
  }

  return null;
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