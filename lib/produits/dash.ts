export const DASH_API_URL = "https://api-v2.dash.app";
export const DASH_OAUTH_URL = "https://login.dash.app/oauth/token";
export const DASH_AUTHORIZE_URL = "https://login.dash.app/authorize";
export const DASH_AUDIENCE = "https://assetplatform.io";
export const DASH_SUBDOMAIN = "yourmood";

export function getRedirectUri(host: string | null | undefined): string {
  const baseUrl = host
    ? host.startsWith("localhost")
      ? `http://${host}`
      : `https://${host}`
    : "https://katana-scanner-mvp.vercel.app";
  return `${baseUrl}/api/produits/dash-callback`;
}

export function getAuthorizeUrl(host: string | null | undefined): string {
  const clientId = process.env.DASH_CLIENT_ID;
  if (!clientId) throw new Error("DASH_CLIENT_ID manquant");
  const params = new URLSearchParams({
    response_type: "code",
    audience: DASH_AUDIENCE,
    client_id: clientId,
    redirect_uri: getRedirectUri(host),
    scope: `offline_access subdomain:${DASH_SUBDOMAIN}`,
  });
  return `${DASH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function echangerCodeContreTokens(
  code: string,
  host: string | null | undefined
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  [k: string]: unknown;
}> {
  const clientId = process.env.DASH_CLIENT_ID;
  const clientSecret = process.env.DASH_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("DASH_CLIENT_ID ou DASH_CLIENT_SECRET manquant");

  const r = await fetch(DASH_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getRedirectUri(host),
    }),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Échange code Dash ${r.status} : ${detail.slice(0, 400)}`);
  }
  return await r.json();
}

let tokenCache: { token: string | null; expiresAt: number } = {
  token: null,
  expiresAt: 0,
};

export async function getDashToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }
  const clientId = process.env.DASH_CLIENT_ID;
  const clientSecret = process.env.DASH_CLIENT_SECRET;
  const refreshToken = process.env.DASH_REFRESH_TOKEN;
  if (!clientId || !clientSecret)
    throw new Error("DASH_CLIENT_ID ou DASH_CLIENT_SECRET manquant");
  if (!refreshToken)
    throw new Error(
      "DASH_REFRESH_TOKEN manquant — fais d'abord le setup initial"
    );

  const r = await fetch(DASH_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Refresh token Dash ${r.status} : ${detail.slice(0, 400)}`);
  }
  const data = await r.json();
  if (!data.access_token) throw new Error("Réponse OAuth sans access_token");
  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + (data.expires_in || 3600) * 1000;
  return data.access_token;
}

export async function dashFetch(path: string, options: RequestInit = {}) {
  const token = await getDashToken();
  const r = await fetch(`${DASH_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  return {
    status: r.status,
    ok: r.ok,
    data: r.ok ? await r.json() : await r.text(),
  };
}

export async function rechercherAssets({
  keyword,
  pageSize = 24,
  from = 0,
}: {
  keyword?: string;
  pageSize?: number;
  from?: number;
}) {
  const body: Record<string, unknown> = { from, pageSize, sorts: [] };
  if (keyword && keyword.trim()) {
    body.criterion = {
      type: "FIELD_MATCHES",
      value: keyword.trim(),
      field: { type: "FIXED", fieldName: "KEYWORDS" },
    };
  } else {
    body.criterion = { type: "MATCH_ALL" };
  }
  return dashFetch("/asset-searches", { method: "POST", body: JSON.stringify(body) });
}

interface DashAsset {
  id: string;
  currentAssetFile: {
    fileType: string;
    filename: string;
    previewUrl: string;
    dimensions?: { width: number; height: number };
    mediaType?: { type: string; subType: string };
  };
}

interface DashResponse {
  results?: Array<{ result: DashAsset }>;
  totalResults?: number;
}

export function simplifierAssets(rawResponse: DashResponse) {
  if (!rawResponse?.results) return { results: [], totalResults: 0 };
  const images = rawResponse.results
    .map((item) => item.result)
    .filter((a) => a?.currentAssetFile?.fileType === "IMAGE")
    .map((a) => ({
      id: a.id,
      filename: a.currentAssetFile.filename,
      previewUrl: a.currentAssetFile.previewUrl,
      width: a.currentAssetFile.dimensions?.width,
      height: a.currentAssetFile.dimensions?.height,
      mediaType: `${a.currentAssetFile.mediaType?.type}/${a.currentAssetFile.mediaType?.subType}`,
    }));
  return { results: images, totalResults: rawResponse.totalResults || 0 };
}
