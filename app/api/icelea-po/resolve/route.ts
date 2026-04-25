import { NextRequest, NextResponse } from "next/server";
import { getRecipeWithSuppliers } from "@/lib/katana";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { sku?: string };
    const sku = body.sku?.trim();
    if (!sku) {
      return NextResponse.json({ error: "sku requis" }, { status: 400 });
    }

    const recipe = await getRecipeWithSuppliers(sku);
    if (!recipe) {
      return NextResponse.json(
        { error: `Recette Katana introuvable pour SKU ${sku}` },
        { status: 404 }
      );
    }

    const icelea = recipe.ingredients.filter(
      (i) => i.supplier?.name?.toLowerCase().includes("icelea")
    );

    if (!icelea.length) {
      return NextResponse.json(
        { error: `Aucun composant Icelea dans la recette de "${recipe.name}"` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      productName: recipe.name,
      icelea: icelea.map((i) => ({
        variantId: i.id,
        name: i.name,
        sku: i.sku ?? null,
        purchasePrice: i.purchasePrice ?? 0,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
