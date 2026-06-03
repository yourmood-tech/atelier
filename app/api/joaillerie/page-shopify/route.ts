// Crée ou met à jour une page Shopify (Online Store > Pages) avec un handle stable.
// IMPORTANT : utilise GraphQL Admin API (pageCreate / pageUpdate) car REST /pages.json est déprécié depuis 2026.

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

interface Input {
  handle: string;
  title: string;
  bodyHtml: string;
  published?: boolean;
  store?: "mood-joaillerie" | "mood-collection";
}

export async function POST(request: Request) {
  let body: Input;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const { handle, title, bodyHtml, published = false, store = "mood-joaillerie" } = body;
  if (!handle || !title || !bodyHtml) return NextResponse.json({ error: "handle, title, bodyHtml requis" }, { status: 400 });

  const cfg = getStore(store);
  const apiUrl = `https://${cfg.shopifyDomain}/admin/api/2024-10/graphql.json`;
  const headers = { "X-Shopify-Access-Token": cfg.shopifyToken, "Content-Type": "application/json", Accept: "application/json" };

  async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<{ status: number; ok: boolean; data: T | null; errors?: unknown; raw?: string }> {
    const r = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify({ query, variables }) });
    const txt = await r.text();
    let json: { data?: T; errors?: unknown } = {};
    try { json = JSON.parse(txt); } catch { return { status: r.status, ok: false, data: null, raw: txt.slice(0, 400) }; }
    return { status: r.status, ok: r.ok && !json.errors, data: json.data || null, errors: json.errors };
  }

  // 1. Cherche page existante par handle (via pages query GraphQL)
  const findRes = await graphql<{ pages: { edges: { node: { id: string; handle: string; title: string } }[] } }>(`
    query($q: String!) {
      pages(first: 5, query: $q) {
        edges { node { id handle title } }
      }
    }
  `, { q: `handle:${handle}` });

  if (!findRes.ok) {
    return NextResponse.json({ error: "Recherche page Shopify échouée", detail: findRes.errors || findRes.raw, status: findRes.status }, { status: 502 });
  }

  const existing = findRes.data?.pages?.edges?.find((e) => e.node.handle === handle)?.node;

  let result;
  if (existing) {
    // UPDATE via pageUpdate
    result = await graphql<{ pageUpdate: { page: { id: string; handle: string; title: string; isPublished: boolean }; userErrors: { field: string[]; message: string }[] } }>(`
      mutation($id: ID!, $page: PageUpdateInput!) {
        pageUpdate(id: $id, page: $page) {
          page { id handle title isPublished }
          userErrors { field message }
        }
      }
    `, { id: existing.id, page: { title, handle, body: bodyHtml, isPublished: published } });
    const ue = result.data?.pageUpdate?.userErrors;
    if (!result.ok || (ue && ue.length > 0)) {
      return NextResponse.json({ error: "MAJ page échouée", detail: ue || result.errors || result.raw, status: result.status }, { status: 422 });
    }
    const p = result.data?.pageUpdate?.page;
    return NextResponse.json({
      ok: true,
      action: "updated",
      page: {
        id: p?.id.replace("gid://shopify/Page/", ""),
        handle: p?.handle,
        title: p?.title,
        isPublished: p?.isPublished || false,
        urlPublic: `https://${cfg.publicDomain}/pages/${p?.handle}`,
        urlAdmin: `https://${cfg.shopifyDomain}/admin/pages/${p?.id.replace("gid://shopify/Page/", "")}`,
      },
    });
  } else {
    // CREATE via pageCreate
    result = await graphql<{ pageCreate: { page: { id: string; handle: string; title: string; isPublished: boolean }; userErrors: { field: string[]; message: string }[] } }>(`
      mutation($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page { id handle title isPublished }
          userErrors { field message }
        }
      }
    `, { page: { title, handle, body: bodyHtml, isPublished: published } });
    const ue = result.data?.pageCreate?.userErrors;
    if (!result.ok || (ue && ue.length > 0)) {
      return NextResponse.json({ error: "Création page échouée", detail: ue || result.errors || result.raw, status: result.status }, { status: 422 });
    }
    const p = result.data?.pageCreate?.page;
    return NextResponse.json({
      ok: true,
      action: "created",
      page: {
        id: p?.id.replace("gid://shopify/Page/", ""),
        handle: p?.handle,
        title: p?.title,
        isPublished: p?.isPublished || false,
        urlPublic: `https://${cfg.publicDomain}/pages/${p?.handle}`,
        urlAdmin: `https://${cfg.shopifyDomain}/admin/pages/${p?.id.replace("gid://shopify/Page/", "")}`,
      },
    });
  }
}
