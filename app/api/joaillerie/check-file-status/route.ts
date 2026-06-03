// Vérifie le statut d'un fichier Shopify (utile pour les vidéos encodées en async).
// Retourne l'URL CDN quand fileStatus === 'READY'.

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId") || "";
  const store = (searchParams.get("store") || "mood-joaillerie") as "mood-joaillerie" | "mood-collection";
  if (!fileId) return NextResponse.json({ error: "fileId requis" }, { status: 400 });

  const cfg = getStore(store);
  const apiBase = `https://${cfg.shopifyDomain}/admin/api/2025-10`;

  const query = `query getFile($id: ID!) {
    node(id: $id) {
      ... on Video {
        id fileStatus
        sources { url mimeType format }
        preview { image { url } }
      }
      ... on MediaImage {
        id fileStatus
        image { url }
      }
      ... on GenericFile {
        id fileStatus
        url
      }
    }
  }`;

  const r = await fetch(`${apiBase}/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": cfg.shopifyToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { id: fileId } }),
  });
  if (!r.ok) return NextResponse.json({ error: "Shopify HTTP", status: r.status }, { status: 502 });
  const data = await r.json();
  const node = data?.data?.node;
  if (!node) return NextResponse.json({ error: "fichier introuvable", detail: data }, { status: 404 });

  let url: string | null = null;
  if (node.sources?.[0]?.url) url = node.sources[0].url;
  else if (node.image?.url) url = node.image.url;
  else if (node.url) url = node.url;

  return NextResponse.json({
    ok: true,
    fileId,
    fileStatus: node.fileStatus,
    ready: node.fileStatus === "READY",
    url,
    previewUrl: node.preview?.image?.url || null,
  });
}
