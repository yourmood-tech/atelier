import { NextResponse } from "next/server";
import { ajouterImage, ajouterImageParUrl, makeShopifyClient } from "@/lib/produits/shopify";
import { getStore } from "@/lib/stores";

export async function POST(request: Request) {
  const body = await request.json();
  const { productId, base64, src, filename, position, alt, store } = body || {};

  if (!productId)
    return NextResponse.json({ error: "champ requis : productId" }, { status: 400 });
  if (!base64 && !src)
    return NextResponse.json({ error: "champ requis : base64 OU src (URL)" }, { status: 400 });

  try {
    let result;
    if (store) {
      const storeConfig = getStore(store);
      const client = makeShopifyClient(storeConfig.shopifyDomain, storeConfig.shopifyToken);
      result = src
        ? await client.ajouterImageParUrl(productId, src, position, alt, filename)
        : await client.ajouterImage(productId, base64, filename, position, alt);
    } else {
      result = src
        ? await ajouterImageParUrl(productId, src, position, alt, filename)
        : await ajouterImage(productId, base64, filename, position, alt);
    }

    if (!result.ok)
      return NextResponse.json({ error: "erreur ajout image", detail: result.data }, { status: result.status });
    return NextResponse.json({ ok: true, image: (result.data as { image?: unknown }).image });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
