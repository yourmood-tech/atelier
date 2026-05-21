import { NextRequest, NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

function gidToId(gid: string): number {
  return parseInt(gid.split("/").pop()!, 10);
}

// Recherche produits Shopify pour la génération de flyer Mood Studio.
// Retourne titre, handle, image principale, prix min/max, description, vendor.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ products: [] });

  const sanitized = q.replace(/"/g, "").replace(/\s*-\s*/g, " ").trim();
  const words = [...new Set(sanitized.split(/\s+/).filter((w) => w.length > 2))];
  const queryFilter =
    words.length > 1
      ? words.map((w) => `title:*${w}*`).join(" ")
      : `title:*${sanitized}*`;

  const gql = `{
    products(first: 10, query: "${queryFilter}, status:active") {
      edges {
        node {
          id title handle vendor
          descriptionHtml
          featuredImage { url altText }
          images(first: 5) { edges { node { url altText } } }
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          tags
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
              id: string; title: string; handle: string; vendor: string;
              descriptionHtml: string;
              featuredImage?: { url: string; altText: string | null } | null;
              images: { edges: { node: { url: string; altText: string | null } }[] };
              priceRangeV2: {
                minVariantPrice: { amount: string; currencyCode: string };
                maxVariantPrice: { amount: string; currencyCode: string };
              };
              tags: string[];
            };
          }[];
        };
      };
    };

    const products = (data.data?.products?.edges ?? []).map(({ node: p }) => {
      // Nettoyer la description HTML : retirer les balises HTML, garder texte brut, max 300 chars
      const descText = (p.descriptionHtml || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);
      return {
        id: gidToId(p.id),
        title: p.title,
        handle: p.handle,
        vendor: p.vendor,
        description: descText,
        image: p.featuredImage?.url || p.images.edges[0]?.node?.url || null,
        imageAlt: p.featuredImage?.altText || p.images.edges[0]?.node?.altText || p.title,
        images: p.images.edges.map(({ node }) => ({ url: node.url, alt: node.altText || p.title })),
        priceMin: parseFloat(p.priceRangeV2.minVariantPrice.amount),
        priceMax: parseFloat(p.priceRangeV2.maxVariantPrice.amount),
        currency: p.priceRangeV2.minVariantPrice.currencyCode,
        url: `https://yourmood.net/products/${p.handle}`,
        tags: p.tags,
      };
    });

    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
