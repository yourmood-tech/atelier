import { NextRequest, NextResponse } from "next/server";
import { getKatanaVariantByBarcode, getKatanaVariantIdBySku, getVariantStock, zeroMaterialStock } from "@/lib/katana";

// Mise à zéro d'une position de stock (demandé par Philippe le 05.11.2026) :
// on scanne un tiroir vide, l'outil montre ce que Katana croit y avoir,
// puis, après confirmation, remet la position à zéro (mouvement « RUPT- », pas une vente).

// GET ?code=… — retrouve l'article (code-barres interne, sinon SKU) et lit son stock Katana
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  if (code.length < 3) return NextResponse.json({ ok: false, error: "Code invalide" }, { status: 400 });
  try {
    let variant: { id: number; sku: string | null; name: string } | null = null;
    try {
      variant = await getKatanaVariantByBarcode(code);
    } catch {
      const id = await getKatanaVariantIdBySku(code);
      if (id) variant = { id, sku: code, name: code };
    }
    if (!variant) return NextResponse.json({ ok: false, error: `Introuvable dans Katana : ${code}` }, { status: 404 });
    const stock = await getVariantStock(variant.id);
    return NextResponse.json({ ok: true, variantId: variant.id, sku: variant.sku ?? code, name: variant.name, inStock: stock.inStock });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}

// POST { variantIds: number[] } — remet ces positions à zéro (le stock est relu juste avant)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { variantIds?: unknown };
    const ids = Array.isArray(body.variantIds)
      ? [...new Set(body.variantIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
      : [];
    if (!ids.length) return NextResponse.json({ ok: false, error: "Aucune position" }, { status: 400 });
    if (ids.length > 100) return NextResponse.json({ ok: false, error: "100 positions maximum à la fois" }, { status: 400 });
    const before = await zeroMaterialStock(ids, "Inventaire : position vide constatée au scan");
    return NextResponse.json({ ok: true, results: before });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
