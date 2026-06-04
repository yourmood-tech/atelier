import { NextRequest, NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

// Vérifie quels SKUs sont encore actifs (produit status:ACTIVE) sur Shopify.
// POST { skus: string[] } → { activeSkus: string[] }
export async function POST(req: NextRequest) {
  try {
    const { skus } = (await req.json()) as { skus: string[] };
    if (!Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({ activeSkus: [] });
    }

    const activeSkus = new Set<string>();
    const BATCH = 50;

    for (let i = 0; i < skus.length; i += BATCH) {
      const batch = skus.slice(i, i + BATCH);
      const queryFilter = batch.map((s) => `sku:${s}`).join(" OR ");

      const gql = `{
        productVariants(first: 250, query: "${queryFilter}") {
          edges {
            node {
              sku
              product { status }
            }
          }
        }
      }`;

      const res = await fetch(
        `https://${STORE}/admin/api/${VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: gql }),
          cache: "no-store",
        }
      );

      if (!res.ok) continue;

      const data = (await res.json()) as {
        data?: {
          productVariants?: {
            edges: { node: { sku: string; product: { status: string } } }[];
          };
        };
      };

      for (const edge of data.data?.productVariants?.edges ?? []) {
        if (edge.node.product.status === "ACTIVE") {
          activeSkus.add(edge.node.sku);
        }
      }
    }

    return NextResponse.json({ activeSkus: [...activeSkus] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
