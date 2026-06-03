// Récupère une page Shopify par son ID via GraphQL (REST /pages.json déprécié depuis 2026).

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const store = (searchParams.get("store") || "mood-collection") as "mood-joaillerie" | "mood-collection";
  if (!id) return NextResponse.json({ error: "param id requis" }, { status: 400 });

  const cfg = getStore(store);
  const apiUrl = `https://${cfg.shopifyDomain}/admin/api/2025-10/graphql.json`;
  const gid = `gid://shopify/Page/${id}`;

  const r = await fetch(apiUrl, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": cfg.shopifyToken, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: `query($id: ID!) {
        page(id: $id) {
          id
          handle
          title
          body
          isPublished
          publishedAt
          updatedAt
        }
      }`,
      variables: { id: gid },
    }),
  });

  const txt = await r.text();
  let json: { data?: { page: { id: string; handle: string; title: string; body: string; isPublished: boolean; publishedAt: string | null; updatedAt: string } | null }; errors?: unknown } = {};
  try { json = JSON.parse(txt); } catch {
    return NextResponse.json({ error: "Réponse Shopify non-JSON", detail: txt.slice(0, 300), status: r.status }, { status: 502 });
  }

  if (!r.ok || json.errors) {
    return NextResponse.json({ error: "Erreur Shopify GraphQL", detail: json.errors || txt.slice(0, 300), status: r.status }, { status: r.status });
  }

  const p = json.data?.page;
  if (!p) {
    return NextResponse.json({ error: "Page introuvable sur Shopify", status: 404 }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    page: {
      id: p.id.replace("gid://shopify/Page/", ""),
      title: p.title,
      handle: p.handle,
      body_html: p.body,
      published_at: p.publishedAt,
      updated_at: p.updatedAt,
    },
  });
}
