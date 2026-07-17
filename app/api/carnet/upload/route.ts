// Upload d'un fichier (croquis, inspi, .ai, photo) vers Shopify Files → URL CDN permanente.
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API = `https://${STORE}/admin/api/2025-01/graphql.json`;

async function gql(query: string, variables?: unknown) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ error: "FormData invalide" }, { status: 400 }); }
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "champ 'file' requis" }, { status: 400 });

  const isImage = file.type.startsWith("image/");
  const resource = isImage ? "IMAGE" : "FILE";

  // 1. staged upload
  const stage = await gql(
    `mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}} userErrors{field message}}}`,
    { input: [{ filename: file.name || "upload.bin", mimeType: file.type || "application/octet-stream", httpMethod: "POST", resource, fileSize: String(file.size) }] }
  );
  const target = stage?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target?.url) return NextResponse.json({ error: "staged upload échoué", detail: stage?.data?.stagedUploadsCreate?.userErrors }, { status: 502 });

  // 2. POST le fichier vers le stockage Shopify
  const form = new FormData();
  for (const p of target.parameters || []) form.append(p.name, p.value);
  form.append("file", file);
  const up = await fetch(target.url, { method: "POST", body: form });
  if (!up.ok) return NextResponse.json({ error: "upload storage échoué", status: up.status }, { status: 502 });

  // 3. fileCreate
  const created = await gql(
    `mutation($files:[FileCreateInput!]!){fileCreate(files:$files){files{ id fileStatus ... on MediaImage{image{url}} ... on GenericFile{url} } userErrors{field message}}}`,
    { files: [{ originalSource: target.resourceUrl, contentType: isImage ? "IMAGE" : "FILE", alt: file.name }] }
  );
  const node = created?.data?.fileCreate?.files?.[0];
  const errs = created?.data?.fileCreate?.userErrors;
  if (!node) return NextResponse.json({ error: "fileCreate échoué", detail: errs }, { status: 502 });

  // 4. l'URL CDN peut arriver après traitement → on interroge le node quelques fois
  let url: string | null = node?.image?.url || node?.url || null;
  const id = node.id;
  for (let i = 0; i < 6 && !url; i++) {
    await new Promise((r) => setTimeout(r, 700));
    const q = await gql(`{ node(id:"${id}"){ ... on MediaImage{image{url}} ... on GenericFile{url} } }`);
    url = q?.data?.node?.image?.url || q?.data?.node?.url || null;
  }
  return NextResponse.json({ ok: true, url, id, name: file.name, image: isImage });
}
