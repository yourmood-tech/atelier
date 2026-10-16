import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enregistrerRetour, marquerTraite, listes, type TypeSav } from "@/lib/sav";

// GET → retours non traités, traités récents, échanges orphelins
// POST { action: "retour", commande, type } | { action: "traite", orderId, tag }
export async function GET() {
  return NextResponse.json({ ok: true, ...(await listes()) });
}
export async function POST(req: NextRequest) {
  try {
    const par = (await auth())?.user?.email ?? "inconnu";
    const b = (await req.json()) as { action?: string; commande?: string; type?: number; orderId?: number; tag?: string };
    if (b.action === "retour") {
      if (!b.commande || ![1, 2, 3].includes(Number(b.type))) return NextResponse.json({ error: "n° de commande et type requis" }, { status: 400 });
      return NextResponse.json({ ok: true, retour: await enregistrerRetour(b.commande, Number(b.type) as TypeSav, par) });
    }
    if (b.action === "traite" && b.orderId && b.tag) { await marquerTraite(b.orderId, b.tag, par); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
