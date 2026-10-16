import { NextRequest, NextResponse } from "next/server";
import { tous, lire, enregistrer } from "@/lib/delais/registre";

// GET → tous les brouillons (les plus récents d'abord) ; POST { ticketId, action: "ecarter" }
export async function GET() {
  const list = (await tous()).sort((a, b) => b.recuLe.localeCompare(a.recuLe));
  return NextResponse.json({ ok: true, brouillons: list });
}
export async function POST(req: NextRequest) {
  const { ticketId, action } = (await req.json()) as { ticketId?: number; action?: string };
  const b = ticketId ? await lire(ticketId) : null;
  if (!b) return NextResponse.json({ error: "brouillon introuvable" }, { status: 404 });
  if (action === "ecarter") { b.etat = "ecarte"; await enregistrer(b); }
  return NextResponse.json({ ok: true });
}
