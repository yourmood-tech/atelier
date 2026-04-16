import { NextRequest, NextResponse } from "next/server";
import { lookupShopifyId } from "@/lib/shopify";
import { getRecipeWithSuppliers } from "@/lib/katana";
import type { RecipeLookupApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";

    if (!id) {
      return NextResponse.json<RecipeLookupApiResponse>(
        { ok: false, error: "Paramètre id requis" },
        { status: 400 }
      );
    }

    const shopify = await lookupShopifyId(id);
    const recipe = shopify.sku
      ? await getRecipeWithSuppliers(shopify.sku)
      : null;

    return NextResponse.json<RecipeLookupApiResponse>({
      ok: true,
      result: { shopify, recipe },
    });
  } catch (error) {
    return NextResponse.json<RecipeLookupApiResponse>(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}
