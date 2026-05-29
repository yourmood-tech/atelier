import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import comptesPaypal from "@/lib/wineur/comptes_paypal.json";

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const TAUX = 8.1 / 100;

const PAYPAL_COMPTES: Record<string, string> = {
  CHF: COMPTES.PASSAGE_PAYPAL_CHF,
  EUR: COMPTES.PASSAGE_PAYPAL_EUR,
  USD: COMPTES.PASSAGE_PAYPAL_USD,
};

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
  out.push({
    date,
    compte,
    libelle: libelle.replace(/,/g, "-").slice(0, 80),
    montant: round2(montant),
    ...(montant_orig !== undefined ? { montant_orig: round2(montant_orig) } : {}),
    ...(devise ? { devise } : {}),
  });
}

function lookupFournisseur(nom: string, email: string): string | null {
  const haystack = `${nom} ${email}`.toLowerCase().replace(/\s+/g, " ");
  const config = comptesPaypal as Record<string, string>;
  for (const [k, v] of Object.entries(config)) {
    if (haystack.includes(k) || k.includes(haystack.split(" ")[0])) return v;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start et end requis" }, { status: 400 });

  const token = await getToken();
  const res = await fetch(
    `https://api-m.paypal.com/v1/reporting/transactions?start_date=${start}T00:00:00-0000&end_date=${end}T23:59:59-0000&fields=all&page_size=500`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  if (!res.ok) return NextResponse.json({ error: `PayPal API ${res.status}` }, { status: 502 });

  const data  = await res.json() as { transaction_details?: Record<string, unknown>[] };
  const txs   = data.transaction_details ?? [];
  const ecritures: Ecriture[] = [];

  for (const tx of txs) {
    const info  = tx.transaction_info  as Record<string, unknown>;
    const payer = tx.payer_info        as Record<string, unknown>;
    if (String(info.transaction_status ?? "") !== "S") continue;

    const amtObj  = info.transaction_amount as Record<string, unknown>;
    const feeObj  = info.fee_amount          as Record<string, unknown> | null;
    const rawAmt  = Number(amtObj?.value ?? 0);        // peut être négatif
    const fee     = Math.abs(Number(feeObj?.value ?? 0));
    const devise  = String(amtObj?.currency_code ?? "CHF").toUpperCase();
    const date    = String(info.transaction_initiation_date ?? "").slice(0, 10);

    const nameObj = payer?.payer_name as Record<string, string> | null;
    const altName = nameObj?.alternate_full_name ?? `${nameObj?.given_name ?? ""} ${nameObj?.surname ?? ""}`.trim();
    const nom     = altName || "PayPal";
    const email   = String(payer?.email_address ?? "");
    const cpte    = PAYPAL_COMPTES[devise] ?? COMPTES.PASSAGE_PAYPAL_CHF;

    // ── VENTE / ENCAISSEMENT (montant positif) ──────────────────────────────
    if (rawAmt > 0) {
      const brut = rawAmt;
      const { ht, tva } = calculTva(brut);
      const lib = `PayPal: ${nom}`;

      if (devise === "CHF") {
        add(ecritures, date, cpte,              lib,          brut);
        add(ecritures, date, COMPTES.VENTE_GEN, `${lib} HT`, -ht);
        add(ecritures, date, COMPTES.TVA_VENTE, `${lib} TVA`,-tva);
      } else {
        // Montant en devise étrangère — on n'a pas le taux de conversion ici,
        // on enregistre dans le compte devise correspondant
        add(ecritures, date, cpte,              lib,          brut,  brut,  devise);
        add(ecritures, date, COMPTES.VENTE_GEN, `${lib} HT`, -ht,   undefined, "CHF");
        add(ecritures, date, COMPTES.TVA_VENTE, `${lib} TVA`,-tva,  undefined, "CHF");
      }
      if (fee > 0) {
        add(ecritures, date, COMPTES.COMMISSION, `Commission ${lib}`, fee);
        add(ecritures, date, cpte,               `Commission ${lib}`,-fee);
      }
    }

    // ── PAIEMENT FOURNISSEUR (montant négatif) ──────────────────────────────
    if (rawAmt < 0) {
      const brut = Math.abs(rawAmt);
      const lib  = `PayPal: ${nom}`;
      const cpteCharge = lookupFournisseur(nom.toLowerCase(), email.toLowerCase());

      if (cpteCharge) {
        // Fournisseur connu dans la config
        const isCh = email.endsWith(".ch") || nom.toLowerCase().includes("suisse") || nom.toLowerCase().includes("schweiz");
        if (isCh) {
          const { ht, tva } = calculTva(brut);
          add(ecritures, date, cpteCharge,       `${lib} HT`, ht);
          add(ecritures, date, COMPTES.TVA_ACQ,  `TVA achat CH ${lib}`, tva);
        } else {
          const tvaZero = round2(brut * TAUX / (1 + TAUX));
          add(ecritures, date, cpteCharge,      lib, brut);
          add(ecritures, date, COMPTES.TVA_ACQ, `TVA acq étr. ${lib}`, tvaZero);
          add(ecritures, date, COMPTES.TVA_ACQ, `TVA acq étr. ${lib} contrepartie`, -tvaZero);
        }
        add(ecritures, date, cpte, lib, -brut);
      } else {
        // Fournisseur inconnu — on enregistre sur compte attente (109999)
        add(ecritures, date, "109999", `ATTENTE PayPal: ${nom} <${email}>`, brut);
        add(ecritures, date, cpte,     `ATTENTE PayPal: ${nom}`, -brut);
      }
    }
  }

  return NextResponse.json({ ecritures, count: txs.length });
}
