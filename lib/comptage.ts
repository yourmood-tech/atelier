// Comptage physique du stock (« stocktake » Katana piloté depuis l'atelier) — demandé par Philippe le 14.11.2026.
//
// Une séance = un vrai comptage Katana (mêmes états : NOT_STARTED → IN_PROGRESS → COUNTED → COMPLETED).
// On compte produit par produit en scannant : chaque scan ajoute 1 dans la taille, ou on tape le nombre.
// En passant au produit suivant, les tailles NON scannées qui ont encore du stock dans Katana sont mises à 0
// (après validation à l'écran) → plus de pièces oubliées dans Katana. Le stock ne bouge qu'à « Completed ».
// Comptage « à l'aveugle » : l'écran ne montre jamais la quantité de Katana, seulement si une taille en a.
//
// Stockage partagé : par séance, un tiroir « variante → ligne Katana | quantité comptée | nom » (2 demandes par produit).
import { kv } from "@vercel/kv";

const BASE = process.env.KATANA_BASE_URL || "https://api.katanamrp.com";
const KEY = process.env.KATANA_API_KEY!;
export const ATELIER = Number(process.env.KATANA_DEFAULT_LOCATION_ID || 10763);
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type L = Record<string, any>;
async function k(method: string, path: string, body?: unknown): Promise<L | L[] | null> {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${BASE}/v1${path}`, { method, headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    if (r.status === 429 || r.status >= 500) { await pause(Math.min(15000, 1500 * 1.6 ** i)); continue; }
    if (!r.ok) throw new Error(`Katana ${path} : ${r.status} ${(await r.text()).slice(0, 200)}`);
    const t = await r.text();
    if (!t) return null;
    const j = JSON.parse(t);
    return Array.isArray(j) ? j : j.data ?? j;
  }
  throw new Error("Katana occupé, réessaie dans une minute");
}
const liste = async (path: string) => ((await k("GET", path)) as L[]) ?? [];

const CLE = (sid: number) => `comptage:${sid}`;
type Memo = { r: number; c: number; n: string }; // ligne Katana, quantité comptée, nom affiché

export type Seance = { id: number; numero: string; statut: string; creeLe: string; raison: string | null };
const seance = (s: L): Seance => ({ id: s.id, numero: s.stocktake_number, statut: s.status, creeLe: s.stocktake_created_date ?? s.created_at, raison: s.reason ?? null });

export async function seances(): Promise<Seance[]> {
  const out: Seance[] = [];
  for (const st of ["NOT_STARTED", "IN_PROGRESS", "COUNTED"]) out.push(...(await liste(`/stocktakes?location_id=${ATELIER}&status=${st}&limit=50`)).filter((s) => !s.deleted_at).map(seance));
  return out.sort((a, b) => b.creeLe.localeCompare(a.creeLe));
}

export async function creer(raison: string): Promise<Seance> {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
  const p = (n: number) => String(n).padStart(2, "0");
  const numero = `STK-ATELIER-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  const s = (await k("POST", "/stocktakes", { location_id: ATELIER, stocktake_number: numero, reason: raison || "Comptage physique (outil atelier)" })) as L;
  return seance(s);
}

export async function changerStatut(sid: number, statut: "NOT_STARTED" | "IN_PROGRESS" | "COUNTED" | "COMPLETED") {
  await k("PATCH", `/stocktakes/${sid}`, { status: statut });
  return seance(((await liste(`/stocktakes?ids=${sid}`))[0]) ?? { id: sid, status: statut });
}

const taille = (v: L): string => {
  const t = (v.config_attributes ?? []).find((c: L) => /taille|size/i.test(c.config_name))?.config_value;
  return String(t ?? (String(v.sku ?? "").match(/-(\d{2})$/)?.[1] ?? v.sku ?? "?"));
};

