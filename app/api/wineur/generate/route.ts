import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import type { UnknownEntry } from "@/lib/wineur/mappings";

// Génère le CSV WinEUR sans agrégation : chaque transaction garde son libellé d'origine.
// Si des fournisseurs inconnus sont détectés, retourne JSON { unknowns, ecritures }
// pour que la page puisse afficher le résolveur avant de re-générer.
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    start: string;
    end: string;
    sources: string[];
    ecritures_extra?: Ecriture[];
  };

  const { start, end, sources, ecritures_extra = [] } = body;
  const base = new URL(req.url).origin;

  const all:      Ecriture[]     = [...ecritures_extra];
  const unknowns: UnknownEntry[] = [];
  const errors:   string[]       = [];

  await Promise.all(
    sources.map(async (src) => {
      try {
        const res = await fetch(`${base}/api/wineur/${src}?start=${start}&end=${end}`);
        if (!res.ok) { errors.push(`${src}: HTTP ${res.status}`); return; }
        const j = await res.json() as { ecritures?: Ecriture[]; unknowns?: UnknownEntry[] };
        if (j.ecritures) all.push(...j.ecritures);
        if (j.unknowns)  unknowns.push(...j.unknowns);
      } catch (e) {
        errors.push(`${src}: ${String(e)}`);
      }
    })
  );

  // Fournisseurs inconnus → retourner JSON pour résolution dans la page
  if (unknowns.length > 0) {
    return NextResponse.json({ unknowns, ecritures: all });
  }

  // Trier par date puis par compte — pas d'agrégation, libellés individuels préservés
  all.sort((a, b) => a.date.localeCompare(b.date) || a.compte.localeCompare(b.compte));

  const csv = toCsv(all);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wineur_${start}_${end}.csv"`,
      ...(errors.length > 0 ? { "X-Warnings": errors.join("; ").slice(0, 500) } : {}),
    },
  });
}
