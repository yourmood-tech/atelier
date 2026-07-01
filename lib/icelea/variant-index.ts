// Index caché des variants des PO Icelea ouverts (id → SKU + taille + code-barres).
// Construit par TRANCHES (Vercel = 60s max, ~496 variants à résoudre en per-id) puis
// mis en cache dans Vercel KV. Le plan de réception lit ce cache (instantané ensuite).
import { kv } from "@vercel/kv";
import type { VariantIndex } from "./arrivage";

const BASE = process.env.KATANA_BASE_URL!;
const KEY = process.env.KATANA_API_KEY!;
const ICELEA = 755704;
const KV_INDEX = "icelea_arrivage_index";   // index finalisé (VariantIndex)
const KV_BUILD = "icelea_arrivage_build";    // état de construction en cours
const CHUNK = 1000;                           // borne haute — le time-box 45s ci-dessous gouverne

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function kf(path: string, tries = 5): Promise<Record<string, unknown> | null> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    if (r.status === 429) { await sleep(1200 * (i + 1)); continue; }
    if (!r.ok) return null;
    return r.json();
  }
  return null;
}

type BuildState = {
  ids: number[];
  openRows: VariantIndex["openRows"];
  vmap: VariantIndex["vmap"];
  cursor: number;
};

export async function getIndex(): Promise<VariantIndex | null> {
  return (await kv.get<VariantIndex>(KV_INDEX)) ?? null;
}

export type RefreshProgress = { phase: "scanning" | "resolving" | "done"; done: number; total: number };

// Un appel = une tranche. cursor géré côté serveur (KV). L'UI rappelle jusqu'à phase "done".
export async function refreshIndexStep(restart = false): Promise<RefreshProgress> {
  let state = restart ? null : await kv.get<BuildState>(KV_BUILD);

  // Phase 1 — scan des PO ouverts (rapide) : liste des variant_ids à résoudre
  if (!state) {
    const openRows: VariantIndex["openRows"] = [];
    const ids = new Set<number>();
    for (const st of ["NOT_RECEIVED", "PARTIALLY_RECEIVED"]) {
      const j = await kf(`/v1/purchase_orders?supplier_id=${ICELEA}&status=${st}&limit=100`);
      for (const po of ((j?.data as Record<string, unknown>[]) ?? [])) {
        for (const row of ((po.purchase_order_rows as Record<string, unknown>[]) ?? [])) {
          if (row.deleted_at || row.received_date) continue;
          openRows.push({
            vid: row.variant_id as number,
            qty: row.quantity as number,
            rowId: row.id as number,
            po: po.order_no as string,
            created: (po.order_created_date as string) ?? (po.created_at as string) ?? "",
          });
          ids.add(row.variant_id as number);
        }
      }
    }
    state = { ids: [...ids], openRows, vmap: {}, cursor: 0 };
    await kv.set(KV_BUILD, state);
    return { phase: "resolving", done: 0, total: state.ids.length };
  }

  // Phase 2 — résolution d'une tranche de variants, BORNÉE DANS LE TEMPS
  // (on s'arrête avant les 60s Vercel : la fonction rend toujours du JSON propre).
  const started = Date.now();
  let processed = 0;
  while (
    state.cursor + processed < state.ids.length &&
    processed < CHUNK &&
    Date.now() - started < 45000
  ) {
    const id = state.ids[state.cursor + processed];
    const j = await kf(`/v1/variants/${id}`);
    if (j && j.id) {
      const t = ((j.config_attributes as { config_name: string; config_value: string }[]) ?? [])
        .find((a) => /taille/i.test(a.config_name));
      state.vmap[id] = {
        sku: (j.sku as string) ?? "",
        size: t ? t.config_value : null,
        barcode: (j.internal_barcode as string) ?? null,
      };
    }
    processed++;
    await sleep(50);
  }
  state.cursor += processed;

  if (state.cursor >= state.ids.length) {
    const index: VariantIndex = { vmap: state.vmap, openRows: state.openRows };
    await kv.set(KV_INDEX, index);
    await kv.del(KV_BUILD);
    return { phase: "done", done: state.ids.length, total: state.ids.length };
  }
  await kv.set(KV_BUILD, state);
  return { phase: "resolving", done: state.cursor, total: state.ids.length };
}
