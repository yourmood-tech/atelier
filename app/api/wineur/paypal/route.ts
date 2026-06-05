import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import { getESTVRate } from "@/lib/wineur/estv-rates";
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

function r2(n: number) { return Math.round(n * 100) / 100; }

function e(out: Ecriture[], date: string, compte: string, libelle: string, montant: number, montant_orig?: number, devise?: string) {
  out.push({
    date,
    compte,
    libelle: libelle.replace(/,/g, "-").slice(0, 80),
    montant: r2(montant),
    ...(montant_orig !== undefined ? { montant_orig: r2(montant_orig) } : {}),
    ...(devise ? { devise } : {}),
  });
}

function lookupFournisseur(nom: string, email: string): string | null {
  const haystack = `${nom} ${email}`.toLowerCase();
  const config = comptesPaypal as Record<string, string>;
  for (const [k, v] of Object.entries(config)) {
    if (haystack.includes(k) || k.includes(haystack.split(" ")[0])) return v;
  }
  return null;
}

function parsePayerInfo(payer: Record<string, unknown>) {
  const nameObj  = payer?.payer_name as Record<string, string> | null;
  const altName  = nameObj?.alternate_full_name ?? `${nameObj?.given_name ?? ""} ${nameObj?.surname ?? ""}`.trim();
  const nom      = altName || "PayPal";
  const email    = String(payer?.email_address ?? "");
  const country  = String(payer?.country_code ?? "").toUpperCase();
  return { nom, email, country, isCH: country === "CH" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start et end requis" }, { status: 400 });

  const token = await getToken();
  const res = await fetch(
    `https://api-m.paypal.com/v1/reporting/transactions?start_date=${start}T00:00:00-0000&end_date=${end}T23:59:59-0000&fields=all&page_size=500`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return NextResponse.json({ error: `PayPal API ${res.status}` }, { status: 502 });

  const data = await res.json() as { transaction_details?: Record<string, unknown>[] };
  const txs  = data.transaction_details ?? [];
  const ecritures: Ecriture[] = [];

  // Codes ignorés : paires internes PayPal qui se neutralisent
  const IGNORE_CODES = new Set(["T1501", "T1105"]);

  for (const tx of txs) {
    const info  = tx.transaction_info as Record<string, unknown>;
    const payer = tx.payer_info       as Record<string, unknown>;
    if (String(info.transaction_status ?? "") !== "S") continue;

    const code    = String(info.transaction_event_code ?? "");
    if (IGNORE_CODES.has(code)) continue;

    const amtObj  = info.transaction_amount as Record<string, unknown>;
    const feeObj  = info.fee_amount          as Record<string, unknown> | null;
    const rawAmt  = Number(amtObj?.value ?? 0);
    const rawFee  = Number(feeObj?.value ?? 0);           // négatif dans l'API PayPal
    const fee     = Math.abs(rawFee);
    const devise  = String(amtObj?.currency_code ?? "CHF").toUpperCase();
    const feeDev  = String(feeObj?.currency_code ?? devise).toUpperCase();
    const date    = String(info.transaction_initiation_date ?? "").slice(0, 10);
    const cpte    = PAYPAL_COMPTES[devise] ?? COMPTES.PASSAGE_PAYPAL_CHF;
    const { nom, email, country, isCH } = parsePayerInfo(payer);

    // ═══════════════════════════════════════════════════════════════
    // T0200 — Conversion de devise (vente EUR/USD → CHF)
    // Enregistre le débit du compte devise ; la contrepartie CHF
    // vient du T0700 correspondant dans la même période.
    // L'écart de change est absorbé par le compte 670004.
    // ═══════════════════════════════════════════════════════════════
    if (code === "T0200") {
      const lib = `PayPal conversion ${devise}→CHF`;
      if (rawAmt < 0) {
        // Vente de devise : débit compte devise
        e(ecritures, date, cpte,               lib, rawAmt, rawAmt, devise);
        e(ecritures, date, COMPTES.DIFF_CHANGE, lib, -rawAmt, undefined, "CHF");
      } else {
        // Achat de devise (direction inverse, rare)
        e(ecritures, date, cpte,               lib, rawAmt, rawAmt, devise);
        e(ecritures, date, COMPTES.DIFF_CHANGE, lib, -rawAmt, undefined, "CHF");
      }
      continue;
    }

    // ═══════════════════════════════════════════════════════════════
    // T0700 — CHF reçu suite à conversion EUR→CHF
    // Crédit du compte CHF PayPal, débit 670004 (écart de change).
    // Ensemble avec T0200, 670004 reflète l'écart de change net.
    // ═══════════════════════════════════════════════════════════════
    if (code === "T0700") {
      const lib = "PayPal conversion →CHF reçu";
      e(ecritures, date, COMPTES.DIFF_CHANGE,    lib, -rawAmt);
      e(ecritures, date, COMPTES.PASSAGE_PAYPAL_CHF, lib, rawAmt);
      continue;
    }

    // ═══════════════════════════════════════════════════════════════
    // T0201 — Remboursement partiel client étranger (EUR négatif)
    // T1107 — Remboursement client CH (CHF négatif)
    // ═══════════════════════════════════════════════════════════════
    if (code === "T0201" || code === "T1107") {
      const brut = Math.abs(rawAmt);
      const lib  = `Rembt PayPal${nom !== "PayPal" ? ": " + nom : ""}`;
      const isRefundCH = code === "T1107" || isCH;
      if (isRefundCH) {
        const { ht, tva } = calculTva(brut);
        e(ecritures, date, COMPTES.VENTE_GEN, `${lib} HT`, ht);
        e(ecritures, date, COMPTES.TVA_VENTE, `${lib} TVA`, tva);
        e(ecritures, date, cpte,              lib,          -brut);
      } else {
        // Étranger : pas de TVA suisse → reverse simple
        e(ecritures, date, COMPTES.VENTE_GEN, lib, brut,  undefined, "CHF");
        e(ecritures, date, cpte,              lib, -brut, -brut,     devise);
      }
      continue;
    }

    // ═══════════════════════════════════════════════════════════════
    // T0003 positif & T0003 négatif + T0006 négatif
    // Ventes entrantes et paiements fournisseurs
    // ═══════════════════════════════════════════════════════════════
    const isSupplierCode = code === "T0006";
    const lib = `PayPal: ${nom}`;

    // ── VENTE / ENCAISSEMENT ────────────────────────────────────────
    if (rawAmt > 0 && !isSupplierCode) {
      const brut = rawAmt;
      const { ht, tva } = calculTva(brut);

      if (isCH) {
        e(ecritures, date, cpte,              lib,          brut, devise !== "CHF" ? brut : undefined, devise !== "CHF" ? devise : undefined);
        e(ecritures, date, COMPTES.VENTE_GEN, `${lib} HT`, -ht);
        e(ecritures, date, COMPTES.TVA_VENTE, `${lib} TVA`,-tva);
      } else {
        // Client étranger → pas de TVA suisse
        if (devise === "CHF") {
          e(ecritures, date, cpte,              lib, brut);
          e(ecritures, date, COMPTES.VENTE_GEN, lib, -brut);
        } else {
          e(ecritures, date, cpte,              lib, brut, brut, devise);
          e(ecritures, date, COMPTES.VENTE_GEN, lib, -brut);
        }
        void ht; void tva;
      }

      // Frais de transaction PayPal (dans la devise de la vente)
      if (fee > 0) {
        const cpteComm = PAYPAL_COMPTES[feeDev] ?? COMPTES.PASSAGE_PAYPAL_CHF;
        if (feeDev === "CHF") {
          e(ecritures, date, COMPTES.COMMISSION, `Commission ${lib}`, fee);
          e(ecritures, date, cpteComm,           `Commission ${lib}`,-fee);
        } else {
          // Frais en devise étrangère (ex: EUR) → enregistrer en devise
          e(ecritures, date, COMPTES.COMMISSION, `Commission ${lib}`, fee, fee, feeDev);
          e(ecritures, date, cpteComm,           `Commission ${lib}`,-fee,-fee, feeDev);
        }
      }
    }

    // ── PAIEMENT FOURNISSEUR ────────────────────────────────────────
    if (rawAmt < 0 || isSupplierCode) {
      const brut       = Math.abs(rawAmt);
      const cpteCharge = lookupFournisseur(nom.toLowerCase(), email.toLowerCase()) ?? "109999";

      if (isCH) {
        // Fournisseur suisse : brut = TTC → HT + TVA récupérable
        const { ht, tva } = calculTva(brut);
        e(ecritures, date, cpteCharge,       `${lib} HT`,              ht);
        e(ecritures, date, COMPTES.TVA_ACQ,  `TVA CH ${lib}`,          tva);
        e(ecritures, date, cpte,             lib,                      -brut, devise !== "CHF" ? -brut : undefined, devise !== "CHF" ? devise : undefined);
      } else {
        // Fournisseur étranger : brut = HT (en devise étrangère)
        // Le compte de charge est en CHF → conversion via taux ESTV du mois
        if (devise === "CHF") {
          const tvaAcq = r2(brut * TAUX);
          e(ecritures, date, cpteCharge,       lib,                             brut);
          e(ecritures, date, COMPTES.TVA_ACQ,  `TVA auto-liq. ${lib}`,         tvaAcq);
          e(ecritures, date, COMPTES.TVA_ACQ,  `TVA auto-liq. ${lib} (due)`,  -tvaAcq);
          e(ecritures, date, cpte,             lib,                            -brut);
        } else {
          const rate    = await getESTVRate(date, devise);
          const brutChf = r2(brut * rate);
          const tvaAcq  = r2(brutChf * TAUX);
          // Compte de charge : montant en CHF, avec montant_orig + devise pour traçabilité
          e(ecritures, date, cpteCharge,       lib,                             brutChf, brut,  devise);
          e(ecritures, date, COMPTES.TVA_ACQ,  `TVA auto-liq. ${lib}`,         tvaAcq);
          e(ecritures, date, COMPTES.TVA_ACQ,  `TVA auto-liq. ${lib} (due)`,  -tvaAcq);
          // Compte PayPal devise : montant en devise étrangère
          e(ecritures, date, cpte,             lib,                            -brut,   -brut, devise);
        }
      }
    }
  }

  return NextResponse.json({ ecritures, count: txs.length });
}
