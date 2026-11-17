// Droits de l'Homme : renvoie UNIQUEMENT les articles déjà en vente sur le site (fiche active + publiée).
// Les articles à venir ne sortent jamais d'ici → ils restent scellés sur la page, même en lisant son code.
import { NextResponse } from "next/server";
import { gq } from "@/lib/calendrier-photos";
import { ARTICLES, CLE_APERCU, DESSINS, RECITS, SORTIES, VIDEOS } from "@/lib/droits-homme";
import { ARTICLES_DE, FORMAT_DE, RECITS_DE } from "@/lib/droits-homme-de";

export const dynamic = "force-dynamic";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export async function OPTIONS() { return new NextResponse(null, { headers: CORS }); }

const BASE = "https://mood-tools.yourmood.net";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const de = u.searchParams.get("lang") === "de";
  const apercu = u.searchParams.get("cle") === CLE_APERCU ? Math.max(0, Math.min(30, parseInt(u.searchParams.get("apercu") || "0", 10) || 0)) : 0;
  const d = await gq(`{products(first:60,query:"tag:col-droits-homme-2026${apercu ? "" : " status:active"}"){nodes{title handle status publishedAt onlineStoreUrl featuredImage{url} images(first:12){nodes{url}}}}}`, {});
  const vus = new Map<number, { n: number; publie: string; lien: string; photo: string | null; photos: string[] }>();
  for (const p of d.products?.nodes || []) {
    const m = /Article\s+(\d+)/i.exec(p.title || ""); if (!m) continue;
    const n = parseInt(m[1], 10); if (!ARTICLES[n]) continue;
    if (apercu) { if (n > apercu) continue; p.publishedAt = `${SORTIES[n] || "2026-11-17"}T10:00:${String(n).padStart(2, "0")}Z`; }
    else if (p.status !== "ACTIVE" || !p.onlineStoreUrl || !p.publishedAt) continue;
    const prev = vus.get(n);
    if (!prev || p.publishedAt > prev.publie) vus.set(n, { n, publie: p.publishedAt, lien: `https://www.yourmood.net/products/${p.handle}`, photo: p.featuredImage?.url || null, photos: (p.images?.nodes || []).map((x: { url: string }) => x.url) });
  }
  const articles = [...vus.values()].sort((a, b) => a.n - b.n).map((a) => {
    const f = DESSINS[a.n];
    const fr = ARTICLES[a.n];
    const txt = de ? { titre: ARTICLES_DE[a.n]?.titre || fr.titre, sens: ARTICLES_DE[a.n]?.sens || fr.sens, format: fr.format ? FORMAT_DE[fr.format] || fr.format : undefined } : fr;
    const lien = de ? a.lien.replace("https://www.yourmood.net/products/", "https://www.yourmood.net/de/products/") : a.lien;
    return { ...a, lien, ...txt, recit: (de ? RECITS_DE[a.n] : RECITS[a.n]) || null, video: VIDEOS[a.n] ? `${BASE}/droits-homme/${VIDEOS[a.n]}.mp4` : null, affiche: VIDEOS[a.n] ? `${BASE}/droits-homme/${VIDEOS[a.n]}.jpg` : null, dessin: f ? `${BASE}/droits-homme/${f}` : null };
  });
  // « du jour » = tous les articles sortis le dernier jour de sortie (heure suisse) : 1, 2 ou 3 le même jour
  const jourCH = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date(iso));
  const dernier = articles.reduce((m, a) => (jourCH(a.publie) > m ? jourCH(a.publie) : m), "");
  const duJours = articles.filter((a) => jourCH(a.publie) === dernier).map((a) => a.n);
  return NextResponse.json({ articles, duJour: duJours[0] ?? null, duJours }, { headers: { ...CORS, "Cache-Control": apercu ? "no-store" : "public, s-maxage=120, stale-while-revalidate=600" } });
}
