// Outil SAV (16.10.2026, cahier des charges de Philippe)
//  • retour reçu : n° de commande + type (1 échange de taille, 2 problème de qualité, 3 annulation)
//    → étiquette « SAV-<ECHANGE|QUALITE|ANNULATION>-RETOUR-LE-<jj.mm.aaaa>-NON-TRAITE », puis « …-TRAITE » ;
//  • échange de taille : la commande d'échange part en production tout de suite, étiquette
//    « ECHANGE-<n° d'origine> » ; la commande d'origine reçoit dans ses notes « Echange-<n° d'échange> » ;
//  • à l'expédition d'une commande d'échange : si l'original n'est pas revenu (pas d'étiquette
//    SAV-ECHANGE-RETOUR-LE…), la commande d'échange est « ORPHELINE » (étiquette ECHANGE-ORPHELINE + liste SAV).
import { kv } from "@vercel/kv";
import { shopifyGet, shopifyWrite } from "@/lib/shopify";

export type TypeSav = 1 | 2 | 3;
export const TYPES_SAV: Record<TypeSav, string> = { 1: "Échange de taille", 2: "Problème de qualité", 3: "Annulation" };
// nom du type dans l'étiquette Shopify (demande Philippe : le nom, pas le chiffre)
export const MOT_SAV: Record<TypeSav, string> = { 1: "ECHANGE", 2: "QUALITE", 3: "ANNULATION" };
export type Retour = { orderId: number; commande: string; client: string; type: TypeSav; date: string; etat: "NON-TRAITE" | "TRAITE"; tag: string; par?: string; traiteLe?: string };
export type Orpheline = { orderId: number; commande: string; original: string; client: string; depuis: string };

const K_RETOURS = "sav:retours";
const K_ORPH = "sav:orphelines";
const ORPH_TAG = "ECHANGE-ORPHELINE";

const auj = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`; };
const num = (s: string) => s.replace(/\D/g, "");

async function commandeParNumero(n: string): Promise<Record<string, unknown> | null> {
  const j = await shopifyGet(`/orders.json?name=%23${num(n)}&status=any&limit=1&fields=id,name,tags,note,email,customer`);
  return ((j.orders ?? []) as Record<string, unknown>[])[0] ?? null;
}
const tagsDe = (o: Record<string, unknown>) => String(o.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
async function ecrireTags(orderId: number, tags: string[]) {
  await shopifyWrite("PUT", `/orders/${orderId}.json`, { order: { id: orderId, tags: [...new Set(tags)].join(", ") } });
}
const nomClient = (o: Record<string, unknown>) => {
  const c = (o.customer ?? {}) as Record<string, unknown>;
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || String(o.email ?? "");
};

// ── retours ────────────────────────────────────────────────────────────────
export async function enregistrerRetour(numero: string, type: TypeSav, par: string): Promise<Retour> {
  const o = await commandeParNumero(numero);
  if (!o) throw new Error(`Commande #${num(numero)} introuvable dans Shopify`);
  const tag = `SAV-${MOT_SAV[type]}-RETOUR-LE-${auj()}-NON-TRAITE`;
  await ecrireTags(Number(o.id), [...tagsDe(o), tag]);
  const r: Retour = { orderId: Number(o.id), commande: String(o.name), client: nomClient(o), type, date: auj(), etat: "NON-TRAITE", tag, par };
  const all = (await kv.get<Retour[]>(K_RETOURS)) ?? [];
  await kv.set(K_RETOURS, [r, ...all].slice(0, 2000));
  // échange de taille : l'original est revenu → sa commande d'échange n'est plus orpheline
  if (type === 1) {
    const m = String(o.note ?? "").match(/Echange-#?(\d+)/i);
    if (m) {
      const ech = await commandeParNumero(m[1]);
      if (ech && tagsDe(ech).includes(ORPH_TAG)) await ecrireTags(Number(ech.id), tagsDe(ech).filter((t) => t !== ORPH_TAG));
    }
    const orph = (await kv.get<Orpheline[]>(K_ORPH)) ?? [];
    await kv.set(K_ORPH, orph.filter((x) => num(x.original) !== num(String(o.name))));
  }
  return r;
}

export async function marquerTraite(orderId: number, tag: string, par: string): Promise<void> {
  const j = await shopifyGet(`/orders/${orderId}.json?fields=id,tags`);
  const o = (j.order ?? {}) as Record<string, unknown>;
  const nouveau = tag.replace(/-NON-TRAITE$/, "-TRAITE");
  await ecrireTags(orderId, tagsDe(o).map((t) => (t === tag ? nouveau : t)));
  const all = (await kv.get<Retour[]>(K_RETOURS)) ?? [];
  await kv.set(K_RETOURS, all.map((r) => (r.orderId === orderId && r.tag === tag ? { ...r, etat: "TRAITE" as const, tag: nouveau, traiteLe: auj(), par } : r)));
}

