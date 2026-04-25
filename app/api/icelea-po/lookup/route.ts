import { NextRequest, NextResponse } from "next/server";
import { getKatanaVariantByBarcode } from "@/lib/katana";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { barcode?: string };
    const barcode = body.barcode?.trim();
    if (!barcode) {
      return NextResponse.json({ error: "barcode requis" }, { status: 400 });
    }

    const variant = await getKatanaVariantByBarcode(barcode);
    return NextResponse.json({ ok: true, ...variant });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
