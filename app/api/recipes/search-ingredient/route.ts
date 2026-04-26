import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://app.katanamrp.com/api";
const API_KEY = process.env.KATANA_API_KEY!;

async function katanaGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    cache: "no-store",
  });
  return res.json();
}

function looksLikeSize(name: string): boolean {
  return /^\d{2,3}$/.test(name.trim());
}

type KatanaIngredient = {
  id: number;
  name: string;
  kind: "material" | "product";
  variants: { id: number; sku: string | null; name: string }[];
  hasTaille: boolean;
};

async function searchMaterials(q: string): Promise<KatanaIngredient[]> {
  const raw = await katanaGet(`/v1/materials?search=${encodeURIComponent(q)}&limit=15`);
  const rows: { id: number; name: string; variants?: unknown[] }[] =
    Array.isArray(raw) ? raw : (raw?.data ?? []);

  return Promise.all(
    rows.map(async (m) => {
      let variants: { id: number; sku: string | null; name: string }[] = [];
      if (Array.isArray(m.variants) && m.variants.length > 0) {
        variants = (m.variants as { id: number; sku?: string | null; name?: string | null }[]).map((v) => ({
          id: v.id, sku: v.sku ?? null, name: v.name ?? "",
        }));
      } else {
        const full = await katanaGet(`/v1/materials/${m.id}`);
        const fv: { id: number; sku?: string | null; name?: string | null }[] =
          Array.isArray(full?.variants) ? full.variants : [];
        variants = fv.map((v) => ({ id: v.id, sku: v.sku ?? null, name: v.name ?? "" }));
      }
      const hasTaille = variants.length > 1 && variants.every((v) => looksLikeSize(v.name));
      return { id: m.id, name: m.name, kind: "material" as const, variants, hasTaille };
    })
  );
}

async function searchProducts(q: string): Promise<KatanaIngredient[]> {
  const raw = await katanaGet(`/v1/products?search=${encodeURIComponent(q)}&limit=15`);
  const rows: { id: number; name: string; variants?: unknown[] }[] =
    Array.isArray(raw) ? raw : (raw?.data ?? []);

  return rows.map((p) => {
    const variants = (p.variants as { id: number; sku?: string | null; name?: string | null }[] ?? []).map((v) => ({
      id: v.id, sku: v.sku ?? null, name: v.name ?? "",
    }));
    const hasTaille = variants.length > 1 && variants.every((v) => looksLikeSize(v.name));
    return { id: p.id, name: p.name, kind: "product" as const, variants, hasTaille };
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ materials: [] });

  const debug = req.nextUrl.searchParams.has("debug");

  try {
    const [materials, products] = await Promise.allSettled([
      searchMaterials(q),
      searchProducts(q),
    ]);

    if (debug) {
      return NextResponse.json({
        materials: materials.status === "fulfilled" ? materials.value : { error: String(materials.reason) },
        products: products.status === "fulfilled" ? products.value : { error: String(products.reason) },
      });
    }

    const result: KatanaIngredient[] = [
      ...(materials.status === "fulfilled" ? materials.value : []),
      ...(products.status === "fulfilled" ? products.value : []),
    ];

    return NextResponse.json({ materials: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
