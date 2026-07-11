import { NextRequest, NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

function gidToId(gid: string): number {
  return parseInt(gid.split("/").pop()!, 10);
}

// GET /api/icelea-po/search-product?q=<nom produit>
// Recherche un produit par son nom via Shopify (frappe partielle), et renvoie
// ses variantes avec SKU — celles qui pourront être résolues via la recette Katana.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ ok: true, products: [] });

  // Chaque mot devient un filtre "contient" — permet une frappe approximative multi-mots
  const words = q.split(/\s+/).filter((w) => w.length > 0);
  const titleFilter = words.map((w) => `title:*${w.replace(/"/g, "")}*`).join(" ");

  const gql = `{
    products(first: 15, query: "${titleFilter}") {
      edges {
        node {
          id title status
          variants(first: 250) {
            edges { node { id sku title } }
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

    const data = (await res.json()) as {
      data?: {
        products?: {
          edges: {
            node: {
              id: string;
              title: string;
              status: string;
              variants: { edges: { node: { id: string; sku: string | null; title: string } }[] };
            };
          }[];
        };
      };
    };

    const products = (data.data?.products?.edges ?? []).map(({ node: p }) => {
      const variants = p.variants.edges
        .map(({ node: v }) => ({ sku: v.sku, title: v.title }))
        .filter((v): v is { sku: string; title: string } => !!v.sku)
        .sort((a, b) => {
          const na = parseFloat(a.title);
          const nb = parseFloat(b.title);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.title.localeCompare(b.title);
        });
      return { productId: gidToId(p.id), title: p.title, status: p.status, variants };
    });

    return NextResponse.json({ ok: true, products });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
