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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start et end requis" }, { status: 400 });

  // Fetch payouts in date range
  const data = await shopifyGet(
    `/shopify_payments/payouts.json?date_min=${start}&date_max=${end}&limit=250`
  ) as { payouts?: Record<string, unknown>[] };

  const payouts = data.payouts ?? [];
  const ecritures = [];

  for (const payout of payouts) {
    const payoutId = payout.id as number;
    const payoutDate = String(payout.date ?? "").slice(0, 10);
    const payoutAmount = Number(payout.amount ?? 0);

    // Fetch transactions for this payout
    const txData = await shopifyGet(
      `/shopify_payments/payouts/${payoutId}/transactions.json?limit=250`
    ) as { transactions?: Record<string, unknown>[] };

    const txs = txData.transactions ?? [];

    for (const tx of txs) {
      const type = String(tx.type ?? "").toLowerCase();
      if (!["charge", "refund", "adjustment"].includes(type)) continue;

      const amount = Math.abs(Number(tx.amount ?? 0));
      const fee = Math.abs(Number(tx.fee ?? 0));
      const date = String(tx.processed_at ?? payoutDate).slice(0, 10);
      const orderId = tx.order_id ? `#${tx.order_id}` : `payout-${payoutId}`;
      const libelle = `Shopify ${orderId}`;
      const { ht, tva } = calculTva(amount);

      if (type === "refund") {
        // Remboursement — inverser les signes
        const tvaAcq = Math.round(amount * (8.1 / 100) * 100) / 100;
        ecritures.push({ date, compte: COMPTES.PASSAGE_SHOPIFY, libelle, montant: -amount });
        ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: `${libelle} (Acquis.)`, montant: amount });
        ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA s/acquis. ${libelle}`, montant: -tvaAcq });
        ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA s/acquis. ${libelle} (due)`, montant: tvaAcq });
        void ht; void tva;
      } else {
        ecritures.push(...formatEcriture(date, libelle, amount, COMPTES.VENTE_GEN, fee, "EXT", COMPTES.PASSAGE_SHOPIFY));
      }
    }

    // Écriture payout global (virement PostFinance)
    if (payoutAmount > 0) {
      ecritures.push({ date: payoutDate, compte: COMPTES.PASSAGE_POSTFINANCE, libelle: `Virement Shopify payout-${payoutId}`, montant: payoutAmount });
      ecritures.push({ date: payoutDate, compte: COMPTES.PASSAGE_SHOPIFY, libelle: `Virement Shopify payout-${payoutId}`, montant: -payoutAmount });
    }
  }

  return NextResponse.json({ ecritures, payouts: payouts.length });
}
