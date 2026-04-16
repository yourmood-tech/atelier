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
      // Fetch a single product by ID to see full structure including recipe
      const product = await katanaRaw(`/v1/products/${id}`);
      return NextResponse.json({ endpoint: `/v1/products/${id}`, ...product });
    }

    if (sku) {
      // Search product by SKU
      const search = await katanaRaw(`/v1/products?search=${encodeURIComponent(sku)}&limit=3`);
      return NextResponse.json({ endpoint: `/v1/products?search=${sku}`, ...search });
    }

    return NextResponse.json({ error: "Paramètre sku ou id requis" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}
