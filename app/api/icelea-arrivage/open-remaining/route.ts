import { NextResponse } from "next/server";
import { fetchOpenRows, fetchIceleaVmap } from "@/lib/icelea/variant-index";

export const maxDuration = 60;

// GET → reste à livrer de TOUS les PO Icelea ouverts (à froid, après réceptions),
// groupé par PO avec SKU + n° de ligne. Pour le rapport de fin d'arrivage.
export async function GET() {
  try {
    const [vmap, openRows] = await Promise.all([fetchIceleaVmap(), fetchOpenRows()]);
    const byPo = new Map<string, { po: string; created: string; lines: { sku: string; name: string | null; size: string | null; qty: number; line: number }[] }>();
    for (const r of openRows) {
      const v = vmap[r.vid];
      const g = byPo.get(r.po) || { po: r.po, created: r.created, lines: [] };
      g.lines.push({ sku: v?.sku ?? `variant ${r.vid}`, name: v?.name ?? null, size: v?.size ?? null, qty: r.qty, line: r.line });
      byPo.set(r.po, g);
    }
    const pos = [...byPo.values()]
      .sort((a, b) => (a.created || "").localeCompare(b.created || ""))
      .map((p) => ({ ...p, lines: p.lines.sort((a, b) => a.line - b.line) }));
    return NextResponse.json({
      pos,
      totalLines: pos.reduce((s, p) => s + p.lines.length, 0),
      totalQty: pos.reduce((s, p) => s + p.lines.reduce((q, l) => q + l.qty, 0), 0),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
