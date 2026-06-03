// Crée ou met à jour une page Shopify (Online Store > Pages) avec un handle stable.
// Utile pour des pages "vitrine" comme la création du mois.

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

interface Input {
  handle: string;           // ex: "creation-du-mois"
  title: string;
  bodyHtml: string;
  published?: boolean;       // default: false (draft)
  store?: "mood-joaillerie" | "mood-collection";
}

export async function POST(request: Request) {
  let body: Input;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const { handle, title, bodyHtml, published = false, store = "mood-joaillerie" } = body;
  if (!handle || !title || !bodyHtml) return NextResponse.json({ error: "handle, title, bodyHtml requis" }, { status: 400 });

  const cfg = getStore(store);
  const apiBase = `https://${cfg.shopifyDomain}/admin/api/2026-04`;

  async function call(method: string, path: string, payload?: unknown) {
    const r = await fetch(`${apiBase}${path}`, {
      method,
      headers: { "X-Shopify-Access-Token": cfg.shopifyToken, "Content-Type": "application/json", Accept: "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    let data: unknown = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { status: r.status, ok: r.ok, data };
  }

  // Cherche page existante par handle
  const findRes = await call("GET", `/pages.json?handle=${handle}&limit=1`);
  const existingList = ((findRes.data as { pages?: { id: number; handle: string }[] }).pages) || [];
  const existing = existingList.find((p) => p.handle === handle);

  const payload: Record<string, unknown> = { title, handle, body_html: bodyHtml, published };

  let result;
  if (existing) {
    result = await call("PUT", `/pages/${existing.id}.json`, { page: { id: existing.id, ...payload } });
  } else {
    result = await call("POST", `/pages.json`, { page: payload });
  }

  if (!result.ok) {
    return NextResponse.json({ error: existing ? "MAJ page échouée" : "Création page échouée", detail: result.data, status: result.status }, { status: result.status });
  }

  const p = (result.data as { page?: { id: number; handle: string; title: string; published_at: string | null } }).page;
  return NextResponse.json({
    ok: true,
    action: existing ? "updated" : "created",
    page: {
      id: p?.id,
      handle: p?.handle,
      title: p?.title,
      isPublished: !!p?.published_at,
      urlPublic: `https://${cfg.publicDomain}/pages/${p?.handle}`,
      urlAdmin: `https://${cfg.shopifyDomain}/admin/pages/${p?.id}`,
    },
  });
}
