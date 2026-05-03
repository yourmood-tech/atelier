import { NextRequest, NextResponse } from "next/server";
import { getAllKatanaSuppliers } from "@/lib/katana";

const BASE_URL = process.env.KATANA_BASE_URL!;
const API_KEY = process.env.KATANA_API_KEY!;

async function katanaFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Katana ${res.status} on ${path}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// GET /api/icelea-po/search-ingredient?sku=... — lookup a single Katana variant by SKU
export async function GET(req: NextRequest) {
  try {
    const sku = req.nextUrl.searchParams.get("sku")?.trim() ?? "";
    if (!sku) {
      return NextResponse.json({ ok: false, error: "sku requis" }, { status: 400 });
    }

    // Find Icelea supplier ID
    const suppliers = await getAllKatanaSuppliers();
    const icelea = suppliers.find((s) => s.name.toLowerCase().includes("icelea"));
    if (!icelea) {
      return NextResponse.json({ ok: false, error: "Fournisseur Icelea introuvable" }, { status: 404 });
    }

    // Look up variant by SKU
    const varData = await katanaFetch(
      `/v1/variants?sku=${encodeURIComponent(sku)}&limit=1`
    ) as { data?: Record<string, unknown>[] } | null;

    const variant = varData?.data?.[0];
    if (!variant) {
      return NextResponse.json({ ok: false, error: `SKU introuvable : ${sku}` }, { status: 404 });
    }

    const materialId = variant.material_id as number | null;
    if (!materialId) {
      return NextResponse.json({ ok: false, error: `SKU ${sku} n'est pas un matériau acheté` }, { status: 400 });
    }

    // Get material for name + supplier check
    const mat = await katanaFetch(`/v1/materials/${materialId}`) as Record<string, unknown> | null;
    if (!mat) {
      return NextResponse.json({ ok: false, error: "Matériau introuvable" }, { status: 404 });
    }

    if ((mat.default_supplier_id as number | null) !== icelea.id) {
      return NextResponse.json({ ok: false, error: `Ce SKU n'appartient pas au fournisseur Icelea` }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      result: {
        variantId: variant.id as number,
        name: (mat.name as string) ?? sku,
        sku: (variant.sku as string | null) ?? null,
        purchasePrice: Number(variant.purchase_price) || 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
