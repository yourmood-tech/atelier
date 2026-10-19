// Après un arrivage Icelea : marque, PIÈCE PAR PIÈCE, les commandes clientes dont une pièce
// attendue vient d'arriver à l'atelier. Sert à répondre aux demandes de délai.
//
//  Une commande Icelea regroupe ~70 à 150 commandes clientes et reste « reçue en partie »
//  des semaines → on ne marque pas au niveau de la commande fournisseur, mais pièce par pièce :
//   1. pièce reçue (variant Katana) → produits qui l'utilisent (recettes Katana) → leurs SKU ;
//   2. commandes clientes reliées à cette commande fournisseur (icelea_po_pairs) dont une ligne
//      encore à expédier a l'un de ces SKU ;
//   3. quantité reçue répartie par ancienneté de commande (la plus ancienne servie d'abord) ;
//   4. étiquette « Icelea-recu:jj.mm.aaaa » si toutes ses pièces de cette commande fournisseur
//      sont arrivées, sinon « Icelea-partiel:jj.mm.aaaa ».
//  Ce qui a déjà été servi est mémorisé (une pièce n'est jamais attribuée deux fois).
//
//  Mode « colis en route » (19.10.2026) : même répartition, AVANT l'arrivée (facture d'envoi
//  d'Icelea, rien n'entre en stock) → étiquette « Icelea-enroute:<arrivée prévue> » (toutes ses
//  pièces de ce bon en route ou déjà arrivées) ou « Icelea-enroute-partiel:<arrivée prévue> ».
//  Mémoire séparée (icelea_enroute:PO) : l'arrivée réelle refait sa propre répartition.
import { kv } from "@vercel/kv";
import { getOrdersLite, setIceleaReceptionTag, setIceleaEnrouteTag, type OrderLite } from "@/lib/shopify";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BASE = process.env.KATANA_BASE_URL!;
const KEY = process.env.KATANA_API_KEY!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function kget(path: string): Promise<Record<string, unknown>> {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json", Authorization: `Bearer ${KEY}` }, cache: "no-store" });
    if (r.status === 429) { await sleep(Math.max(Number(r.headers.get("retry-after")) * 1000 || 0, 2500 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`Katana ${r.status} sur ${path}`);
    return (await r.json()) as Record<string, unknown>;
  }
  throw new Error(`Katana saturé sur ${path}`);
}

// pièce (variant Katana) → { SKU produit fini → nb de pièces par unité }, mémorisé 7 jours
type Usage = Record<string, number>;
async function usageOf(materialVariantId: number): Promise<Usage> {
  const key = `icelea_usage:${materialVariantId}`;
  try { const c = await kv.get<Usage>(key); if (c) return c; } catch { /* lecture du mémo ratée : on recalcule */ }
  const rec = ((await kget(`/v1/recipes?ingredient_variant_id=${materialVariantId}&limit=250`)).data ?? []) as Record<string, unknown>[];
  const rows = rec.filter((r) => Number(r.ingredient_variant_id) === materialVariantId);
  const per = new Map<number, number>();
  rows.forEach((r) => per.set(Number(r.product_variant_id), Number(r.quantity) || 1));
  const usage: Usage = {};
  const ids = [...per.keys()];
  for (let i = 0; i < ids.length; i += 50) {
    const vs = ((await kget(`/v1/variants?ids=${ids.slice(i, i + 50).join(",")}&limit=50`)).data ?? []) as Record<string, unknown>[];
    vs.forEach((v) => { if (v.sku) usage[String(v.sku)] = per.get(Number(v.id)) ?? 1; });
  }
  try { await kv.set(key, usage, { ex: 7 * 24 * 3600 }); } catch { /* noop */ }
  return usage;
}

// mémoire de ce qui a déjà été servi : po → variant → { commandeId: pièces attribuées }
type Served = Record<string, Record<string, number>>;
const KV_SERVED = (po: string) => `icelea_servi:${po}`;
const KV_ENROUTE = (po: string) => `icelea_enroute:${po}`;

export type ReceptionLine = { po: string; variantId: number; qty: number };
export type TagReport = { po: string; recu: string[]; partiel: string[]; restant: number; erreurs: string[] };

/** enroute = date d'arrivée prévue (jj.mm.aaaa) → mode « colis en route » ; absent = arrivée réelle. */
export async function tagOrdersAfterArrival(lines: ReceptionLine[], enroute?: string): Promise<TagReport[]> {
  const now = new Date(); const pad = (n: number) => String(n).padStart(2, "0");
  const date = enroute ?? `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  const byPo = new Map<string, Map<number, number>>();
  for (const l of lines) {
    if (!l.po || !l.variantId || !(l.qty > 0)) continue;
    const m = byPo.get(l.po) ?? byPo.set(l.po, new Map()).get(l.po)!;
    m.set(l.variantId, (m.get(l.variantId) ?? 0) + l.qty);
  }
  const reports: TagReport[] = [];
  for (const [po, received] of byPo) {
    const rep: TagReport = { po, recu: [], partiel: [], restant: 0, erreurs: [] };
    try {
      const { data, error } = await supabaseAdmin.from("icelea_po_pairs").select("order_id").eq("po_number", po);
      if (error) throw new Error(`liens illisibles : ${error.message}`);
      const orderIds = [...new Set((data ?? []).map((d: { order_id: number }) => Number(d.order_id)))];
      if (!orderIds.length) { reports.push(rep); continue; }
      const orders = (await getOrdersLite(orderIds)).filter((o) => !o.cancelled_at)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      // toutes les pièces de cette commande fournisseur (pour savoir si une cliente a TOUT reçu)
      const poRow = (((await kget(`/v1/purchase_orders?order_no=${encodeURIComponent(po)}`)).data ?? []) as Record<string, unknown>[])
        .find((p) => p.order_no === po);
      const poVariants = [...new Set(((poRow?.purchase_order_rows ?? []) as Record<string, unknown>[])
        .filter((r) => !r.deleted_at).map((r) => Number(r.variant_id)))];
      const usage = new Map<number, Usage>();
      for (const v of new Set([...poVariants, ...received.keys()])) usage.set(v, await usageOf(v));
      const need = (o: OrderLite, v: number) => o.line_items.reduce((s, li) =>
        s + (li.sku && usage.get(v)![li.sku] ? (li.fulfillable_quantity ?? li.quantity) * usage.get(v)![li.sku] : 0), 0);

      // en route : on répartit dans sa propre mémoire, mais une cliente « complète » compte aussi ce qui est déjà arrivé
      const arrived: Served = (await kv.get<Served>(KV_SERVED(po)).catch(() => null)) ?? {};
      const served: Served = enroute ? ((await kv.get<Served>(KV_ENROUTE(po)).catch(() => null)) ?? {}) : arrived;
      const dejaArrive = (v: number, o: OrderLite) => (enroute ? (arrived[v]?.[o.id] ?? 0) : 0);
      // répartition par ancienneté, pièce par pièce
      for (const [v, qty] of received) {
        let left = qty; const sv = (served[v] ??= {});
        for (const o of orders) {
          if (left <= 0) break;
          const missing = need(o, v) - (sv[o.id] ?? 0) - dejaArrive(v, o);
          if (missing <= 0) continue;
          const give = Math.min(missing, left);
          sv[o.id] = (sv[o.id] ?? 0) + give; left -= give;
        }
        rep.restant += left;
      }
      await kv.set(enroute ? KV_ENROUTE(po) : KV_SERVED(po), served, { ex: 180 * 24 * 3600 });

      // étiquette : seulement les commandes qui ont reçu quelque chose dans CET arrivage
      const touched = orders.filter((o) => [...received.keys()].some((v) => (served[v]?.[o.id] ?? 0) > 0 && need(o, v) > 0));
      for (const o of touched) {
        const toutRecu = poVariants.every((v) => need(o, v) <= (served[v]?.[o.id] ?? 0) + dejaArrive(v, o));
        const tag = enroute ? (toutRecu ? `Icelea-enroute:${date}` : `Icelea-enroute-partiel:${date}`)
          : toutRecu ? `Icelea-recu:${date}` : `Icelea-partiel:${date}`;
        try { await (enroute ? setIceleaEnrouteTag(o.id, tag) : setIceleaReceptionTag(o.id, tag)); (toutRecu ? rep.recu : rep.partiel).push(o.name); }
        catch (e) { rep.erreurs.push(`${o.name} : ${e instanceof Error ? e.message : String(e)}`); }
      }
    } catch (e) { rep.erreurs.push(e instanceof Error ? e.message : String(e)); }
    reports.push(rep);
  }
  try { await kv.set(`${enroute ? "icelea_enroute_rapport" : "icelea_marquage"}:${date}`, reports, { ex: 60 * 24 * 3600 }); } catch { /* noop */ }
  console.log(enroute ? "[icelea en route]" : "[icelea tag-orders]", JSON.stringify(reports.map((r) => ({ po: r.po, recu: r.recu.length, partiel: r.partiel.length, restant: r.restant, erreurs: r.erreurs.length }))));
  return reports;
}
