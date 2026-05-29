import { NextRequest, NextResponse } from "next/server";
import { COMPTES, SUMUP_COMPTES, calculTva, formatEcriture, aggregateDaily } from "@/lib/wineur/accounting";

const TOKEN = process.env.SUMUP_ACCESS_TOKEN!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) return NextResponse.json({ error: "start et end requis (YYYY-MM-DD)" }, { status: 400 });

  const res = await fetch(
    `https://api.sumup.com/v0.1/me/transactions/history?oldest_time=${start}T00:00:00.000Z&newest_time=${end}T23:59:59.000Z&limit=500`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  if (!res.ok) return NextResponse.json({ error: `SumUp API ${res.status}` }, { status: 502 });

  const data = await res.json() as { items?: Record<string, unknown>[] };
  const items = data.items ?? [];

  const ecritures = [];

  for (const t of items) {
    if (t.status !== "SUCCESSFUL" || t.type !== "PAYMENT") continue;

    const email = String(t.user ?? "").toLowerCase();
    const boutique = SUMUP_COMPTES[email];
    if (!boutique) continue;

    const brut = Number(t.amount ?? 0);
    const frais = Number((t as Record<string, unknown>).transaction_fee ?? 0);
    const date = String(t.timestamp ?? "").slice(0, 10);
    const libelle = `SumUp ${boutique.lieu}`;
    const { ht, tva } = calculTva(brut);

    ecritures.push(...formatEcriture(date, libelle, brut, boutique.compte, frais, "CH", COMPTES.PASSAGE_SUMUP));
    void ht; void tva;
  }

  return NextResponse.json({ ecritures, count: items.filter((t) => t.status === "SUCCESSFUL").length });
}
