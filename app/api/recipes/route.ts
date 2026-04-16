import { NextRequest, NextResponse } from "next/server";
import { searchRecipes } from "@/lib/katana";
import type { RecipesApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    if (!q) {
      return NextResponse.json<RecipesApiResponse>(
        { ok: false, error: "Paramètre q requis" },
        { status: 400 }
      );
    }

    const items = await searchRecipes(q, limit);
    return NextResponse.json<RecipesApiResponse>({ ok: true, count: items.length, items });
  } catch (error) {
    return NextResponse.json<RecipesApiResponse>(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
