// Récupère une page Shopify par son ID, pour permettre l'import dans l'app création-du-mois.
// Utile quand l'utilisateur a perdu son état local mais que la page existe encore sur Shopify.

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const store = (searchParams.get("store") || "mood-collection") as "mood-joaillerie" | "mood-collection";
  if (!id) return NextResponse.json({ error: "param id requis" }, { status: 400 });

  const cfg = getStore(store);
  const r = await fetch(`https://${cfg.shopifyDomain}/admin/api/2026-04/pages/${id}.json`, {
    headers: { "X-Shopify-Access-Token": cfg.shopifyToken, Accept: "application/json" },
  });
  if (!r.ok) {
    const detail = await r.text();
    return NextResponse.json(
      { error: "Page introuvable sur Shopify", status: r.status, detail: detail.slice(0, 200) },
      { status: r.status }
    );
  }
  const data = await r.json();
  const p = data.page || {};
  return NextResponse.json({
    ok: true,
    page: {
      id: p.id,
      title: p.title,
      handle: p.handle,
      body_html: p.body_html,
      published_at: p.published_at,
      updated_at: p.updated_at,
    },
  });
}
