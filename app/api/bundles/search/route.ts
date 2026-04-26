import { NextRequest, NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

function gidToId(gid: string): number {
  return parseInt(gid.split("/").pop()!, 10);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ products: [] });

  const gql = `{
    products(first: 10, query: "title:*${q.replace(/"/g, "")}*") {
      edges {
        node {
          id
          title
          status
          variants(first: 30) {
            edges {
              node { id title sku }
            }
          }
        }
      }
    }
  }`;

  try {
    const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql }),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Shopify GraphQL ${res.status}`);

    const data = await res.json() as {
      data?: {
        products?: {
          edges: {
            node: {
              id: string;
              title: string;
              status: string;
              variants: { edges: { node: { id: string; title: string; sku: string | null } }[] };
            };
          }[];
        };
      };
    };

    const products = (data.data?.products?.edges ?? []).map(({ node: p }) => ({
      id: gidToId(p.id),
      title: p.title,
      status: p.status,
      variants: p.variants.edges.map(({ node: v }) => ({
        id: gidToId(v.id),
        title: v.title,
        sku: v.sku,
      })),
    }));

    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
