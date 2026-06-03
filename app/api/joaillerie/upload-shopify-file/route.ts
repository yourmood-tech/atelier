// Endpoint upload vers Shopify Files (CDN), via GraphQL Admin staged upload + fileCreate.
// Utilise multipart/form-data en entrée. Retourne l'URL CDN finale (ou un message si traitement async).

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

// Disable body parsing — on lit le FormData nous-mêmes
export const runtime = "nodejs";
export const maxDuration = 60; // 60s pour les vidéos lourdes

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const store = (formData.get("store") as string) || "mood-joaillerie";
  if (!file) return NextResponse.json({ error: "champ 'file' requis" }, { status: 400 });

  const cfg = getStore(store);
  const apiBase = `https://${cfg.shopifyDomain}/admin/api/2025-10`;
  const headers = {
    "X-Shopify-Access-Token": cfg.shopifyToken,
    "Content-Type": "application/json",
  };

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  const resource = isVideo ? "VIDEO" : isImage ? "IMAGE" : "FILE";

  // === 1. stagedUploadsCreate : récupère URL signée pour upload direct vers le storage Shopify ===
  const stageQuery = `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }`;
  const stageRes = await fetch(`${apiBase}/graphql.json`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: stageQuery,
      variables: {
        input: [{
          filename: file.name || "upload.bin",
          mimeType: file.type || "application/octet-stream",
          httpMethod: "POST",
          resource,
          fileSize: file.size.toString(),
        }],
      },
    }),
  });
  if (!stageRes.ok) {
    return NextResponse.json({ error: "stagedUploadsCreate HTTP erreur", status: stageRes.status }, { status: 502 });
  }
  const stageData = await stageRes.json();
  const userErrors = stageData?.data?.stagedUploadsCreate?.userErrors || [];
  if (userErrors.length > 0) {
    return NextResponse.json({ error: "stagedUploadsCreate userErrors", detail: userErrors }, { status: 502 });
  }
  const target = stageData?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target?.url) {
    return NextResponse.json({ error: "stagedUploadsCreate pas de target", detail: stageData }, { status: 502 });
  }

  // === 2. POST le fichier vers l'URL pré-signée Shopify (cloud storage) ===
  const uploadForm = new FormData();
  for (const p of target.parameters || []) {
    uploadForm.append(p.name, p.value);
  }
  uploadForm.append("file", file);
  const uploadRes = await fetch(target.url, { method: "POST", body: uploadForm });
  if (!uploadRes.ok) {
    const txt = await uploadRes.text();
    return NextResponse.json({ error: "upload Shopify storage échoué", status: uploadRes.status, detail: txt.slice(0, 500) }, { status: 502 });
  }

  // === 3. fileCreate : enregistre le fichier dans Shopify Files (lié à la boutique) ===
  const createQuery = `mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id alt fileStatus
        ... on Video { sources { url mimeType format } preview { image { url } } }
        ... on MediaImage { image { url } }
        ... on GenericFile { url }
      }
      userErrors { field message }
    }
  }`;
  const createRes = await fetch(`${apiBase}/graphql.json`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: createQuery,
      variables: {
        files: [{
          alt: file.name || "upload",
          contentType: resource,
          originalSource: target.resourceUrl,
        }],
      },
    }),
  });
  const createData = await createRes.json();
  const createErrors = createData?.data?.fileCreate?.userErrors || [];
  if (createErrors.length > 0) {
    return NextResponse.json({ error: "fileCreate userErrors", detail: createErrors }, { status: 502 });
  }
  const created = createData?.data?.fileCreate?.files?.[0];
  if (!created) {
    return NextResponse.json({ error: "fileCreate pas de fichier", detail: createData }, { status: 502 });
  }

  // Récupère l'URL finale selon le type
  let url: string | null = null;
  if (created.sources?.[0]?.url) url = created.sources[0].url;
  else if (created.image?.url) url = created.image.url;
  else if (created.url) url = created.url;

  return NextResponse.json({
    ok: true,
    url,
    fileId: created.id,
    fileStatus: created.fileStatus,
    note: isVideo && !url
      ? "La vidéo est en cours de traitement Shopify (encodage, peut prendre 1-5 min selon la taille). Re-tente l'upload ou récupère l'URL dans Shopify Admin > Content > Files dans quelques minutes."
      : null,
  });
}
