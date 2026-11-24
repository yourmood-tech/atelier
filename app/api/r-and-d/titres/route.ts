// R&D — le vrai nom des fiches yourmood.net à partir de leur numéro (détail « pièce par pièce »)
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DOMAIN = process.env.MOOD_SHOPIFY_DOMAIN || process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN;

export async function GET(request: Request) {
  if (!DOMAIN || !TOKEN) return NextResponse.json({ error: "accès Shopify absent" }, { status: 503 });
  const ids = (new URL(request.url).searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s)).slice(0, 200);
  const titres: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const lot = ids.slice(i, i + 100).map((id) => `gid://shopify/Product/${id}`);
    const r = await fetch(`https://${DOMAIN}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN as string, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title}}}`, variables: { ids: lot } }),
    });
    const j = await r.json();
    for (const n of j?.data?.nodes || []) if (n?.id) titres[String(n.id).split("/").pop() as string] = n.title;
  }
  return NextResponse.json({ titres });
}
