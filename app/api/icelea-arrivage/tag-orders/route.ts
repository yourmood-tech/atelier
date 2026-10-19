import { NextRequest, NextResponse } from "next/server";
import { startTagJob, runTagJob, type ReceptionLine } from "@/lib/icelea/tag-orders";

export const maxDuration = 300;

// Marquage des commandes clientes après un arrivage (ou un colis en route), par tranches :
//  POST { lines: [{ po, variantId, qty }], enroute?: "jj.mm.aaaa" } → crée le travail et fait une 1re tranche ;
//  POST { jobId } → tranche suivante. Réponse { jobId, finished, faits, total, reports } : la page relance
//  tant que finished est faux (Katana limite les appels par minute : plusieurs minutes pour un gros colis).
// enroute = colis en route, arrivée prévue ce jour-là : rien n'entre en stock, étiquette « Icelea-enroute ».
export async function POST(req: NextRequest) {
  try {
    const { lines, enroute, jobId } = (await req.json()) as { lines?: ReceptionLine[]; enroute?: string; jobId?: string };
    if (jobId) return NextResponse.json(await runTagJob(jobId));
    if (enroute !== undefined && !/^\d\d\.\d\d\.\d{4}$/.test(enroute)) return NextResponse.json({ error: "date d'arrivée attendue au format jj.mm.aaaa" }, { status: 400 });
    const list = (lines ?? []).filter((l) => l && l.po && l.variantId && l.qty > 0);
    if (!list.length) return NextResponse.json({ jobId: null, finished: true, faits: 0, total: 0, reports: [] });
    return NextResponse.json(await runTagJob(await startTagJob(list, enroute)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
