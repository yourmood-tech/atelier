import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva, formatEcriture } from "@/lib/wineur/accounting";

const TOKEN = process.env.SHOPIFY_PAYOUTS_TOKEN!;
const SHOP  = process.env.SHOPIFY_PAYOUTS_SHOP!;
const API_V = "2025-01";

async function shopifyGet(path: string) {
  const res = await fetch(`https://${SHOP}/admin/api/${API_V}${path}`, {
    headers: { "X-Shopify-Access-Token": TOKEN },
  });
  if (!res.ok) throw new Error(`Shopify ${res.status} on ${path}`);
  return res.json();
}

// Fetch billing country for a batch of order IDs (max 250 per call)
async function fetchOrderCountries(orderIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const chunks: number[][] = [];
  for (let i = 0; i < orderIds.length; i += 250)
    chunks.push(orderIds.slice(i, i + 250));

  await Promise.all(chunks.map(async (chunk) => {
    const data = await shopifyGet(
      `/orders.json?ids=${chunk.join(",")}&fields=id,billing_address&status=any&limit=250`
    ) as { orders?: Record<string, unknown>[] };
    for (const o of data.orders ?? []) {
      const billing = o.billing_address as Record<string, unknown> | null;
      const country = String(billing?.country_code ?? "").toUpperCase();
      map.set(o.id as number, country);
    }
  }));

  return map;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start et end requis" }, { status: 400 });

  const data = await shopifyGet(
    `/shopify_payments/payouts.json?date_min=${start}&date_max=${end}&limit=250`
  ) as { payouts?: Record<string, unknown>[] };

  const payouts = data.payouts ?? [];
  if (payouts.length === 0) return NextResponse.json({ ecritures: [], payouts: 0 });

  // Collect all transactions across all payouts
  const allTxs: Record<string, unknown>[] = [];
  const payoutMeta = new Map<number, { date: string; amount: number }>();

  for (const payout of payouts) {
    const payoutId     = payout.id as number;
    const payoutDate   = String(payout.date ?? "").slice(0, 10);
    const payoutAmount = Number(payout.amount ?? 0);
    payoutMeta.set(payoutId, { date: payoutDate, amount: payoutAmount });

    const txData = await shopifyGet(
      `/shopify_payments/payouts/${payoutId}/transactions.json?limit=250`
    ) as { transactions?: Record<string, unknown>[] };
    allTxs.push(...(txData.transactions ?? []));
  }

  // Collect unique order IDs to batch-fetch countries
  const orderIds = [
    ...new Set(
      allTxs
        .filter((tx) => tx.source_order_id != null)
        .map((tx) => tx.source_order_id as number)
    ),
  ];

  const countryMap = orderIds.length > 0 ? await fetchOrderCountries(orderIds) : new Map<number, string>();

  // Generate écritures
  const ecritures = [];

  for (const tx of allTxs) {
    const type = String(tx.type ?? "").toLowerCase();
    if (!["charge", "refund", "adjustment"].includes(type)) continue;

    const amount      = Math.abs(Number(tx.amount ?? 0));
    const fee         = Math.abs(Number(tx.fee ?? 0));
    const payoutId    = tx.payout_id as number;
    const payoutDate  = payoutMeta.get(payoutId)?.date ?? start;
    const date        = String(tx.processed_at ?? payoutDate).slice(0, 10);
    const orderId     = tx.source_order_id as number | null;
    const libelle     = orderId ? `Shopify #${orderId}` : `Shopify payout-${payoutId}`;

    // Déterminer CH ou étranger
    const country = orderId ? (countryMap.get(orderId) ?? "") : "";
    const isCH    = country === "CH";

    const { ht, tva } = calculTva(amount);
    const tvaAcq      = Math.round(amount * (8.1 / 100) * 100) / 100;

    if (type === "charge") {
      if (isCH) {
        // Vente suisse : TVA 8.1% ventilée
        ecritures.push(...formatEcriture(date, libelle, amount, COMPTES.VENTE_GEN, fee, "CH", COMPTES.PASSAGE_SHOPIFY));
      } else {
        // Vente étrangère : pas de TVA suisse
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
        // Remboursement suisse
        ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle: `Rembt ${libelle}`, montant: -amount });
        ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: `Rembt ${libelle} HT`, montant: ht });
        ecritures.push({ date, compte: COMPTES.TVA_VENTE, libelle: `Rembt ${libelle} TVA`, montant: tva });
      } else {
        // Remboursement étranger
        ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle: `Rembt ${libelle}`, montant: -amount });
        ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: `Rembt ${libelle}`, montant: amount });
        void tvaAcq;
      }
    } else {
      // Adjustment — traitement neutre
      ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle, montant: amount > 0 ? amount : -Math.abs(amount) });
      ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle, montant: amount > 0 ? -amount : Math.abs(amount) });
    }
  }

  // Écriture virement payout → PostFinance
  for (const [payoutId, { date, amount }] of payoutMeta) {
    if (amount > 0) {
      ecritures.push({ date, compte: COMPTES.PASSAGE_POSTFINANCE, libelle: `Virement Shopify payout-${payoutId}`, montant: amount });
      ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY,     libelle: `Virement Shopify payout-${payoutId}`, montant: -amount });
    }
  }

  return NextResponse.json({ ecritures, payouts: payouts.length, orders_fetched: orderIds.length });
}
