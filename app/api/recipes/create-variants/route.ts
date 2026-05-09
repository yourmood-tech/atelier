import { NextRequest, NextResponse } from "next/server";
import { ensureKatanaVariantsExist } from "@/lib/katana";

export async function POST(req: NextRequest) {
  try {
    const { productTitle, variants } = (await req.json()) as {
      productTitle: string;
      variants: { sku: string; variantName: string }[];
    };
    if (!productTitle || !Array.isArray(variants) || !variants.length) {
      return NextResponse.json({ error: "productTitle et variants requis" }, { status: 400 });
    }
    const results = await ensureKatanaVariantsExist(productTitle, variants);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
