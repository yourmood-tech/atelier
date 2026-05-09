import { NextRequest, NextResponse } from "next/server";
import { pushRecipesToKatana } from "@/lib/katana";

export async function POST(req: NextRequest) {
  try {
    const { katanaProductId, rows } = (await req.json()) as {
      katanaProductId: number;
      rows: { productVariantId: number; ingredientVariantId: number; quantity: number }[];
    };
    if (!katanaProductId || !Array.isArray(rows) || !rows.length) {
      return NextResponse.json({ error: "katanaProductId et rows requis" }, { status: 400 });
    }
    const result = await pushRecipesToKatana(katanaProductId, rows);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
