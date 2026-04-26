import { NextRequest, NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

async function shopifyGet(path: string) {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}${path}`, {
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ products: [] });

  try {
    const data = await shopifyGet(
      `/products.json?title=${encodeURIComponent(q)}&limit=10&status=any&fields=id,title,variants,status`
    );
    const products = (data.products ?? []).map((p: {
      id: number;
      title: string;
      status: string;
      variants: { id: number; title: string; sku: string | null }[];
    }) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      variants: p.variants.map((v) => ({ id: v.id, title: v.title, sku: v.sku })),
    }));
    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
