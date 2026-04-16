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

  try {
    if (id) {
      // Fetch single product by ID — includes recipe data
      const product = await katanaRaw(`/v1/products/${id}`);
      return NextResponse.json({ endpoint: `/v1/products/${id}`, ...product });
    }

    if (sku) {
      // Step 1: find variant by SKU
      const variantRes = await katanaRaw(`/v1/variants?sku=${encodeURIComponent(sku)}&limit=3`);

      // Step 2: if variant found, fetch full product by product_id
      const variants = (variantRes.body?.data ?? []) as Record<string, unknown>[];
      const productId = variants[0]?.product_id;

      if (productId) {
        const productRes = await katanaRaw(`/v1/products/${productId}`);
        return NextResponse.json({
          variant_search: { endpoint: `/v1/variants?sku=${sku}`, ...variantRes },
          product_detail: { endpoint: `/v1/products/${productId}`, ...productRes },
        });
      }

      return NextResponse.json({
        variant_search: { endpoint: `/v1/variants?sku=${sku}`, ...variantRes },
        product_detail: null,
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
