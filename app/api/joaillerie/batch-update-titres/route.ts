// Met à jour en lot les titres de produits Shopify.
// Body : { store, updates: [{id, title}] }
// Procède séquentiellement avec pause anti-rate-limit. Retourne le détail succès/échec.

import { NextResponse } from "next/server";
import { getStore } from "@/lib/stores";

interface Update { id: number | string; title: string; }
interface Input {
  store?: "mood-joaillerie" | "mood-collection";
  updates: Update[];
  dryRun?: boolean;
}

export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Input;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const { store = "mood-joaillerie", updates, dryRun = false } = body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "updates (array) requis et non vide" }, { status: 400 });
  }
  const cfg = getStore(store);
  const apiBase = `https://${cfg.shopifyDomain}/admin/api/2026-04`;

  const results: Array<{ id: string | number; ok: boolean; status?: number; title?: string; error?: string }> = [];

  for (const u of updates) {
    if (!u.id || !u.title) {
      results.push({ id: u.id, ok: false, error: "id et title requis" });
      continue;
    }
    if (dryRun) {
      results.push({ id: u.id, ok: true, title: u.title });
      continue;
    }
    try {
      const r = await fetch(`${apiBase}/products/${u.id}.json`, {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": cfg.shopifyToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ product: { id: u.id, title: u.title } }),
      });
      if (!r.ok) {
        const txt = await r.text();
        results.push({ id: u.id, ok: false, status: r.status, error: txt.slice(0, 200) });
      } else {
        results.push({ id: u.id, ok: true, title: u.title });
      }
    } catch (e) {
      results.push({ id: u.id, ok: false, error: (e as Error).message });
    }
    await new Promise(res => setTimeout(res, 250));
  }

  const okCount = results.filter(r => r.ok).length;
  return NextResponse.json({ ok: true, total: updates.length, succes: okCount, echecs: updates.length - okCount, results, dryRun });
}
