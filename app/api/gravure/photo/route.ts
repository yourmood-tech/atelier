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

type Node = { title: string; handle: string; featuredImage?: { url: string } | null };

const na = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const wholeWord = (word: string, title: string) =>
  new RegExp("\\b" + na(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(na(title));

async function shopify(query: string): Promise<Node[]> {
  const gql = `{ products(first: 8, query: ${JSON.stringify(query)}) {
    edges { node { title handle featuredImage { url } } } } }`;
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.data?.products?.edges || []).map((e: { node: Node }) => e.node);
}

// Photo produit Shopify pour un fichier de gravure.
// Recherche dans le TITRE (title:mot*) puis ne garde que si TOUS les mots sont
// présents comme mots entiers dans le titre (panda ≠ pandanus) → pas de fausse image.
export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("q") || "").trim();
  const words = keywords(raw);
  if (!words.length) return NextResponse.json({ photo: null });

  try {
    const nodes = await shopify(words.map((w) => `title:${w}*`).join(" "));
    const hit = nodes.find((n) => n.featuredImage?.url && words.every((w) => wholeWord(w, n.title)));
    if (hit) {
      return NextResponse.json({ photo: { url: hit.featuredImage!.url, title: hit.title, handle: hit.handle } });
    }
    return NextResponse.json({ photo: null });
  } catch (e) {
    return NextResponse.json({ photo: null, error: String((e as Error)?.message || e) });
  }
}
