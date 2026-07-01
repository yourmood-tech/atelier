import { NextRequest, NextResponse } from "next/server";
import { refreshIndexStep } from "@/lib/icelea/variant-index";

export const maxDuration = 60;

// POST { restart? } → avance la construction de l'index d'une tranche.
// L'UI rappelle jusqu'à phase "done".
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const progress = await refreshIndexStep(!!body.restart);
    return NextResponse.json(progress);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
