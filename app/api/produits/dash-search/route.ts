import { NextResponse } from "next/server";
import { rechercherAssets, simplifierAssets } from "@/lib/produits/dash";

export async function POST(request: Request) {
  const body = await request.json();
  const { keyword, pageSize, from } = body || {};

  try {
    const r = await rechercherAssets({
      keyword: keyword || "",
      pageSize: pageSize || 24,
      from: from || 0,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: "erreur recherche Dash", detail: r.data },
        { status: r.status }
      );
    const simplified = simplifierAssets(r.data);
    return NextResponse.json(simplified);
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
