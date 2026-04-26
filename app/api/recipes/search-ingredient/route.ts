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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ materials: [] });

  const debug = req.nextUrl.searchParams.has("debug");

  try {
    const raw = await katanaGet(`/v1/materials?search=${encodeURIComponent(q)}&limit=20`);

    if (debug) return NextResponse.json({ raw });

    const rows: { id: number; name: string; variants?: unknown[] }[] =
      Array.isArray(raw) ? raw : (raw?.data ?? []);

    // Katana list endpoint may omit variants — fetch each individually if needed
    const materials = await Promise.all(
      rows.map(async (m) => {
        let variants: { id: number; sku: string | null; name: string }[] = [];

        if (Array.isArray(m.variants) && m.variants.length > 0) {
          variants = (m.variants as { id: number; sku?: string | null; name?: string | null }[]).map((v) => ({
            id: v.id,
            sku: v.sku ?? null,
            name: v.name ?? "",
          }));
        } else {
          // Fetch full material to get variants
          const full = await katanaGet(`/v1/materials/${m.id}`);
          const fullVariants: { id: number; sku?: string | null; name?: string | null }[] =
            Array.isArray(full?.variants) ? full.variants : [];
          variants = fullVariants.map((v) => ({
            id: v.id,
            sku: v.sku ?? null,
            name: v.name ?? "",
          }));
        }

        const hasTaille = variants.length > 1 && variants.every((v) => looksLikeSize(v.name));
        return { id: m.id, name: m.name, variants, hasTaille };
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
