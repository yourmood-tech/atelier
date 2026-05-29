import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva, formatEcriture } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";

const API_V = "2025-01";

// Toutes les boutiques configurées
const STORES = [
  { name: "yourmood",    shop: process.env.SHOPIFY_PAYOUTS_SHOP!,     token: process.env.SHOPIFY_PAYOUTS_TOKEN! },
  { name: "joaillerie",  shop: process.env.SHOPIFY_JOAILLERIE_SHOP!,  token: process.env.SHOPIFY_JOAILLERIE_TOKEN! },
  { name: "marketplace", shop: process.env.SHOPIFY_MARKETPLACE_SHOP!, token: process.env.SHOPIFY_MARKETPLACE_TOKEN! },
].filter(s => s.shop && s.token);

async function shopifyGet(shop: string, token: string, path: string) {
  const res = await fetch(`https://${shop}/admin/api/${API_V}${path}`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  if (!res.ok) throw new Error(`Shopify ${res.status} on ${shop}${path}`);
  return res.json();
}

async function processStore(
  shop: string,
  token: string,
  storeName: string,
  start: string,
  end: string
): Promise<{ ecritures: Ecriture[]; payouts: number; orders: number; error?: string }> {
  try {
    const data = await shopifyGet(shop, token,
      `/shopify_payments/payouts.json?date_min=${start}&date_max=${end}&limit=250`
    ) as { payouts?: Record<string, unknown>[] };

    const payouts = data.payouts ?? [];
    if (payouts.length === 0) return { ecritures: [], payouts: 0, orders: 0 };

    const allTxs: Record<string, unknown>[] = [];
    const payoutMeta = new Map<number, { date: string; amount: number }>();

    for (const payout of payouts) {
      const payoutId     = payout.id as number;
      const payoutDate   = String(payout.date ?? "").slice(0, 10);
      const payoutAmount = Number(payout.amount ?? 0);
      payoutMeta.set(payoutId, { date: payoutDate, amount: payoutAmount });

      const txData = await shopifyGet(shop, token,
        `/shopify_payments/payouts/${payoutId}/transactions.json?limit=250`
      ) as { transactions?: Record<string, unknown>[] };
      allTxs.push(...(txData.transactions ?? []));
    }

    // Batch-fetch pays de facturation + nom de commande
    const orderIds = [...new Set(
      allTxs.filter(tx => tx.source_order_id != null).map(tx => tx.source_order_id as number)
    )];

    const countryMap = new Map<number, string>();
    const nameMap    = new Map<number, string>();

    for (let i = 0; i < orderIds.length; i += 250) {
      const chunk = orderIds.slice(i, i + 250);
      const orders = await shopifyGet(shop, token,
        `/orders.json?ids=${chunk.join(",")}&fields=id,name,billing_address&status=any&limit=250`
      ) as { orders?: Record<string, unknown>[] };
      for (const o of orders.orders ?? []) {
        const billing = o.billing_address as Record<string, unknown> | null;
        countryMap.set(o.id as number, String(billing?.country_code ?? "").toUpperCase());
        nameMap.set(o.id as number, String(o.name ?? "").replace("#", ""));
      }
    }

    const ecritures: Ecriture[] = [];

    for (const tx of allTxs) {
      const type = String(tx.type ?? "").toLowerCase();
      if (!["charge", "refund", "adjustment"].includes(type)) continue;

      const amount     = Math.abs(Number(tx.amount ?? 0));
      const fee        = Math.abs(Number(tx.fee ?? 0));
      const payoutId   = tx.payout_id as number;
      const payoutDate = payoutMeta.get(payoutId)?.date ?? start;
      const date       = String(tx.processed_at ?? payoutDate).slice(0, 10);
      const orderId    = tx.source_order_id as number | null;
      const orderName  = orderId ? nameMap.get(orderId) : undefined;
      const libelle    = orderName ? `Shopify ${orderName}` : `Shopify payout-${payoutId}`;
      const isCH       = (countryMap.get(orderId ?? 0) ?? "") === "CH";
      const { ht, tva } = calculTva(amount);

      if (type === "charge") {
        if (isCH) {
          ecritures.push(...formatEcriture(date, libelle, amount, COMPTES.VENTE_GEN, fee, "CH", COMPTES.PASSAGE_SHOPIFY));
        } else {
          ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle, montant: amount });
          ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle, montant: -amount });
          if (fee > 0) {
            ecritures.push({ date, compte: COMPTES.FRAIS, libelle: `Frais ${libelle}`, montant: fee });
            ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle: `Frais ${libelle}`, montant: -fee });
          }
          void ht; void tva;
        }
      } else if (type === "refund") {
        if (isCH) {
          ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle: `Rembt ${libelle}`, montant: -amount });
          ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: `Rembt ${libelle} HT`, montant: ht });
          ecritures.push({ date, compte: COMPTES.TVA_VENTE, libelle: `Rembt ${libelle} TVA`, montant: tva });
        } else {
          ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle: `Rembt ${libelle}`, montant: -amount });
          ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: `Rembt ${libelle}`, montant: amount });
        }
      } else {
        ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle, montant: amount > 0 ? amount : -Math.abs(amount) });
        ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle, montant: amount > 0 ? -amount : Math.abs(amount) });
      }
    }

    // Virement payout → compte bancaire PostFinance (100101 = IBAN ends 5, compte principal)
    for (const [payoutId, { date, amount }] of payoutMeta) {
      if (amount > 0) {
        const lib = `Virement ${storeName} payout-${payoutId}`;
        ecritures.push({ date, compte: "100101",                 libelle: lib, montant:  amount });
        ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY,  libelle: lib, montant: -amount });
      }
    }

    return { ecritures, payouts: payouts.length, orders: orderIds.length };
  } catch (err) {
    const msg = String(err);
    // Scope manquant → signaler sans bloquer les autres boutiques
    if (msg.includes("read_shopify_payments_payouts")) {
      return { ecritures: [], payouts: 0, orders: 0, error: `${storeName}: permission read_shopify_payments_payouts manquante` };
    }
    return { ecritures: [], payouts: 0, orders: 0, error: `${storeName}: ${msg.slice(0, 100)}` };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start et end requis" }, { status: 400 });

  // Traiter toutes les boutiques en parallèle
  const results = await Promise.all(
    STORES.map(s => processStore(s.shop, s.token, s.name, start, end))
  );

  const ecritures = results.flatMap(r => r.ecritures);
  const errors    = results.filter(r => r.error).map(r => r.error);
  const totalPayouts = results.reduce((s, r) => s + r.payouts, 0);
  const totalOrders  = results.reduce((s, r) => s + r.orders, 0);

  return NextResponse.json({
    ecritures,
    payouts: totalPayouts,
    orders_fetched: totalOrders,
    stores: STORES.map((s, i) => ({ name: s.name, payouts: results[i].payouts, error: results[i].error })),
    ...(errors.length > 0 ? { warnings: errors } : {}),
  });
}
