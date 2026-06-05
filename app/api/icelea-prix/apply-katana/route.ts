import { NextRequest, NextResponse } from "next/server";

const KATANA_KEY = process.env.KATANA_API_KEY!;
const KATANA_BASE = "https://api.katanamrp.com";
const SLEEP = (ms: number) => new Promise(r => setTimeout(r, ms));

interface CompareRow {
  variant_id: number; variant_sku: string;
  invoice_price: number; needs_update: boolean;
}

async function patchVariant(variantId: number, price: number) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`${KATANA_BASE}/v1/variants/${variantId}`, {
      method: "PATCH",
      headers: {
        Authorization: KATANA_KEY,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ purchase_price: price }),
      cache: "no-store",
    });
    if (res.status === 429) { await SLEEP(2000 * Math.pow(1.6, attempt)); continue; }
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Katana PATCH ${variantId}: HTTP ${res.status} — ${txt.slice(0, 100)}`);
    }
    return;
  }
  throw new Error(`Rate-limit dépassé pour variant ${variantId}`);
}

export async function POST(req: NextRequest) {
  try {
    const { rows } = (await req.json()) as { rows: CompareRow[] };
    const toUpdate = (rows ?? []).filter(r => r.needs_update);
    if (!toUpdate.length) return NextResponse.json({ updated: 0, errors: 0, errorDetails: [] });

    let updated = 0;
    const errorDetails: string[] = [];

    for (const r of toUpdate) {
      try {
        await patchVariant(r.variant_id, r.invoice_price);
        updated++;
        await SLEEP(120);
      } catch (e) {
        errorDetails.push(`${r.variant_sku || r.variant_id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ updated, errors: errorDetails.length, errorDetails });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
