import { NextRequest, NextResponse } from "next/server";
import index from "@/lib/gravure/index.json";

type F = { nom: string; fichier: string; type: string; chemin: string; ap?: string };
const FILES = index as F[];

const na = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// mots non distinctifs des titres produits (marketing / matière / structure)
const STOP = new Set([
  "addon", "anneau", "deux", "tiers", "medium", "mini", "minis", "argent", "aluminium",
  "alu", "titane", "acier", "ceramique", "or", "poli", "polie", "brosse", "mat", "mood",
  "interchangeable", "pour", "bague", "les", "des", "avec", "starter", "pack", "base",
  "email", "zircons", "zircon", "glitter", "chocolat", "collection", "special", "en",
]);

const keywords = (title: string) =>
  na(title).split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));

// Fichiers .gnh candidats pour un produit (recherche par nom du produit).
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("q") || "";
  const pk = keywords(title);
  if (!pk.length) return NextResponse.json({ fichiers: [] });

  const scored = FILES.map((f) => {
    const fn = " " + na(f.nom) + " ";
    const score = pk.reduce((s, w) => (fn.includes(" " + w + " ") ? s + 1 : s), 0);
    return { f, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.f.nom.length - b.f.nom.length)
    .slice(0, 8)
    .map((x) => x.f);

  return NextResponse.json({ fichiers: scored, keywords: pk });
}
