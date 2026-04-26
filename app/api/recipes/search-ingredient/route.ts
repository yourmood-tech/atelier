import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.KATANA_BASE_URL!;
const API_KEY = process.env.KATANA_API_KEY!;

async function katanaGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${API_KEY}` },
    cache: "no-store",
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

function looksLikeSize(s: string): boolean {
  return /^\d{2,3}$/.test(s.trim());
}

function getTailleFromConfig(configAttributes: { config_name: string; config_value: string }[]): string | null {
  const t = configAttributes.find(
    (a) => ["taille", "size", "ring size"].includes(a.config_name.toLowerCase())
  );
  return t?.config_value ?? null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ materials: [] });

  try {
    // Search variants by SKU prefix — the only reliable Katana search
    const varRes = await katanaGet(`/v1/variants?sku=${encodeURIComponent(q)}&limit=50`) as {
      data?: {
        id: number;
        sku: string | null;
        material_id: number | null;
        product_id: number | null;
        config_attributes: { config_name: string; config_value: string }[];
      }[];
    } | null;

    const variantRows = varRes?.data ?? [];

    // Group variants by parent (material_id or product_id)
    const groups = new Map<string, typeof variantRows>();
    for (const v of variantRows) {
      const key = v.material_id ? `mat-${v.material_id}` : `prod-${v.product_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(v);
    }

    // Fetch parent names and build result
    const materials = await Promise.all(
      [...groups.entries()].map(async ([key, variants]) => {
        const isMaterial = key.startsWith("mat-");
        const parentId = parseInt(key.split("-")[1]);

        let name = q;
        try {
          const parent = await katanaGet(
            isMaterial ? `/v1/materials/${parentId}` : `/v1/products/${parentId}`
          ) as { name?: string } | null;
          if (parent?.name) name = parent.name;
        } catch { /* use SKU as fallback */ }

        const mapped = variants.map((v) => {
          const tailleAttr = getTailleFromConfig(v.config_attributes);
          const variantName = tailleAttr ?? v.sku ?? String(v.id);
          return { id: v.id, sku: v.sku ?? null, name: variantName };
        });

        const hasTaille =
          mapped.length > 1 && mapped.every((v) => looksLikeSize(v.name));

        return {
          id: parentId,
          name,
          kind: (isMaterial ? "material" : "product") as "material" | "product",
          variants: mapped,
          hasTaille,
        };
      })
    );

    return NextResponse.json({ materials });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
