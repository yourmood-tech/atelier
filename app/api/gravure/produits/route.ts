import { NextRequest, NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

type Node = { id: string; title: string; handle: string; featuredImage?: { url: string } | null };

// Recherche des PRODUITS Shopify par nom (point d'entrée = le nom sur la commande).
export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("q") || "").trim();
  if (raw.length < 2) return NextResponse.json({ produits: [] });
  const words = raw
    .replace(/["]/g, "")
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
  const filter = words.length ? words.map((w) => `title:${w}*`).join(" ") : `title:${raw}*`;
  const gql = `{ products(first: 20, query: ${JSON.stringify(filter + ", status:active")}) {
    edges { node { id title handle featuredImage { url } } } } }`;
  try {
    const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Shopify " + res.status);
    const data = await res.json();
    const produits = (data?.data?.products?.edges || []).map((e: { node: Node }) => ({
      title: e.node.title,
      handle: e.node.handle,
      image: e.node.featuredImage?.url || null,
    }));
    return NextResponse.json({ produits });
  } catch (e) {
    return NextResponse.json({ produits: [], error: String((e as Error)?.message || e) });
  }
}
