import { NextRequest, NextResponse, after } from "next/server";
import { tagOrdersAfterArrival, type ReceptionLine } from "@/lib/icelea/tag-orders";

export const maxDuration = 300;

// POST { lines: [{ po, variantId, qty }] } → répond tout de suite, puis marque en arrière-plan
// (Katana limite les appels par minute : quelques minutes pour un gros arrivage).
export async function POST(req: NextRequest) {
  try {
    const { lines } = (await req.json()) as { lines?: ReceptionLine[] };
    const list = (lines ?? []).filter((l) => l && l.po && l.variantId && l.qty > 0);
    if (!list.length) return NextResponse.json({ ok: true, queued: 0 });
    after(async () => { await tagOrdersAfterArrival(list); });
    return NextResponse.json({ ok: true, queued: list.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
