import { NextRequest, NextResponse } from "next/server";
import { fixKatanaVariantConfigs } from "@/lib/katana";

export async function POST(req: NextRequest) {
  try {
    const { katanaProductId, variants } = (await req.json()) as {
      katanaProductId: number;
      variants: { katanaId: number; sku: string; options: Record<string, string> }[];
    };
    if (!katanaProductId || !Array.isArray(variants) || !variants.length) {
      return NextResponse.json({ error: "katanaProductId et variants requis" }, { status: 400 });
    }
    const results = await fixKatanaVariantConfigs(katanaProductId, variants);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
