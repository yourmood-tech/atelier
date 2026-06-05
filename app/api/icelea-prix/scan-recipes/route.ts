import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const KATANA_KEY = process.env.KATANA_API_KEY!;
const KATANA_BASE = "https://api.katanamrp.com";
const SLEEP = (ms: number) => new Promise(r => setTimeout(r, ms));

async function katanaGet(path: string) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(`${KATANA_BASE}${path}`, {
      headers: { Authorization: KATANA_KEY, Accept: "application/json" }, cache: "no-store",
    });
    if (res.status === 429) { await SLEEP(2000 * Math.pow(1.6, attempt)); continue; }
    if (!res.ok) throw new Error(`Katana ${res.status} ${path}`);
    return res.json();
  }
  throw new Error(`Katana rate-limit dépassé sur ${path}`);
}

// Scanne une plage de pages de recettes Katana et retourne les product_variant_id
// qui utilisent au moins un des ingredient_variant_id fournis.
// POST { variantIds: number[], pageStart: number, pageCount: number }
// → { impacted: { pvId: number, refs: string[] }[], hasMore: boolean }
export async function POST(req: NextRequest) {
  try {
    const { variantIds, pageStart, pageCount } = (await req.json()) as {
      variantIds: number[];
      pageStart: number;
      pageCount: number;
    };

    if (!variantIds?.length) return NextResponse.json({ impacted: [], hasMore: false });

    const impactedIds = new Set(variantIds);
    const pvToRefs = new Map<number, Set<string>>();
    let hasMore = false;

    for (let p = pageStart; p < pageStart + pageCount; p++) {
      const data = await katanaGet(`/v1/recipes?limit=200&page=${p}`);
      const batch: Record<string, unknown>[] = data.data ?? [];

      for (const row of batch) {
        const ingId = row.ingredient_variant_id as number;
        const pvId = row.product_variant_id as number;
        if (impactedIds.has(ingId)) {
          if (!pvToRefs.has(pvId)) pvToRefs.set(pvId, new Set());
          pvToRefs.get(pvId)!.add(String(ingId));
        }
      }

      if (batch.length === 200 && p === pageStart + pageCount - 1) {
        hasMore = true; // il y a probablement d'autres pages
      }
      if (batch.length < 200) {
        hasMore = false;
        break; // dernière page atteinte
      }

      if (p < pageStart + pageCount - 1) await SLEEP(400);
    }

    const impacted = [...pvToRefs.entries()].map(([pvId, refs]) => ({
      pvId,
      refs: [...refs],
    }));

    return NextResponse.json({ impacted, hasMore });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
