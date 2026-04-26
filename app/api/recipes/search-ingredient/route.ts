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

  try {
    const data = await katanaGet(`/v1/materials?search=${encodeURIComponent(q)}&limit=20`) as {
      data?: {
        id: number;
        name: string;
        variants?: { id: number; sku: string | null; name: string | null }[];
      }[];
    };

    const materials = (data.data ?? []).map((m) => {
      const variants = (m.variants ?? []).map((v) => ({
        id: v.id,
        sku: v.sku ?? null,
        name: v.name ?? "",
      }));
      const hasTaille = variants.length > 1 && variants.every((v) => looksLikeSize(v.name));
      return { id: m.id, name: m.name, variants, hasTaille };
    });

    return NextResponse.json({ materials });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
