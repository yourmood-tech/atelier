// Réception marchandise Icelea (écriture Katana). Confirmé sur l'API :
//  - POST /v1/purchase_order_receive  [{ purchase_order_row_id, quantity, received_date, location_id }]
//    → réception PARTIELLE, ligne par ligne, quantité par quantité (le reste de la ligne
//      reste ouvert). Pas de dé-réception par l'API (une réception est un acte réel).
//  - POST /v1/stock_adjustments  → entrée forcée (sans PO) et picking (sortie), quantité signée.
import { fetchOpenRows } from "./variant-index";

const BASE = process.env.KATANA_BASE_URL!;
const KEY = process.env.KATANA_API_KEY!;
const LOC = Number(process.env.KATANA_DEFAULT_LOCATION_ID!);
const H = { Accept: "application/json", Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function kf(path: string, init?: RequestInit, tries = 3): Promise<Response> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${BASE}${path}`, { ...init, headers: H, cache: "no-store" });
    if (r.status === 429) { await sleep(600 * (i + 1)); continue; }
    return r;
  }
  return fetch(`${BASE}${path}`, { ...init, headers: H, cache: "no-store" });
}

async function stockAdjust(variantId: number, signedQty: number, prefix: string) {
  const num = `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const r = await kf("/v1/stock_adjustments", {
    method: "POST",
    body: JSON.stringify({ stock_adjustment_number: num, location_id: LOC, stock_adjustment_rows: [{ variant_id: variantId, quantity: signedQty }] }),
  });
  if (!r.ok) throw new Error(`Ajustement stock ${r.status}: ${(await r.text()).slice(0, 160)}`);
}

export interface ReceiveResult {
  receivedOnPO: { po: string; line: number; qty: number }[]; // imputations FIFO effectuées
  totalReceivedPO: number;   // total imputé sur des PO
  surplus: number;           // reçu au-delà des PO ouverts → entré en stock sans PO
  forcedNoPO: number;        // reçu alors qu'aucun PO ouvert → entré en stock sans PO
  picked: number;            // sorti du stock (picking)
}

// Réceptionne `receivedQty` du variant en imputant FIFO sur ses PO ouverts (partiel natif),
// le surplus/absence de PO en entrée de stock, puis sort `pickQty` (picking).
export async function receiveProduct(variantId: number, receivedQty: number, pickQty: number): Promise<ReceiveResult> {
  const rows = (await fetchOpenRows())
    .filter((r) => r.vid === variantId)
    .sort((a, b) => (a.created || "").localeCompare(b.created || ""));

  const today = new Date().toISOString().slice(0, 10);
  const dtos: { purchase_order_row_id: number; quantity: number; received_date: string; location_id: number }[] = [];
  const receivedOnPO: ReceiveResult["receivedOnPO"] = [];
  let remaining = Math.max(0, Math.floor(receivedQty));

  for (const r of rows) {
    if (remaining <= 0) break;
    const q = Math.min(r.qty, remaining);
    dtos.push({ purchase_order_row_id: r.rowId, quantity: q, received_date: today, location_id: LOC });
    receivedOnPO.push({ po: r.po, line: r.line, qty: q });
    remaining -= q;
  }

  if (dtos.length) {
    const r = await kf("/v1/purchase_order_receive", { method: "POST", body: JSON.stringify(dtos) });
    if (!r.ok) throw new Error(`Réception PO ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }

  const hadPO = rows.length > 0;
  const surplus = hadPO ? remaining : 0;      // reçu > total commandé ouvert
  const forcedNoPO = hadPO ? 0 : remaining;   // aucun PO ouvert pour ce variant
  if (remaining > 0) await stockAdjust(variantId, remaining, "ARRIV");

  const pick = Math.max(0, Math.floor(pickQty));
  if (pick > 0) await stockAdjust(variantId, -pick, "PICK");

  return {
    receivedOnPO,
    totalReceivedPO: receivedOnPO.reduce((s, x) => s + x.qty, 0),
    surplus, forcedNoPO, picked: pick,
  };
}

// Quantité réservée par des commandes clients (indice picking : 0 = pas besoin de picking).
export async function getCommitted(variantId: number): Promise<number> {
  const r = await kf(`/v1/inventory?variant_id=${variantId}`);
  if (!r.ok) return 0;
  const row = ((await r.json()).data ?? [])[0];
  return Number(row?.quantity_committed ?? 0);
}