// Un scan : retrouve la pièce, son produit et toutes ses tailles (avec « a du stock dans Katana : oui / non », jamais la quantité)
export async function produit(sid: number, code: string) {
  const c = code.trim();
  let v: L | undefined;
  for (const q of [`internal_barcode=${encodeURIComponent(c)}`, `registered_barcode=${encodeURIComponent(c)}`, `sku=${encodeURIComponent(c.toUpperCase())}`]) {
    v = (await liste(`/variants?${q}&limit=5`)).find((x) => !x.deleted_at);
    if (v) break;
  }
  if (!v) throw new Error(`Code inconnu dans Katana : ${c}`);
  const parent = v.material_id ? { type: "material", id: v.material_id } : { type: "product", id: v.product_id };
  const [freres, fiche] = await Promise.all([
    liste(`/variants?${parent.type}_id=${parent.id}&limit=250`),
    k("GET", `/${parent.type}s/${parent.id}`) as Promise<L>,
  ]);
  const actifs = freres.filter((x) => !x.deleted_at);
  const q = new URLSearchParams([["location_id", String(ATELIER)], ["limit", "250"], ...actifs.map((x) => ["variant_id", String(x.id)] as [string, string])]);
  const inv = await liste(`/inventory?${q}`);
  const stock = new Map(inv.filter((r) => Number(r.location_id ?? ATELIER) === ATELIER).map((r) => [Number(r.variant_id), Number(r.quantity_in_stock ?? 0)]));
  const memo = (await kv.hmget<Record<string, Memo>>(CLE(sid), ...actifs.map((x) => String(x.id)))) ?? {};
  const tailles = actifs.map((x) => ({
    variantId: x.id as number, sku: x.sku as string, taille: taille(x),
    aDuStock: (stock.get(x.id) ?? 0) !== 0,
    deja: memo?.[String(x.id)]?.c ?? null,
    codes: [x.internal_barcode, x.registered_barcode, x.sku].filter(Boolean).map(String),
  })).sort((a, b) => a.taille.localeCompare(b.taille, "fr", { numeric: true }));
  return { produit: { type: parent.type, id: parent.id as number, nom: String(fiche?.name ?? v.sku) }, scanne: v.id as number, tailles };
}

// Enregistre les quantités d'un produit dans le comptage Katana (créations groupées, corrections une par une)
export async function enregistrer(sid: number, nom: string, lignes: { variantId: number; taille: string; compte: number }[]) {
  const s = (await liste(`/stocktakes?ids=${sid}`))[0];
  if (!s) throw new Error("Comptage introuvable");
  if (s.status === "COMPLETED") throw new Error("Ce comptage est déjà terminé");
  if (s.status === "NOT_STARTED" || s.status === "COUNTED") await k("PATCH", `/stocktakes/${sid}`, { status: "IN_PROGRESS" });
  const memo = (await kv.hmget<Record<string, Memo>>(CLE(sid), ...lignes.map((l) => String(l.variantId)))) ?? {};
  const nouvelles = lignes.filter((l) => !memo?.[String(l.variantId)]);
  const maj: Record<string, Memo> = {};
  if (nouvelles.length) {
    const cree = ((await k("POST", "/stocktake_rows", { stocktake_id: sid, stocktake_rows: nouvelles.map((l) => ({ variant_id: l.variantId, counted_quantity: l.compte })) })) as L[]) ?? [];
    for (const r of cree) {
      const l = nouvelles.find((x) => x.variantId === r.variant_id)!;
      maj[String(r.variant_id)] = { r: r.id, c: l.compte, n: `${nom} · ${l.taille}` };
    }
  }
  for (const l of lignes) {
    const m = memo?.[String(l.variantId)];
    if (!m) continue;
    if (m.c !== l.compte) await k("PATCH", `/stocktake_rows/${m.r}`, { counted_quantity: l.compte });
    maj[String(l.variantId)] = { ...m, c: l.compte, n: `${nom} · ${l.taille}` };
  }
  if (Object.keys(maj).length) await kv.hset(CLE(sid), maj);
  return { enregistrees: Object.keys(maj).length };
}

// Écarts : compté contre stock Katana au moment où la ligne a été créée
export async function ecarts(sid: number) {
  const lignes: L[] = [];
  for (let p = 1; p < 200; p++) {
    const r = await liste(`/stocktake_rows?stocktake_ids=${sid}&limit=250&page=${p}`);
    lignes.push(...r.filter((x) => x.stocktake_id === sid && !x.deleted_at));
    if (r.length < 250) break;
  }
  const memo = (await kv.hgetall<Record<string, Memo>>(CLE(sid))) ?? {};
  const rows = lignes.map((x) => {
    const katana = Number(x.in_stock_quantity ?? 0), compte = x.counted_quantity == null ? null : Number(x.counted_quantity);
    return { variantId: x.variant_id as number, nom: memo[String(x.variant_id)]?.n ?? `variante ${x.variant_id}`, katana, compte, ecart: compte == null ? null : compte - katana };
  });
  return {
    lignes: rows.length, avecEcart: rows.filter((r) => r.ecart).length,
    pieces: { comptees: rows.reduce((s, r) => s + (r.compte ?? 0), 0), katana: rows.reduce((s, r) => s + r.katana, 0) },
    ecarts: rows.filter((r) => r.ecart).sort((a, b) => a.nom.localeCompare(b.nom, "fr", { numeric: true })),
  };
}
