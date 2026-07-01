// Index Icelea — deux parties séparées :
//  1. vmap (variant → SKU/taille/code-barres) : CACHÉ dans KV, lent à construire, ne change
//     que si un nouveau produit apparaît. Construit/rafraîchi par tranches (bouton).
//  2. openRows (PO ouverts, lignes, positions) : recalculé À CHAQUE "Préparer" (rapide),
//     donc toujours à jour sans intervention. Les nouveaux variants croisés sont résolus
//     automatiquement au passage (dans un budget de temps).
import { kv } from "@vercel/kv";
import type { VariantIndex } from "./arrivage";

const BASE = process.env.KATANA_BASE_URL!;
const KEY = process.env.KATANA_API_KEY!;
const ICELEA = 755704;
const KV_VMAP = "icelea_arrivage_vmap";     // cache des variants
const KV_INDEX_LEGACY = "icelea_arrivage_index"; // ancien cache combiné {vmap, openRows}
const KV_BUILD = "icelea_arrivage_build";   // état de construction du vmap
const CHUNK = 1000;

export type Vmap = VariantIndex["vmap"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function kf(path: string, tries = 3): Promise<Record<string, unknown> | null> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    if (r.status === 429) { await sleep(500 * (i + 1)); continue; }
    if (!r.ok) return null;
    return r.json();
  }
  return null;
}

export async function getVmap(): Promise<Vmap | null> {
  const v = await kv.get<Vmap>(KV_VMAP);
  if (v) return v;
  // migration : réutilise le vmap de l'ancien cache combiné s'il existe
  const legacy = await kv.get<VariantIndex>(KV_INDEX_LEGACY);
  if (legacy?.vmap) { await kv.set(KV_VMAP, legacy.vmap); return legacy.vmap; }
  return null;
}

// PO Icelea ouverts → lignes non reçues + position (n° de ligne visible dans Katana).
export async function fetchOpenRows(): Promise<VariantIndex["openRows"]> {
  const openRows: VariantIndex["openRows"] = [];
  for (const st of ["NOT_RECEIVED", "PARTIALLY_RECEIVED"]) {
    const j = await kf(`/v1/purchase_orders?supplier_id=${ICELEA}&status=${st}&limit=100`);
    for (const po of ((j?.data as Record<string, unknown>[]) ?? [])) {
      const poRows = ((po.purchase_order_rows as Record<string, unknown>[]) ?? []).filter((r) => !r.deleted_at);
      poRows.forEach((row, i) => {
        if (row.received_date) return;
        openRows.push({
          vid: row.variant_id as number,
          qty: row.quantity as number,
          rowId: row.id as number,
          po: po.order_no as string,
          line: i + 1,
          created: (po.order_created_date as string) ?? (po.created_at as string) ?? "",
        });
      });
    }
  }
  return openRows;
}

async function resolveVariant(id: number): Promise<Vmap[string] | null> {
  const j = await kf(`/v1/variants/${id}`);
  if (!j || !j.id) return null;
  const t = ((j.config_attributes as { config_name: string; config_value: string }[]) ?? [])
    .find((a) => /taille/i.test(a.config_name));
  return { sku: (j.sku as string) ?? "", size: t ? t.config_value : null, barcode: (j.internal_barcode as string) ?? null };
}

// Résout les variants absents du vmap, dans un budget de temps ; sauve le vmap enrichi.
export async function resolveMissing(vmap: Vmap, ids: number[], deadlineMs: number): Promise<{ resolved: number; remaining: number }> {
  const missing = ids.filter((id) => !vmap[id]);
  let resolved = 0;
  for (const id of missing) {
    if (Date.now() > deadlineMs) break;
    const v = await resolveVariant(id);
    if (v) { vmap[id] = v; resolved++; }
    await sleep(40);
  }
  if (resolved > 0) await kv.set(KV_VMAP, vmap);
  return { resolved, remaining: missing.length - resolved };
}

// Construction/refresh COMPLET du vmap (bouton) — chunké, time-boxé, réutilise l'existant.
export type RefreshProgress = { phase: "resolving" | "done"; done: number; total: number };
type BuildState = { ids: number[]; vmap: Vmap; cursor: number };

export async function refreshIndexStep(restart = false): Promise<RefreshProgress> {
  let state = restart ? null : await kv.get<BuildState>(KV_BUILD);
  if (!state) {
    const openRows = await fetchOpenRows();
    const ids = [...new Set(openRows.map((r) => r.vid))];
    const prev = await getVmap();
    state = { ids, vmap: prev ?? {}, cursor: 0 };
    await kv.set(KV_BUILD, state);
    return { phase: "resolving", done: 0, total: ids.length };
  }
  const started = Date.now();
  let processed = 0;
  while (state.cursor + processed < state.ids.length && processed < CHUNK && Date.now() - started < 30000) {
    const id = state.ids[state.cursor + processed];
    if (!state.vmap[id]) { const v = await resolveVariant(id); if (v) state.vmap[id] = v; await sleep(40); }
    processed++;
  }
  state.cursor += processed;
  if (state.cursor >= state.ids.length) {
    await kv.set(KV_VMAP, state.vmap);
    await kv.del(KV_BUILD);
    return { phase: "done", done: state.ids.length, total: state.ids.length };
  }
  await kv.set(KV_BUILD, state);
  return { phase: "resolving", done: state.cursor, total: state.ids.length };
}
