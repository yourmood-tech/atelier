// Cherche des produits sur un store Shopify donné, incluant les drafts (via API Admin).
// Retourne une liste enrichie : handle, title, status, prix, images, body_html.

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const store = (searchParams.get("store") || "mood-joaillerie") as "mood-joaillerie" | "mood-collection";
  if (!q) return NextResponse.json({ error: "param q requis" }, { status: 400 });

  const cfg = getStore(store);
  const apiBase = `https://${cfg.shopifyDomain}/admin/api/2024-10`;

  // Shopify GraphQL Admin search (plus puissant que REST pour la recherche full-text)
  const gqlBody = {
    query: `query($q: String!) {
      products(first: 30, query: $q) {
        edges { node {
          id handle title status
          variants(first: 50) { edges { node { price compareAtPrice } } }
          images(first: 2) { edges { node { url altText } } }
          tags
        }}
      }
    }`,
    variables: { q },
  };
  const r = await fetch(`${apiBase}/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": cfg.shopifyToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gqlBody),
  });
  if (!r.ok) {
    const detail = await r.text();
    return NextResponse.json({ error: "Shopify GraphQL erreur", status: r.status, detail: detail.slice(0, 300) }, { status: r.status });
  }
  const data = await r.json();
  const edges = data?.data?.products?.edges || [];
  const produits = edges.map((e: { node: { id: string; handle: string; title: string; status: string; variants?: { edges: { node: { price: string; compareAtPrice: string | null } }[] }; images?: { edges: { node: { url: string; altText: string | null } }[] }; tags: string[] } }) => {
    const n = e.node;
    const variants = n.variants?.edges || [];
    const prixList = variants.map((v) => parseFloat(v.node.price)).filter((p) => !isNaN(p) && p > 0);
    const priceMin = prixList.length > 0 ? Math.min(...prixList) : null;
    const priceMax = prixList.length > 0 ? Math.max(...prixList) : null;
    const hasMultiplePrix = prixList.length > 1 && priceMin !== priceMax;
    const prixNode = variants[0]?.node;
    return {
      id: n.id.replace("gid://shopify/Product/", ""),
      handle: n.handle,
      title: n.title,
      status: n.status,
      price: prixNode?.price || null,
      priceMin: priceMin !== null ? priceMin.toString() : null,
      priceMax: priceMax !== null ? priceMax.toString() : null,
      hasMultiplePrix,
      compareAtPrice: prixNode?.compareAtPrice || null,
      images: (n.images?.edges || []).map((ed) => ({ url: ed.node.url, alt: ed.node.altText })),
      tags: n.tags,
      urlPublic: `https://${cfg.publicDomain}/products/${n.handle}`,
      urlAdmin: `https://${cfg.shopifyDomain}/admin/products/${n.id.replace("gid://shopify/Product/", "")}`,
    };
  });

  return NextResponse.json({ ok: true, query: q, store, count: produits.length, produits });
}
