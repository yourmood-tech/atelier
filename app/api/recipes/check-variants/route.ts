import { NextRequest, NextResponse } from "next/server";
import { checkKatanaVariants } from "@/lib/katana";

export async function POST(req: NextRequest) {
  try {
    const { skus } = (await req.json()) as { skus: string[] };
    if (!Array.isArray(skus) || !skus.length) {
      return NextResponse.json({ error: "skus requis" }, { status: 400 });
    }
    const results = await checkKatanaVariants(skus);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
