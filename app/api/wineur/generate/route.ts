import { NextRequest, NextResponse } from "next/server";
import { toCsv, aggregateDaily } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";

// Combines all sources and returns a CSV string
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    start: string;
    end: string;
    sources: string[];
    ecritures_extra?: Ecriture[]; // from file uploads (Twint, CAMT053)
  };

  const { start, end, sources, ecritures_extra = [] } = body;
  const base = new URL(req.url).origin;

  const all: Ecriture[] = [...ecritures_extra];
  const errors: string[] = [];

  await Promise.all(
    sources.map(async (src) => {
      try {
        const res = await fetch(`${base}/api/wineur/${src}?start=${start}&end=${end}`);
        if (!res.ok) { errors.push(`${src}: HTTP ${res.status}`); return; }
        const j = await res.json() as { ecritures?: Ecriture[] };
        if (j.ecritures) all.push(...j.ecritures);
      } catch (e) {
        errors.push(`${src}: ${String(e)}`);
      }
    })
  );

  const aggregated = aggregateDaily(all, "Import");
  const csv = toCsv(aggregated);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wineur_${start}_${end}.csv"`,
    },
  });
}
