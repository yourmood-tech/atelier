import { NextRequest, NextResponse, after } from "next/server";
import { tagOrdersAfterArrival, type ReceptionLine } from "@/lib/icelea/tag-orders";

export const maxDuration = 300;

// POST { lines: [{ po, variantId, qty }], enroute?: "jj.mm.aaaa" } → répond tout de suite, puis marque en arrière-plan
// (enroute = colis en route, arrivée prévue ce jour-là : rien n'entre en stock, étiquette « Icelea-enroute »)
// (Katana limite les appels par minute : quelques minutes pour un gros arrivage).
export async function POST(req: NextRequest) {
  try {
    const { lines, enroute } = (await req.json()) as { lines?: ReceptionLine[]; enroute?: string };
    if (enroute !== undefined && !/^\d\d\.\d\d\.\d{4}$/.test(enroute)) return NextResponse.json({ error: "date d'arrivée attendue au format jj.mm.aaaa" }, { status: 400 });
    const list = (lines ?? []).filter((l) => l && l.po && l.variantId && l.qty > 0);
    if (!list.length) return NextResponse.json({ ok: true, queued: 0 });
    after(async () => { await tagOrdersAfterArrival(list, enroute); });
    return NextResponse.json({ ok: true, queued: list.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
