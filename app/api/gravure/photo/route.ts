import { NextRequest, NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

// mots parasites des noms de fichiers de gravure (pas des noms de motif)
const STOP = new Set([
  "addon", "anneau", "deux", "tiers", "medium", "mini", "minis", "poly", "polymere",
  "polymère", "alu", "aluminium", "titane", "acier", "argent", "ceramique", "céramique",
  "laser", "base", "brun", "brune", "neutre", "gris", "doré", "dore", "ok", "test",
  "vecteur", "balayage", "deblayage", "interieur", "gravure", "mm",
]);

function keywords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-zà-ÿ0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^t?\d+$/.test(w) && !/^z\d/.test(w));
}

async function shopify(query: string) {
  const gql = `{ products(first: 5, query: ${JSON.stringify(query)}) {
    edges { node { title handle featuredImage { url } } } } }`;
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.data?.products?.edges || []).map((e: { node: { title: string; handle: string; featuredImage?: { url: string } | null } }) => e.node);
}

// Photo produit Shopify pour un fichier de gravure (recherche plein texte, pas de wildcard).
export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!raw) return NextResponse.json({ photo: null });
  const words = keywords(raw);
  const tries: string[] = [];
  if (words.length) tries.push(words.join(" "));
  if (words.length > 1) tries.push(words.sort((a, b) => b.length - a.length)[0]); // mot le plus distinctif
  if (!tries.length) tries.push(raw);

  try {
    for (const q of tries) {
      const nodes = await shopify(q);
      const withImg = nodes.find((n: { featuredImage?: { url: string } | null }) => n.featuredImage?.url);
      if (withImg) {
        return NextResponse.json({ photo: { url: withImg.featuredImage.url, title: withImg.title, handle: withImg.handle } });
      }
    }
    return NextResponse.json({ photo: null });
  } catch (e) {
    return NextResponse.json({ photo: null, error: String((e as Error)?.message || e) });
  }
}
