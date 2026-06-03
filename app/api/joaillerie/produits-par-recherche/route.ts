// Cherche des produits sur un store Shopify donné, incluant les drafts (via API Admin).
// Supporte aussi le filtre par collection (paramètre 'collection' = handle de collection Shopify).
// Retourne une liste enrichie : handle, title, status, prix, images, tags + URLs.

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

interface VariantEdge { node: { price: string; compareAtPrice: string | null } }
interface ImageEdge { node: { url: string; altText: string | null } }
interface ProductNode {
  id: string;
  handle: string;
  title: string;
  status: string;
  productType?: string;
  variants?: { edges: VariantEdge[] };
  images?: { edges: ImageEdge[] };
  tags: string[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const collectionHandle = (searchParams.get("collection") || "").trim();
  const store = (searchParams.get("store") || "mood-joaillerie") as "mood-joaillerie" | "mood-collection";
  if (!q && !collectionHandle) return NextResponse.json({ error: "param q ou collection requis" }, { status: 400 });

  const cfg = getStore(store);
  const apiBase = `https://${cfg.shopifyDomain}/admin/api/2025-10`;

  let nodes: ProductNode[] = [];

  if (collectionHandle) {
    // Branche A : récupère les produits d'une collection précise (jusqu'à 100), puis filtre côté serveur par mot-clé
    const gqlBody = {
      query: `query($h: String!) {
        collectionByHandle(handle: $h) {
          id title handle
          products(first: 100) {
            edges { node {
              id handle title status productType
              variants(first: 50) { edges { node { price compareAtPrice } } }
              images(first: 2) { edges { node { url altText } } }
              tags
            }}
          }
        }
      }`,
      variables: { h: collectionHandle },
    };
    const r = await fetch(`${apiBase}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": cfg.shopifyToken, "Content-Type": "application/json" },
      body: JSON.stringify(gqlBody),
    });
    if (!r.ok) {
      const detail = await r.text();
      return NextResponse.json({ error: "Shopify GraphQL erreur", status: r.status, detail: detail.slice(0, 300) }, { status: r.status });
    }
    const data = await r.json();
    const col = data?.data?.collectionByHandle;
    if (!col) {
      return NextResponse.json({ ok: true, query: q, collection: collectionHandle, count: 0, produits: [], note: "Collection introuvable avec ce handle" });
    }
    nodes = (col.products?.edges || []).map((e: { node: ProductNode }) => e.node);
    // Filtre mot-clé côté serveur (optionnel)
    if (q) {
      const qLower = q.toLowerCase();
      nodes = nodes.filter((n) => n.title.toLowerCase().includes(qLower) || n.tags?.some((t) => t.toLowerCase().includes(qLower)));
    }
  } else {
    // Branche B : full-text search Shopify Admin (comportement actuel)
    const gqlBody = {
      query: `query($q: String!) {
        products(first: 30, query: $q) {
          edges { node {
            id handle title status productType
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
      headers: { "X-Shopify-Access-Token": cfg.shopifyToken, "Content-Type": "application/json" },
      body: JSON.stringify(gqlBody),
    });
    if (!r.ok) {
      const detail = await r.text();
      return NextResponse.json({ error: "Shopify GraphQL erreur", status: r.status, detail: detail.slice(0, 300) }, { status: r.status });
    }
    const data = await r.json();
    nodes = (data?.data?.products?.edges || []).map((e: { node: ProductNode }) => e.node);
  }

  const produits = nodes.map((n) => {
    const variants = n.variants?.edges || [];
    const prixList = variants.map((v) => parseFloat(v.node.price)).filter((p) => !isNaN(p) && p > 0);
    const priceMin = prixList.length > 0 ? Math.min(...prixList) : null;
    const priceMax = prixList.length > 0 ? Math.max(...prixList) : null;
    const hasMultiplePrix = prixList.length > 1 && priceMin !== priceMax;
    const prixNode = variants[0]?.node;
    const id = n.id.replace("gid://shopify/Product/", "");
    return {
      id,
      handle: n.handle,
      title: n.title,
      status: n.status,
      product_type: n.productType || "",
      price: prixNode?.price || null,
      priceMin: priceMin !== null ? priceMin.toString() : null,
      priceMax: priceMax !== null ? priceMax.toString() : null,
      hasMultiplePrix,
      compareAtPrice: prixNode?.compareAtPrice || null,
      images: (n.images?.edges || []).map((ed) => ({ url: ed.node.url, alt: ed.node.altText })),
      tags: n.tags,
      urlPublic: `https://${cfg.publicDomain}/products/${n.handle}`,
      urlAdmin: `https://${cfg.shopifyDomain}/admin/products/${id}`,
    };
  });

  return NextResponse.json({ ok: true, query: q, collection: collectionHandle || null, store, count: produits.length, produits });
}
