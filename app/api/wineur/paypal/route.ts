import { NextRequest, NextResponse } from "next/server";
import { COMPTES, PAYPAL_COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const TAUX = 8.1 / 100;

async function getToken(): Promise<string> {
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const j = await res.json() as { access_token?: string };
  if (!j.access_token) throw new Error("PayPal auth failed");
  return j.access_token;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

function add(out: Ecriture[], date: string, compte: string, libelle: string, montant: number, montant_orig?: number, devise?: string) {
  out.push({ date, compte, libelle: libelle.replace(/,/g, "-"), montant: round2(montant), ...(montant_orig !== undefined ? { montant_orig: round2(montant_orig) } : {}), ...(devise ? { devise } : {}) });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start et end requis" }, { status: 400 });

  const token = await getToken();

  const res = await fetch(
    `https://api-m.paypal.com/v1/reporting/transactions?start_date=${start}T00:00:00-0000&end_date=${end}T23:59:59-0000&fields=all&page_size=500`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );

  if (!res.ok) return NextResponse.json({ error: `PayPal API ${res.status}` }, { status: 502 });
  const data = await res.json() as { transaction_details?: Record<string, unknown>[] };
  const txs = data.transaction_details ?? [];

  const ecritures: Ecriture[] = [];

  for (const tx of txs) {
    const info = tx.transaction_info as Record<string, unknown>;
    const payer = tx.payer_info as Record<string, unknown>;
    const etat = String(info.transaction_status ?? "").toUpperCase();
    if (etat !== "S") continue; // S = completed

    const typeCode = String(info.transaction_event_code ?? "");
    const devise = String((info.transaction_amount as Record<string, unknown>)?.currency_code ?? "CHF").toUpperCase();
    const montantBrut = Math.abs(Number((info.transaction_amount as Record<string, unknown>)?.value ?? 0));
    const feeVal = Math.abs(Number((info.fee_amount as Record<string, unknown>)?.value ?? 0));
    const date = String(info.transaction_initiation_date ?? "").slice(0, 10);
    const nom = String(payer?.payer_name ?? (payer as Record<string, unknown>)?.email_address ?? "PayPal");
    const lib = `PayPal: ${nom}`;
    const cptePaypal = PAYPAL_COMPTES[devise] ?? COMPTES.PASSAGE_PAYPAL_CHF;

    // T00xx = ventes (paiements reçus)
    if (typeCode.startsWith("T00") || typeCode.startsWith("T01")) {
      const { ht, tva } = calculTva(montantBrut);
      if (devise === "CHF") {
        add(ecritures, date, cptePaypal, lib, montantBrut, undefined, "CHF");
        add(ecritures, date, COMPTES.VENTE_GEN, `${lib} HT`, -ht, undefined, "CHF");
        add(ecritures, date, COMPTES.TVA_VENTE, `${lib} TVA`, -tva, undefined, "CHF");
      } else {
        add(ecritures, date, cptePaypal, lib, montantBrut, montantBrut, devise);
        add(ecritures, date, COMPTES.VENTE_GEN, `${lib} HT`, -ht, undefined, "CHF");
        add(ecritures, date, COMPTES.TVA_VENTE, `${lib} TVA`, -tva, undefined, "CHF");
      }
      if (feeVal > 0) {
        add(ecritures, date, COMPTES.COMMISSION, `Commission ${lib}`, feeVal, undefined, "CHF");
        add(ecritures, date, cptePaypal, `Commission ${lib}`, -feeVal, undefined, "CHF");
      }
    }

    // T02xx = remboursements
    if (typeCode.startsWith("T02")) {
      const { ht, tva } = calculTva(montantBrut);
      add(ecritures, date, cptePaypal, `Rembt ${lib}`, -montantBrut, undefined, "CHF");
      add(ecritures, date, COMPTES.VENTE_GEN, `Rembt ${lib} HT`, ht, undefined, "CHF");
      add(ecritures, date, COMPTES.TVA_VENTE, `Rembt ${lib} TVA`, tva, undefined, "CHF");
    }

    // T10xx / T11xx = paiements fournisseurs
    if (typeCode.startsWith("T10") || typeCode.startsWith("T11")) {
      const isCh = String(payer?.address_info ?? "").toLowerCase().includes("ch");
      if (isCh) {
        const { ht, tva } = calculTva(montantBrut);
        add(ecritures, date, COMPTES.VENTE_GEN, `${lib} HT`, montantBrut - tva, undefined, "CHF");
        add(ecritures, date, COMPTES.TVA_ACQ, `TVA achat CH ${lib}`, tva, undefined, "CHF");
      } else {
        const tvaZero = round2(montantBrut * TAUX / (1 + TAUX));
        add(ecritures, date, COMPTES.VENTE_GEN, lib, montantBrut, undefined, "CHF");
        add(ecritures, date, COMPTES.TVA_ACQ, `TVA acq étr. ${lib}`, tvaZero, undefined, "CHF");
        add(ecritures, date, COMPTES.TVA_ACQ, `TVA acq étr. ${lib} contrepartie`, -tvaZero, undefined, "CHF");
      }
      add(ecritures, date, cptePaypal, lib, -montantBrut, undefined, "CHF");
    }
  }

  return NextResponse.json({ ecritures, count: txs.length });
}