export async function listes(): Promise<{ nonTraites: Retour[]; traites: Retour[]; orphelines: Orpheline[] }> {
  const all = (await kv.get<Retour[]>(K_RETOURS)) ?? [];
  return { nonTraites: all.filter((r) => r.etat === "NON-TRAITE"), traites: all.filter((r) => r.etat === "TRAITE").slice(0, 100),
    orphelines: (await kv.get<Orpheline[]>(K_ORPH)) ?? [] };
}

// ── échange de taille ──────────────────────────────────────────────────────
// lignes : article de la commande d'origine → variante de la nouvelle taille (même produit)
export async function creerCommandeEchange(numeroOrigine: string, lignes: { lineItemId: number; taille: string }[]): Promise<{ commande: string; orderId: number }> {
  const j = await shopifyGet(`/orders.json?name=%23${num(numeroOrigine)}&status=any&limit=1`);
  const o = ((j.orders ?? []) as Record<string, unknown>[])[0];
  if (!o) throw new Error(`Commande #${num(numeroOrigine)} introuvable`);
  const items = (o.line_items ?? []) as Record<string, unknown>[];
  const nouvelles: { variant_id: number; quantity: number; price: string }[] = [];
  for (const l of lignes) {
    const li = items.find((x) => Number(x.id) === l.lineItemId);
    if (!li) throw new Error(`Article ${l.lineItemId} absent de ${o.name}`);
    const vs = ((await shopifyGet(`/products/${li.product_id}/variants.json?limit=250&fields=id,sku,option1,option2,option3,title`)).variants ?? []) as Record<string, unknown>[];
    const v = vs.find((x) => [x.option1, x.option2, x.option3].some((op) => String(op ?? "").trim() === l.taille))
      ?? vs.find((x) => new RegExp(`-${l.taille}$`).test(String(x.sku ?? "")));
    if (!v) throw new Error(`Pas de taille ${l.taille} pour « ${li.title} »`);
    nouvelles.push({ variant_id: Number(v.id), quantity: Number(li.quantity) || 1, price: "0.00" });
  }
  const cust = (o.customer ?? {}) as Record<string, unknown>;
  const cree = await shopifyWrite("POST", "/orders.json", {
    order: {
      line_items: nouvelles,
      customer: cust.id ? { id: cust.id } : undefined,
      email: o.email,
      shipping_address: o.shipping_address, billing_address: o.billing_address,
      financial_status: "paid", send_receipt: false, send_fulfillment_receipt: false,
      tags: `ECHANGE-${num(String(o.name))}`,
    },
  });
  const n = (cree.order ?? {}) as Record<string, unknown>;
  const nouveauNum = num(String(n.name));
  // note de la commande d'origine : « Echange-<n° d'échange> »
  const note = [String(o.note ?? "").trim(), `Echange-${nouveauNum}`].filter(Boolean).join("\n");
  await shopifyWrite("PUT", `/orders/${o.id}.json`, { order: { id: o.id, note } });
  return { commande: String(n.name), orderId: Number(n.id) };
}

// ── contrôle à l'expédition ────────────────────────────────────────────────
export async function controleExpedition(orderId: number): Promise<{ orpheline: boolean; original?: string }> {
  const j = await shopifyGet(`/orders/${orderId}.json?fields=id,name,tags,email,customer`);
  const o = (j.order ?? {}) as Record<string, unknown>;
  const ech = tagsDe(o).map((t) => t.match(/^ECHANGE-(\d+)$/)).find(Boolean);
  if (!ech) return { orpheline: false };
  const orig = await commandeParNumero(ech[1]);
  const revenu = !!orig && tagsDe(orig).some((t) => t.startsWith("SAV-ECHANGE-RETOUR-LE-"));
  if (revenu) return { orpheline: false, original: `#${ech[1]}` };
  if (!tagsDe(o).includes(ORPH_TAG)) await ecrireTags(orderId, [...tagsDe(o), ORPH_TAG]);
  const orph = (await kv.get<Orpheline[]>(K_ORPH)) ?? [];
  if (!orph.some((x) => x.orderId === orderId))
    await kv.set(K_ORPH, [{ orderId, commande: String(o.name), original: `#${ech[1]}`, client: nomClient(o), depuis: auj() }, ...orph]);
  return { orpheline: true, original: `#${ech[1]}` };
}
