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

// Returns a filter function that keeps only variants with the same color as the searched SKU.
//
// Two formats:
//   taille at end   → MTRL-MD-RI-113-Infinity CZ-50 : filter by prefix "MTRL-MD-RI-113-Infinity CZ"
//   taille in middle → MTRL-ALU-50-ROUGE : replace taille with \d{2,3} → regex MTRL-ALU-\d{2,3}-ROUGE
//
// Returns null when no taille is found (no filtering applied).
function buildSkuVariantFilter(sku: string): ((s: string) => boolean) | null {
  // Case 1: numeric last segment → taille at the end
  if (/^(.+)-\d{2,3}$/.test(sku)) {
    const prefix = sku.replace(/-\d{2,3}$/, "");
    return (s) => s.startsWith(prefix + "-");
  }
  // Case 2: non-numeric last segment → color at the end, taille somewhere in the middle
  const parts = sku.split("-");
  let tailleIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d{2,3}$/.test(parts[i])) { tailleIdx = i; break; }
  }
  if (tailleIdx === -1) return null;
  const escaped = parts
    .map((p, i) => i === tailleIdx ? "\\d{2,3}" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("-");
  const re = new RegExp(`^${escaped}$`);
  return (s) => re.test(s);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ materials: [] });

  // Exact SKU lookup on one variant → fetch parent → return all sibling variants
  const varRes = await katanaGet(`/v1/variants?sku=${encodeURIComponent(q)}&limit=3`) as {
    data?: {
      id: number;
      sku: string | null;
      material_id: number | null;
      product_id: number | null;
      config_attributes: { config_name: string; config_value: string }[];
    }[];
  } | null;

  const found = varRes?.data?.[0];
  if (!found) {
    return NextResponse.json({ materials: [], hint: "SKU introuvable — entre le SKU complet d'une variante (ex: MTRL-MD-RI-113-Infinity CZ-50)" });
  }

  const isMaterial = !!found.material_id;
  const parentId = found.material_id ?? found.product_id;
  if (!parentId) return NextResponse.json({ materials: [] });

  // Fetch parent to get name + ALL variants
  const parent = await katanaGet(
    isMaterial ? `/v1/materials/${parentId}` : `/v1/products/${parentId}`
  ) as {
    name?: string;
    variants?: { id: number; sku: string | null; config_attributes?: { config_name: string; config_value: string }[] }[];
  } | null;

  const name = parent?.name ?? q;
  const allVariants = parent?.variants ?? [found];

  // Filter to the same color when the searched SKU contains a taille segment
  const variantFilter = buildSkuVariantFilter(q);
  const scopedVariants = variantFilter
    ? allVariants.filter((v) => v.sku === null || variantFilter(v.sku))
    : allVariants;

  const mapped = scopedVariants.map((v) => {
    const attrs = v.config_attributes ?? [];
    const taille = attrs.find(
      (a) => ["taille", "size", "ring size"].includes(a.config_name.toLowerCase())
    )?.config_value;
    return { id: v.id, sku: v.sku ?? null, name: taille ?? v.sku ?? String(v.id) };
  });

  const hasTaille = mapped.length > 1 && mapped.every((v) => looksLikeSize(v.name));

  return NextResponse.json({
    materials: [{
      id: parentId,
      name,
      kind: isMaterial ? "material" : "product",
      variants: mapped,
      hasTaille,
    }],
  });
}
