import { NextRequest, NextResponse } from "next/server";
import {
  getAllKatanaSuppliers,
  getKatanaVariantsBySkus,
  createKatanaPOWithRows,
} from "@/lib/katana";

export const maxDuration = 300;

type POItem = { sku: string; name: string; quantity: number; supplierName: string };

function norm(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

// POST { items: POItem[], expectedArrival?: string }
//   → { pos: [{ supplierName, poNumber, poId, katanaUrl, lineCount, totalQty }], unresolvedSkus, unmatchedSuppliers }
export async function POST(req: NextRequest) {
  try {
    const { items, expectedArrival } = (await req.json()) as {
      items: POItem[];
      expectedArrival?: string | null;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Aucune ligne à commander" }, { status: 400 });
    }

    // 1. Resolve supplier names → Katana supplier ids
    const suppliers = await getAllKatanaSuppliers();
    const supplierByName = new Map(suppliers.map((s) => [norm(s.name), s]));

    // 2. Resolve ALL SKUs → variant id + purchase price in one grouped call
    //    (Katana = 60 req/min ; un appel par SKU dépasse le quota et provoque un timeout)
    const variantBySku = await getKatanaVariantsBySkus(items.map((it) => it.sku));

    // 3. Group items by supplier name
    const groups = new Map<string, POItem[]>();
    for (const it of items) {
      const key = it.supplierName || "(sans fournisseur)";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }

    const pos: {
      supplierName: string;
      poNumber: string;
      poId: number;
      katanaUrl: string;
      lineCount: number;
      totalQty: number;
    }[] = [];
    const unresolvedSkus: string[] = [];
    const unmatchedSuppliers: string[] = [];

    for (const [supplierName, groupItems] of groups) {
      const supplier = supplierByName.get(norm(supplierName));
      if (!supplier) {
        unmatchedSuppliers.push(supplierName);
        continue;
      }

      // 4. Build PO rows from the pre-resolved variant map
      const rows: { variantId: number; quantity: number; pricePerUnit: number }[] = [];
      for (const it of groupItems) {
        const variant = variantBySku.get(it.sku);
        if (!variant) {
          unresolvedSkus.push(it.sku);
          continue;
        }
        rows.push({
          variantId: variant.id,
          quantity: Math.round(it.quantity),
          pricePerUnit: variant.purchasePrice ?? 0,
        });
      }

      if (rows.length === 0) continue;

      // 5. Create the purchase order in Katana
      const po = await createKatanaPOWithRows(
        supplier.id,
        rows,
        expectedArrival ?? null,
        "RA"
      );

      pos.push({
        supplierName,
        poNumber: po.number,
        poId: po.id,
        katanaUrl: `https://app.katanamrp.com/purchase-orders/${po.id}`,
        lineCount: rows.length,
        totalQty: rows.reduce((s, r) => s + r.quantity, 0),
      });
    }

    return NextResponse.json({ pos, unresolvedSkus, unmatchedSuppliers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
