import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { donnees, parCaisse, rattraper } from "@/lib/pilotage-boutiques";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Pilotage des boutiques : réservé à Philippe, Stéphanie et Fabienne (aussi verrouillé dans middleware.ts).
const PILOTAGE_AUTORISES = new Set(["philippe@yourmood.net", "stephanie@yourmood.net", "fabienne@yourmood.net"]);

export async function POST(req: NextRequest) {
  try {
    const qui = (await auth())?.user?.email ?? "";
    if (!PILOTAGE_AUTORISES.has(qui)) return NextResponse.json({ ok: false, erreur: "Accès réservé." }, { status: 403 });
    const b = await req.json();
    if (b.action === "rattraper") return NextResponse.json({ ok: true, ...(await rattraper(Number(b.max) || 12)) });
    if (b.action === "caisses") return NextResponse.json({ ok: true, caisses: await parCaisse() });
    if (b.action === "donnees") return NextResponse.json({ ok: true, ...(await donnees()) });
    return NextResponse.json({ ok: false, erreur: "action inconnue" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
