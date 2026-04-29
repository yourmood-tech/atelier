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
          id title status
          options { name values }
          variants(first: 250) {
            edges {
              node {
                id sku title
                selectedOptions { name value }
              }
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
              id: string; title: string; status: string;
              options: { name: string; values: string[] }[];
              variants: {
                edges: {
                  node: {
                    id: string; sku: string | null; title: string;
                    selectedOptions: { name: string; value: string }[];
                  };
                }[];
              };
            };
          }[];
        };
      };
    };

    const products = (data.data?.products?.edges ?? []).map(({ node: p }) => ({
      id: gidToId(p.id),
      title: p.title,
      status: p.status,
      options: p.options,
      variants: p.variants.edges.map(({ node: v }) => ({
        id: gidToId(v.id),
        sku: v.sku,
        title: v.title,
        options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
      })),
    }));

    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
