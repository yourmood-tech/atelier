// Récupère les tags d'un produit Shopify à partir de son lien (admin ou boutique).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

async function gql(query: string) {
  const r = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  return r.json();
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const url = (req.nextUrl.searchParams.get("url") || "").trim();
  if (!url) return NextResponse.json({ tags: [] });

  // .../products/15627731698041  → id numérique  |  .../products/mon-handle → handle
  const m = url.match(/products\/([^/?#]+)/);
  const seg = m ? decodeURIComponent(m[1]) : "";
  try {
    let tags: string[] = [];
    if (/^\d+$/.test(seg)) {
      const d = await gql(`{ product(id:"gid://shopify/Product/${seg}"){ tags } }`);
      tags = d?.data?.product?.tags || [];
    } else if (seg) {
      const d = await gql(`{ productByHandle(handle:${JSON.stringify(seg)}){ tags } }`);
      tags = d?.data?.productByHandle?.tags || [];
    }
    return NextResponse.json({ tags });
  } catch (e) {
    return NextResponse.json({ tags: [], error: String((e as Error)?.message || e) });
  }
}
