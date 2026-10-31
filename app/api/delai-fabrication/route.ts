import { NextRequest, NextResponse } from "next/server";
import { avancerIndex, mettreAJourStock, avecVerrou, lireRapport } from "@/lib/delai-fabrication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Tâches de nuit (vercel.json) : ?etape=index (dimanche, plusieurs tranches) et ?etape=stock (chaque nuit).
// Lancement à la main : même adresse avec ?cle=… (variable DELAI_FAB_CLE), &forcer=1 pour reconstruire l'index.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const estCron = req.headers.get("x-vercel-cron") !== null;
  const cle = process.env.DELAI_FAB_CLE;
  if (!estCron && !(cle && p.get("cle") === cle)) {
    return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  }
  const etape = p.get("etape");
  try {
    if (etape === "index") return NextResponse.json(await avecVerrou(() => avancerIndex(p.get("forcer") === "1")));
    if (etape === "stock") return NextResponse.json(await avecVerrou(() => mettreAJourStock(p.get("essai") !== "1")));
    return NextResponse.json(await lireRapport());
  } catch (e) {
    return NextResponse.json({ erreur: String(e) }, { status: 500 });
  }
}
