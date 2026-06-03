// Endpoint dédié pour créer/mettre à jour la collection "La création du mois" sur Mood Joaillerie.
// Smart collection avec règle tag, handle stable, description HTML riche.

import { NextResponse } from "next/server";
import { makeShopifyClient } from "@/lib/produits/shopify";
import { getStore } from "@/lib/stores";

const HANDLE_STABLE = "la-creation-du-mois";
const TAG_PAR_DEFAUT = "creation-du-mois";

interface Input {
  titre: string;          // ex: "La création du mois - Les trésors de Nérée"
  descriptionHtml: string;
  tag?: string;           // ex: "tresors-de-neree" (sinon TAG_PAR_DEFAUT)
  imageUrl?: string;      // URL absolue d'une image hero (optionnel)
  store?: "mood-joaillerie" | "mood-collection";
}

export async function POST(request: Request) {
  let body: Input;
  try {
    body = (await request.json()) as Input;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const { titre, descriptionHtml, tag = TAG_PAR_DEFAUT, imageUrl, store = "mood-joaillerie" } = body;
  if (!titre || !descriptionHtml) {
    return NextResponse.json({ error: "titre et descriptionHtml requis" }, { status: 400 });
  }

  const cfg = getStore(store);
  const apiBase = `https://${cfg.shopifyDomain}/admin/api/2025-10`;

  async function call(method: string, path: string, payload?: unknown) {
    const r = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        "X-Shopify-Access-Token": cfg.shopifyToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    let data: unknown = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { status: r.status, ok: r.ok, data };
  }

  // 1. Cherche si une collection avec le handle stable existe déjà
  const findRes = await call("GET", `/smart_collections.json?handle=${HANDLE_STABLE}&limit=1`);
  const existingList = ((findRes.data as { smart_collections?: { id: number; handle: string }[] }).smart_collections) || [];
  const existing = existingList.find((c) => c.handle === HANDLE_STABLE);

  const payload: Record<string, unknown> = {
    title: titre,
    handle: HANDLE_STABLE,
    body_html: descriptionHtml,
    published: true,
    rules: [{ column: "tag", relation: "equals", condition: tag }],
    disjunctive: false,
  };
  if (imageUrl) payload.image = { src: imageUrl };

  let result;
  if (existing) {
    // UPDATE
    result = await call("PUT", `/smart_collections/${existing.id}.json`, {
      smart_collection: { id: existing.id, ...payload },
    });
  } else {
    // CREATE
    result = await call("POST", `/smart_collections.json`, { smart_collection: payload });
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: existing ? "MAJ smart collection échouée" : "Création smart collection échouée", detail: result.data, status: result.status },
      { status: result.status }
    );
  }

  const sc = (result.data as { smart_collection?: { id: number; handle: string; title: string } }).smart_collection;
  return NextResponse.json({
    ok: true,
    action: existing ? "updated" : "created",
    collection: {
      id: sc?.id,
      handle: sc?.handle,
      title: sc?.title,
      tag,
      urlPublic: `https://${cfg.publicDomain}/collections/${sc?.handle}`,
      urlAdmin: `https://${cfg.shopifyDomain}/admin/collections/${sc?.id}`,
    },
  });
}
