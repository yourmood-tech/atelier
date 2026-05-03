import { NextRequest, NextResponse } from "next/server";
import { getAllKatanaSuppliers } from "@/lib/katana";

const BASE_URL = process.env.KATANA_BASE_URL!;
const API_KEY = process.env.KATANA_API_KEY!;

async function katanaFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Katana ${res.status} on ${path}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // Find Icelea supplier ID
    const suppliers = await getAllKatanaSuppliers();
    const icelea = suppliers.find((s) => s.name.toLowerCase().includes("icelea"));
    if (!icelea) {
      return NextResponse.json({ ok: false, error: "Fournisseur Icelea introuvable" }, { status: 404 });
    }

    // Search materials by name, then filter by Icelea supplier
    const data = await katanaFetch(
      `/v1/materials?search=${encodeURIComponent(q)}&limit=30`
    ) as { data?: Record<string, unknown>[] } | null;

    const materials = (data?.data ?? []).filter(
      (m) => (m.default_supplier_id as number | null) === icelea.id
    );

    if (!materials.length) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // For each material, find its variant to get variantId + purchasePrice + sku
    const results = (
      await Promise.allSettled(
        materials.map(async (mat) => {
          const matId = mat.id as number;
          const matName = (mat.name as string) ?? "";

          const varData = await katanaFetch(
            `/v1/variants?material_id=${matId}&limit=5`
          ) as { data?: Record<string, unknown>[] } | null;

          const variants = varData?.data ?? [];
          if (!variants.length) return null;

          // Prefer variant with lowest purchase_price > 0, else first
          const v = variants.find((x) => Number(x.purchase_price) > 0) ?? variants[0];

          return {
            variantId: v.id as number,
            name: matName,
            sku: (v.sku as string | null) ?? null,
            purchasePrice: Number(v.purchase_price) || 0,
          };
        })
      )
    )
      .filter((r): r is PromiseFulfilledResult<NonNullable<{ variantId: number; name: string; sku: string | null; purchasePrice: number }>> =>
        r.status === "fulfilled" && r.value !== null
      )
      .map((r) => r.value);

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
