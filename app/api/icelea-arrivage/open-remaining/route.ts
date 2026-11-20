import { NextRequest, NextResponse } from "next/server";
import { fetchOpenRows, fetchIceleaVmap } from "@/lib/icelea/variant-index";

export const maxDuration = 60;

type Deduct = { variantId: number; qty: number };

// Reste à livrer de TOUS les PO Icelea ouverts, groupé par PO avec SKU + n° de ligne.
// GET → état réel (après réceptions), pour le rapport de fin d'arrivage.
// POST { deduct: [{variantId, qty}] } → SIMULATION : les pièces des colis en route (factures
// envoyées, pas encore arrivées) sont retirées des lignes ouvertes, du PO le plus ancien au plus
// récent (comme la vraie réception). Rien n'est écrit dans Katana.
async function remaining(deduct: Deduct[]) {
  const [vmap, openRows] = await Promise.all([fetchIceleaVmap(), fetchOpenRows()]);
  const left = new Map<number, number>();                         // pièces à retirer par variant
  for (const d of deduct) {
    const q = Math.floor(Number(d?.qty) || 0);
    if (d?.variantId && q > 0) left.set(d.variantId, (left.get(d.variantId) ?? 0) + q);
  }
  const asked = [...left.values()].reduce((s, n) => s + n, 0);

  const rows = [...openRows]
    .sort((a, b) => (a.created || "").localeCompare(b.created || "") || a.line - b.line)
    .map((r) => {
      const l = left.get(r.vid) ?? 0;
      const take = Math.min(l, r.qty);
      if (take) left.set(r.vid, l - take);
      return { ...r, qty: r.qty - take };
    });
  // pièces en route sans ligne ouverte en face (surplus / pas commandées)
  const surplus = [...left.entries()].filter(([, n]) => n > 0)
    .map(([vid, qty]) => ({ sku: vmap[vid]?.sku ?? `variant ${vid}`, name: vmap[vid]?.name ?? null, size: vmap[vid]?.size ?? null, qty }));

  const byPo = new Map<string, { po: string; created: string; lines: { sku: string; name: string | null; size: string | null; qty: number; line: number }[] }>();
  for (const r of rows) {
    if (r.qty <= 0) continue;
    const v = vmap[r.vid];
    const g = byPo.get(r.po) || { po: r.po, created: r.created, lines: [] };
    g.lines.push({ sku: v?.sku ?? `variant ${r.vid}`, name: v?.name ?? null, size: v?.size ?? null, qty: r.qty, line: r.line });
    byPo.set(r.po, g);
  }
  const pos = [...byPo.values()]
    .sort((a, b) => (a.created || "").localeCompare(b.created || ""))
    .map((p) => ({ ...p, lines: p.lines.sort((a, b) => a.line - b.line) }));
  return {
    pos,
    totalLines: pos.reduce((s, p) => s + p.lines.length, 0),
    totalQty: pos.reduce((s, p) => s + p.lines.reduce((q, l) => q + l.qty, 0), 0),
    deducted: asked - surplus.reduce((s, x) => s + x.qty, 0),
    surplus,
  };
}

export async function GET() {
  try { return NextResponse.json(await remaining([])); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const deduct: Deduct[] = Array.isArray(body?.deduct) ? body.deduct : [];
    return NextResponse.json(await remaining(deduct));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
