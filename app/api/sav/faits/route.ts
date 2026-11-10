import { NextRequest, NextResponse } from "next/server";
import { faitsCommande } from "@/lib/delais/faits";
import { fournisseurBloquant } from "@/lib/delais/bloque";
import { lireConsignes, indication } from "@/lib/delais/consignes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Poste SAV (Claude Code sur l'ordinateur d'une personne de l'équipe, décision Philippe 10.11.2026) :
// il demande ici ce que l'outil des délais sait d'une commande — mêmes faits, même tableau blanc
// par fournisseur que la page /delais, sans rien recalculer de son côté.
// GET ?commande=406686&email=… avec l'en-tête x-sav-cle (variable SAV_POSTE_CLE).
export async function GET(req: NextRequest) {
  const cle = process.env.SAV_POSTE_CLE;
  if (!cle || req.headers.get("x-sav-cle") !== cle) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const commande = (p.get("commande") ?? "").replace(/\D/g, "") || null;
  const email = (p.get("email") ?? "").trim();
  if (!commande && !email) return NextResponse.json({ erreur: "commande ou email requis" }, { status: 400 });
  try {
    const [faits, consignes] = await Promise.all([faitsCommande(commande, email), lireConsignes()]);
    const bloque = fournisseurBloquant(faits);
    return NextResponse.json({ faits, bloque, indication: indication(consignes, bloque), tableauBlanc: consignes });
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
