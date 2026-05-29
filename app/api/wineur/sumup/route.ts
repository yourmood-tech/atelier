import { NextRequest, NextResponse } from "next/server";
import { COMPTES, SUMUP_COMPTES, calculTva, formatEcriture } from "@/lib/wineur/accounting";

const TOKEN = process.env.SUMUP_ACCESS_TOKEN!;
const BATCH = 10; // requêtes parallèles max

async function fetchDetail(txCode: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.sumup.com/v0.1/me/transactions?transaction_code=${txCode}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    if (!res.ok) return 0;
    const j = await res.json() as { events?: { fee_amount?: number }[] };
    return Math.abs(j.events?.[0]?.fee_amount ?? 0);
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start et end requis (YYYY-MM-DD)" }, { status: 400 });

  const res = await fetch(
    `https://api.sumup.com/v0.1/me/transactions/history?oldest_time=${start}T00:00:00.000Z&newest_time=${end}T23:59:59.000Z&limit=500`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  if (!res.ok) return NextResponse.json({ error: `SumUp API ${res.status}` }, { status: 502 });

  const data  = await res.json() as { items?: Record<string, unknown>[] };
  const items = (data.items ?? []).filter((t) => t.status === "SUCCESSFUL" && t.type === "PAYMENT");

  // Fetch fees en parallèle par batches
  const fees: number[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const batchFees = await Promise.all(
      batch.map((t) => fetchDetail(String(t.transaction_code ?? "")))
    );
    fees.push(...batchFees);
  }

  const ecritures = [];

  for (let i = 0; i < items.length; i++) {
    const t        = items[i];
    const email    = String(t.user ?? "").toLowerCase();
    const boutique = SUMUP_COMPTES[email];
    if (!boutique) continue;

    const brut  = Number(t.amount ?? 0);
    const frais = fees[i] ?? 0;
    const date  = String(t.timestamp ?? "").slice(0, 10);
    const lib   = `SumUp ${boutique.lieu}`;
    const { ht, tva } = calculTva(brut);

    ecritures.push(...formatEcriture(date, lib, brut, boutique.compte, frais, "CH", COMPTES.PASSAGE_SUMUP));
    void ht; void tva;
  }

  return NextResponse.json({ ecritures, count: items.length, fees_fetched: fees.filter(f => f > 0).length });
}
