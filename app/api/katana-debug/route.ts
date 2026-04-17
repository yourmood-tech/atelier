import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.KATANA_BASE_URL!;
const API_KEY = process.env.KATANA_API_KEY!;

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

  try {
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
