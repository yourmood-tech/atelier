// R&D — retrouver sur yourmood.net une nouveauté déjà en ligne (par étiquette ou par les mots de son nom)
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DOMAIN = process.env.MOOD_SHOPIFY_DOMAIN || process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN;
const VIDES = new Set(["anneau", "addon", "addons", "deux", "tiers", "medium", "mediums", "mini", "minis", "pack", "en", "argent", "aluminium", "acier", "pour", "bague", "mood", "interchangeable", "de", "du", "des", "la", "le", "les", "et", "avec", "serti", "sertis", "925", "suite", "tous", "toutes", "coffrets", "coffret"]);

function mots(t: string): string[] {
  return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((w) => w.length > 2 && !VIDES.has(w));
}

async function chercher(q: string) {
  const r = await fetch(`https://${DOMAIN}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN as string, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `query($q:String!){products(first:30,query:$q,sortKey:CREATED_AT){nodes{id title createdAt publishedAt status tags featuredImage{url}}}}`, variables: { q } }),
  });
  const j = await r.json();
  return (j?.data?.products?.nodes || []) as Array<{ id: string; title: string; createdAt: string; publishedAt: string | null; status: string; tags: string[]; featuredImage: { url: string } | null }>;
}

export async function GET(request: Request) {
  if (!DOMAIN || !TOKEN) return NextResponse.json({ error: "accès Shopify absent" }, { status: 503 });
  const u = new URL(request.url);
  const nom = u.searchParams.get("nom") || "";
  const tag = (u.searchParams.get("tag") || "").trim();
  const avant = u.searchParams.get("avant"); // ne garder que les fiches créées avant cette date (fin de semaine)
  let res: Awaited<ReturnType<typeof chercher>> = [];
  if (tag && !/^https?:|^code:/i.test(tag)) res = await chercher(`tag:'${tag.replace(/'/g, "")}' AND status:active`);
  const m = mots(nom);
  if (!res.length && m.length) {
    res = (await chercher(m.map((w) => `title:*${w}*`).join(" AND ") + " AND status:active"))
      .filter((p) => { const t = new Set(mots(p.title)); return m.every((w) => [...t].some((x) => x.startsWith(w) || w.startsWith(x))); });
  }
  if (avant) res = res.filter((p) => p.createdAt <= avant + "T23:59:59Z");
  return NextResponse.json({
    produits: res.slice(0, 30).map((p) => ({ id: p.id.split("/").pop(), title: p.title, createdAt: p.createdAt, image: p.featuredImage?.url || null })),
  });
}
