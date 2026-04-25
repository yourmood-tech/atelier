import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.KATANA_BASE_URL!;
const API_KEY = process.env.KATANA_API_KEY!;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN!;
const SHOPIFY_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

async function shopifyRaw(path: string) {
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_VERSION}${path}`, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function katanaRaw(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

export async function GET(req: NextRequest) {
  const sku = req.nextUrl.searchParams.get("sku")?.trim() ?? "";
  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  const variantId = req.nextUrl.searchParams.get("variant_id")?.trim() ?? "";
  const supplierId = req.nextUrl.searchParams.get("supplier_id")?.trim() ?? "";
  const poSupplierId = req.nextUrl.searchParams.get("po_supplier_id")?.trim() ?? "";
  const poList = req.nextUrl.searchParams.get("po_list")?.trim() ?? "";
  const stockId = req.nextUrl.searchParams.get("stock_id")?.trim() ?? "";
  const handle = req.nextUrl.searchParams.get("handle")?.trim() ?? "";
  const locations = req.nextUrl.searchParams.get("locations")?.trim() ?? "";
  const materialId = req.nextUrl.searchParams.get("material_id")?.trim() ?? "";
  const materialSku = req.nextUrl.searchParams.get("material_sku")?.trim() ?? "";

  try {
    // Dump raw material by ID — for field name discovery
    if (materialId) {
      const mat = await katanaRaw(`/v1/materials/${materialId}`);
      return NextResponse.json({ endpoint: `/v1/materials/${materialId}`, ...mat });
    }

    // Dump raw material by SKU (via variant lookup)
    if (materialSku) {
      const varRes = await katanaRaw(`/v1/variants?sku=${encodeURIComponent(materialSku)}&limit=3`);
      const variant = varRes.body?.data?.[0];
      if (!variant) return NextResponse.json({ error: "Variant introuvable", varRes });
      const matId = variant.material_id;
      if (!matId) return NextResponse.json({ error: "Pas de material_id sur ce variant", variant });
      const mat = await katanaRaw(`/v1/materials/${matId}`);
      const taxRates = await katanaRaw(`/v1/tax_rates?limit=50`);
      return NextResponse.json({
        variant,
        material: { endpoint: `/v1/materials/${matId}`, ...mat },
        tax_rates: taxRates,
      });
    }

    if (locations) {
      const data = await katanaRaw(`/v1/locations?limit=100`);
      return NextResponse.json(data);
    }

    // Full trace: Shopify handle → variants → Katana SKU lookup
    if (handle) {
      const shopify = await shopifyRaw(`/products.json?handle=${encodeURIComponent(handle)}&limit=1&fields=id,title,variants`);
      const product = shopify.body?.products?.[0];
      if (!product) return NextResponse.json({ error: "Produit Shopify introuvable", handle, shopify });

      const variants = (product.variants ?? []) as Record<string, unknown>[];
      const skuSamples = variants.map((v: Record<string, unknown>) => ({ id: v.id, title: v.title, sku: v.sku }));

      // Try Katana lookup with the first non-empty SKU
      const firstSku = variants.find((v: Record<string, unknown>) => v.sku)?.sku as string | undefined;
      let katanaLookup = null;
      if (firstSku) {
        katanaLookup = await katanaRaw(`/v1/variants?sku=${encodeURIComponent(firstSku)}&limit=3`);
      }

      return NextResponse.json({
        shopify_product: { id: product.id, title: product.title, variant_count: variants.length },
        sku_samples: skuSamples,
        katana_sku_lookup: { sku_tried: firstSku, result: katanaLookup },
      });
    }

    // Debug stock endpoints for a variant ID
    if (stockId) {
      const candidates = await Promise.all([
        katanaRaw(`/v1/variants/${stockId}`),
        katanaRaw(`/v1/inventory?variant_id=${stockId}`),
        katanaRaw(`/v1/inventory?limit=1`),
        katanaRaw(`/v1/variant_locations?variant_id=${stockId}`),
        katanaRaw(`/v1/variant_locations?limit=1`),
        katanaRaw(`/v1/product_variant_locations?variant_id=${stockId}`),
      ]);
      return NextResponse.json({
        variant_id: stockId,
        "variants/{id}": candidates[0],
        "inventory?variant_id": candidates[1],
        "inventory?limit=1": candidates[2],
        "variant_locations?variant_id": candidates[3],
        "variant_locations?limit=1": candidates[4],
        "product_variant_locations?variant_id": candidates[5],
      });
    }

    // List all open POs (no supplier filter) to find one with data
    if (poList) {
      const [notReceived, partiallyReceived] = await Promise.all([
        katanaRaw(`/v1/purchase_orders?status=NOT_RECEIVED&limit=10`),
        katanaRaw(`/v1/purchase_orders?status=PARTIALLY_RECEIVED&limit=10`),
      ]);
      const allPos = [
        ...(notReceived.body?.data ?? []),
        ...(partiallyReceived.body?.data ?? []),
      ];
      const firstPoId = allPos[0]?.id;
      let rows = null;
      if (firstPoId) {
        rows = await katanaRaw(`/v1/purchase_order_rows?purchase_order_id=${firstPoId}&limit=20`);
      }
      return NextResponse.json({
        not_received_count: (notReceived.body?.data ?? []).length,
        partially_received_count: (partiallyReceived.body?.data ?? []).length,
        sample_pos: allPos.slice(0, 5),
        first_po_rows: rows ? { endpoint: `/v1/purchase_order_rows?purchase_order_id=${firstPoId}`, ...rows } : null,
      });
    }

    // Inspect PO structure for a supplier
    if (poSupplierId) {
      const [notReceived, partiallyReceived] = await Promise.all([
        katanaRaw(`/v1/purchase_orders?supplier_id=${poSupplierId}&status=NOT_RECEIVED&limit=5`),
        katanaRaw(`/v1/purchase_orders?supplier_id=${poSupplierId}&status=PARTIALLY_RECEIVED&limit=5`),
      ]);
      const allPos = [
        ...(notReceived.body?.data ?? []),
        ...(partiallyReceived.body?.data ?? []),
      ];
      const firstPoId = allPos[0]?.id;
      let rows = null;
      if (firstPoId) {
        rows = await katanaRaw(`/v1/purchase_order_rows?purchase_order_id=${firstPoId}&limit=20`);
      }
      return NextResponse.json({
        not_received: { endpoint: `/v1/purchase_orders?supplier_id=${poSupplierId}&status=NOT_RECEIVED`, ...notReceived },
        partially_received: { endpoint: `/v1/purchase_orders?supplier_id=${poSupplierId}&status=PARTIALLY_RECEIVED`, ...partiallyReceived },
        first_po_rows: rows ? { endpoint: `/v1/purchase_order_rows?purchase_order_id=${firstPoId}`, ...rows } : null,
      });
    }

    // Test supplier endpoint directly
    if (supplierId) {
      const single = await katanaRaw(`/v1/suppliers/${supplierId}`);
      const list = await katanaRaw(`/v1/suppliers?limit=5`);
      return NextResponse.json({
        single: { endpoint: `/v1/suppliers/${supplierId}`, ...single },
        list_sample: { endpoint: `/v1/suppliers?limit=5`, ...list },
      });
    }

    // Inspect a specific ingredient variant → material chain
    if (variantId) {
      const variant = await katanaRaw(`/v1/variants/${variantId}`);
      const materialId = variant.body?.material_id;
      const productId = variant.body?.product_id;

      let material = null;
      if (materialId) {
        material = await katanaRaw(`/v1/materials/${materialId}`);
      }

      return NextResponse.json({
        variant: { endpoint: `/v1/variants/${variantId}`, ...variant },
        material: material ? { endpoint: `/v1/materials/${materialId}`, ...material } : null,
        product_id_on_variant: productId,
      });
    }

    if (id) {
      // Fetch single product by ID — includes recipe data
      const product = await katanaRaw(`/v1/products/${id}`);
      return NextResponse.json({ endpoint: `/v1/products/${id}`, ...product });
    }

    if (sku) {
      // Step 1: find variant by SKU
      const variantRes = await katanaRaw(`/v1/variants?sku=${encodeURIComponent(sku)}&limit=3`);
      const variants = (variantRes.body?.data ?? []) as Record<string, unknown>[];
      const variant = variants[0];
      const productId = variant?.product_id;
      const variantId = variant?.id;

      if (!productId) {
        return NextResponse.json({ variant_search: variantRes, product_detail: null, recipes: null });
      }

      // Step 2: fetch full product
      const productRes = await katanaRaw(`/v1/products/${productId}`);

      // Step 3: try all known recipe/BOM endpoints in parallel
      const [
        recipeByVariant,
        recipeByProduct,
        recipeRows,
        moRows,
      ] = await Promise.allSettled([
        katanaRaw(`/v1/recipes?product_variant_id=${variantId}&limit=20`),
        katanaRaw(`/v1/recipes?product_id=${productId}&limit=20`),
        katanaRaw(`/v1/recipe_rows?product_variant_id=${variantId}&limit=20`),
        katanaRaw(`/v1/manufacturing_order_rows?product_variant_id=${variantId}&limit=5`),
      ]);

      return NextResponse.json({
        variant: { id: variantId, product_id: productId, sku },
        product_name: productRes.body?.name,
        recipe_endpoints: {
          "recipes?product_variant_id": recipeByVariant.status === "fulfilled" ? recipeByVariant.value : recipeByVariant.reason?.message,
          "recipes?product_id": recipeByProduct.status === "fulfilled" ? recipeByProduct.value : recipeByProduct.reason?.message,
          "recipe_rows?product_variant_id": recipeRows.status === "fulfilled" ? recipeRows.value : recipeRows.reason?.message,
          "manufacturing_order_rows?product_variant_id": moRows.status === "fulfilled" ? moRows.value : moRows.reason?.message,
        },
      });
    }

    return NextResponse.json({ error: "Paramètre sku ou id requis" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}
