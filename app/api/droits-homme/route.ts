// Droits de l'Homme : renvoie UNIQUEMENT les articles déjà en vente sur le site (fiche active + publiée).
// Les articles à venir ne sortent jamais d'ici → ils restent scellés sur la page, même en lisant son code.
import { NextResponse } from "next/server";
import { gq } from "@/lib/calendrier-photos";
import { ARTICLES, DESSINS } from "@/lib/droits-homme";

export const dynamic = "force-dynamic";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export async function OPTIONS() { return new NextResponse(null, { headers: CORS }); }

const BASE = "https://mood-tools.yourmood.net";

export async function GET() {
  const d = await gq(`{products(first:60,query:"tag:col-droits-homme-2026 status:active"){nodes{title handle status publishedAt onlineStoreUrl featuredImage{url}}}}`, {});
  const vus = new Map<number, { n: number; publie: string; lien: string; photo: string | null }>();
  for (const p of d.products?.nodes || []) {
    if (p.status !== "ACTIVE" || !p.onlineStoreUrl || !p.publishedAt) continue;
    const m = /Article\s+(\d+)/i.exec(p.title || ""); if (!m) continue;
    const n = parseInt(m[1], 10); if (!ARTICLES[n]) continue;
    const prev = vus.get(n);
    if (!prev || p.publishedAt > prev.publie) vus.set(n, { n, publie: p.publishedAt, lien: `https://www.yourmood.net/products/${p.handle}`, photo: p.featuredImage?.url || null });
  }
  const articles = [...vus.values()].sort((a, b) => a.n - b.n).map((a) => {
    const f = DESSINS[a.n];
    return { ...a, ...ARTICLES[a.n], dessin: f ? `${BASE}/droits-homme/${f}` : null };
  });
  const duJour = [...articles].sort((a, b) => (a.publie < b.publie ? 1 : -1))[0] || null;
  return NextResponse.json({ articles, duJour: duJour ? duJour.n : null }, { headers: { ...CORS, "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
