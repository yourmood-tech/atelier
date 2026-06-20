import { NextRequest, NextResponse } from "next/server";
import { listOpenPOsForSupplier } from "@/lib/katana";

// GET /api/icelea-po/open-pos?supplierId=755704
//   → { pos: [{ id, orderNo, rowCount, createdDate }] }
export async function GET(req: NextRequest) {
  try {
    const supplierId = Number(req.nextUrl.searchParams.get("supplierId"));
    if (!supplierId) {
      return NextResponse.json({ error: "supplierId requis" }, { status: 400 });
    }
    const pos = await listOpenPOsForSupplier(supplierId);
    return NextResponse.json({ pos });
  } catch (err) {
    console.error("[icelea-po/open-pos] ERROR:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
