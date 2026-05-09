import { NextRequest, NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

function gidToId(gid: string): number {
  return parseInt(gid.split("/").pop()!, 10);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const idParam = req.nextUrl.searchParams.get("id")?.trim();

  if (!q && !idParam) return NextResponse.json({ products: [] });

  const fuzzy = req.nextUrl.searchParams.get("fuzzy") === "1";

  let queryFilter: string;
  if (idParam) {
    queryFilter = `id:${idParam}`;
  } else {
    const words = q!.split(/\s+/).filter((w) => w.length > 0);
    // Strip quotes and hyphens ("-" = NOT operator in Shopify search syntax).
    // For multi-word queries, AND-join per-word wildcards so each word is matched
    // independently — avoids exact-phrase mismatch when the title still has a hyphen.
    const sanitized = q!.replace(/"/g, "").replace(/\s*-\s*/g, " ").trim();
    const sigWords = [...new Set(sanitized.split(/\s+/).filter((w) => w.length > 2))];
    queryFilter =
      sigWords.length > 1
        ? sigWords.map((w) => `title:*${w}*`).join(" ")
        : `title:*${sanitized}*`;
  }

  const gql = `{
    products(first: 10, query: "${queryFilter}") {
      edges {
        node {
          id title status descriptionHtml
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
              id: string; title: string; status: string; descriptionHtml: string;
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
      descriptionHtml: p.descriptionHtml,
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
