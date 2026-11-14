import { NextRequest, NextResponse } from "next/server";
import { changerStatut, creer, ecarts, enregistrer, produit, seances } from "@/lib/comptage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Comptage physique (page /comptage, derrière la connexion de l'atelier).
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    switch (b.action) {
      case "seances": return NextResponse.json({ ok: true, seances: await seances() });
      case "creer": return NextResponse.json({ ok: true, seance: await creer(String(b.raison ?? "")) });
      case "statut": return NextResponse.json({ ok: true, seance: await changerStatut(Number(b.sid), b.statut) });
      case "produit": return NextResponse.json({ ok: true, ...(await produit(Number(b.sid), String(b.code ?? ""))) });
      case "enregistrer": return NextResponse.json({ ok: true, ...(await enregistrer(Number(b.sid), String(b.nom ?? ""), b.lignes ?? [])) });
      case "ecarts": return NextResponse.json({ ok: true, ...(await ecarts(Number(b.sid))) });
      default: return NextResponse.json({ ok: false, erreur: "action inconnue" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
