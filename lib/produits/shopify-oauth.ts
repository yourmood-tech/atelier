export const SHOPIFY_API_VERSION = "2025-01";

function getCredentials(shop: string): { clientId: string; clientSecret: string } {
  const isMarketplace = shop.includes("moodmarketplace") || shop.includes("mood-market-place");
  // Marketplace-specific credentials optionnels — fallback sur les credentials katana-scanner-mvp
  const clientId = (isMarketplace && process.env.MOODMARKETPLACE_SHOPIFY_CLIENT_ID)
    ? process.env.MOODMARKETPLACE_SHOPIFY_CLIENT_ID
    : process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = (isMarketplace && process.env.MOODMARKETPLACE_SHOPIFY_CLIENT_SECRET)
    ? process.env.MOODMARKETPLACE_SHOPIFY_CLIENT_SECRET
    : process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("SHOPIFY_CLIENT_ID ou SHOPIFY_CLIENT_SECRET manquant");
  return { clientId, clientSecret };
}

export function getShopifyAuthorizeUrl(
  shop: string,
  host: string | null | undefined
): string {
  const { clientId } = getCredentials(shop);
  const scopes =
    process.env.SHOPIFY_OAUTH_SCOPES ||
    "read_products,write_products,read_orders,read_inventory,read_locations,read_customers,read_publications,write_publications";
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const baseHost =
    host && !host.startsWith("localhost")
      ? `https://${host}`
      : host
      ? `http://${host}`
      : "https://katana-scanner-mvp.vercel.app";
  const redirectUri = `${baseHost}/api/produits/shopify-callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function echangerCodeContreShopifyToken(
  code: string,
  shop: string
): Promise<{ access_token: string; scope: string }> {
  const { clientId, clientSecret } = getCredentials(shop);
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Échange code Shopify ${r.status} : ${detail.slice(0, 400)}`);
  }
  return await r.json();
}

export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}
