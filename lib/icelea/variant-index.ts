// Catalogue Icelea — reconstruit à la volée à chaque "Préparer" (rapide, ~5s) :
//  - vmap : TOUS les variants du fournisseur Icelea (id → SKU/taille/code-barres),
//    obtenus via /v1/materials?default_supplier_id=… (la liste inclut déjà les variants).
//  - openRows : les lignes des PO Icelea ouverts (avec position). Toujours frais.
// Plus aucun cache ni index à reconstruire : la source de vérité est relue à chaque fois.
import { kv } from "@vercel/kv";
import type { VariantIndex } from "./arrivage";
import { overrideKey, familyOf, OVERRIDE_NONE } from "./arrivage";

const BASE = process.env.KATANA_BASE_URL!;
const KEY = process.env.KATANA_API_KEY!;
const ICELEA = 755704;
const KV_OVERRIDES = "icelea_arrivage_overrides"; // corrections mémorisées : signatureLibellé → familleSKU

// Corrections apprises (réappliquées automatiquement aux prochaines factures).
export async function getOverrides(): Promise<Record<string, string>> {
  try { return (await kv.get<Record<string, string>>(KV_OVERRIDES)) ?? {}; } catch { return {}; }
}
// sku non vide → mémorise la famille SKU ; sku vide/null → mémorise "sans association".
export async function saveOverride(label: string, sku: string | null): Promise<void> {
  const key = overrideKey(label);
  if (!key) return;
  const all = await getOverrides();
  all[key] = sku ? familyOf(sku) : OVERRIDE_NONE;
  await kv.set(KV_OVERRIDES, all);
}

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

export type Vmap = VariantIndex["vmap"];

// ── Progression d'arrivage (reprise en plusieurs fois) ───────────────────────
// Par n° de facture : signatureLigne → résultat de réception. Permet de reprendre
// un gros arrivage plus tard (les lignes déjà reçues réapparaissent traitées).
const KV_PROGRESS = (inv: string) => `icelea_arrivage_progress:${inv}`;
export async function getProgress(invoiceNo: string): Promise<Record<string, unknown>> {
  if (!invoiceNo) return {};
  try { return (await kv.get<Record<string, unknown>>(KV_PROGRESS(invoiceNo))) ?? {}; } catch { return {}; }
}
export async function saveProgress(invoiceNo: string, sig: string, result: unknown): Promise<void> {
  if (!invoiceNo || !sig) return;
  const all = await getProgress(invoiceNo);
  all[sig] = result;
  await kv.set(KV_PROGRESS(invoiceNo), all);
}
export async function clearProgress(invoiceNo: string): Promise<void> {
  if (!invoiceNo) return;
  try { await kv.del(KV_PROGRESS(invoiceNo)); } catch { /* noop */ }
}

// Tous les variants Icelea (par pagination des matériaux du fournisseur).
export async function fetchIceleaVmap(): Promise<Vmap> {
  const vmap: Vmap = {};
  for (let page = 1; page <= 20; page++) {
    const j = await kf(`/v1/materials?default_supplier_id=${ICELEA}&limit=250&page=${page}`);
    const mats = (j?.data as Record<string, unknown>[]) ?? [];
    for (const m of mats) {
      const name = (m.name as string) ?? null; // nom de l'ingrédient Katana (partagé par ses variants)
      for (const v of ((m.variants as Record<string, unknown>[]) ?? [])) {
        if (v.deleted_at) continue;
        const t = ((v.config_attributes as { config_name: string; config_value: string }[]) ?? [])
          .find((a) => /taille/i.test(a.config_name));
        vmap[v.id as number] = {
          sku: (v.sku as string) ?? "",
          name,
          size: t ? t.config_value : null,
          barcode: (v.internal_barcode as string) ?? null,
        };
      }
    }
    if (mats.length < 250) break;
  }
  return vmap;
}

// Lignes des PO Icelea ouverts + position (n° de ligne visible dans Katana).
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
