import { NextResponse } from "next/server";
import { ajouterImage, ajouterImageParUrl } from "@/lib/produits/shopify";

export async function POST(request: Request) {
  const body = await request.json();
  const { productId, base64, src, filename, position, alt } = body || {};

  if (!productId)
    return NextResponse.json({ error: "champ requis : productId" }, { status: 400 });
  if (!base64 && !src)
    return NextResponse.json({ error: "champ requis : base64 OU src (URL)" }, { status: 400 });

  try {
    const r = src
      ? await ajouterImageParUrl(productId, src, position, alt, filename)
      : await ajouterImage(productId, base64, filename, position, alt);
    if (!r.ok)
      return NextResponse.json({ error: "erreur ajout image", detail: r.data }, { status: r.status });
    return NextResponse.json({ ok: true, image: (r.data as { image?: unknown }).image });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
