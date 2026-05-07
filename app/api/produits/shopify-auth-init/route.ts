import { NextResponse } from "next/server";
import {
  getShopifyAuthorizeUrl,
  isValidShopDomain,
} from "@/lib/produits/shopify-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    return NextResponse.json(
      {
        error:
          "Paramètre 'shop' requis. Exemple : ?shop=www-moodjoaillerie-net.myshopify.com",
      },
      { status: 400 }
    );
  }
  if (!isValidShopDomain(shop)) {
    return NextResponse.json(
      { error: "Format 'shop' invalide. Doit être 'xxx.myshopify.com'" },
      { status: 400 }
    );
  }
  try {
    const host = request.headers.get("host");
    const authorizeUrl = getShopifyAuthorizeUrl(shop, host);
    return NextResponse.redirect(authorizeUrl);
  } catch (e) {
    return NextResponse.json(
      { error: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
