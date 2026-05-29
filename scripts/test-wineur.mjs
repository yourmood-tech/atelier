#!/usr/bin/env node
// Test des 3 sources API directes — génère le CSV WinEUR et affiche pour vérification
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync("/Users/philippe/katana-scanner-mvp/.env.local", "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const TAUX = 8.1 / 100;
const COMPTES = {
  PASSAGE_SUMUP:    "220004",
  PASSAGE_SHOPIFY:  "220006",
  PASSAGE_PAYPAL_CHF: "100401",
  PASSAGE_PAYPAL_EUR: "100402",
  PASSAGE_PAYPAL_USD: "100404",
  PASSAGE_POSTFINANCE: "220001",
  TVA_ACQ:   "117001",
  TVA_VENTE: "217001",
  FRAIS:     "640004",
  COMMISSION:"640002",
  VENTE_GEN: "320001",
};
const SUMUP_MAP = {
  "carouge@yourmood.net":  { lieu: "Carouge",  compte: "320004" },
  "orbe@yourmood.net":     { lieu: "Orbe",      compte: "320002" },
  "martigny@yourmood.net": { lieu: "Martigny",  compte: "320003" },
  "zurich@yourmood.net":   { lieu: "Zurich",    compte: "320005" },
  "fribourg@yourmood.net": { lieu: "Fribourg",  compte: "320006" },
  "zermatt@yourmood.net":  { lieu: "Zermatt",   compte: "320008" },
  "manor@yourmood.net":    { lieu: "Stand-foire", compte: "320009" },
};

function r2(n) { return Math.round(n * 100) / 100; }
function calcTva(brut) { const ht = r2(brut / (1 + TAUX)); return { ht, tva: r2(brut - ht) }; }

const START = "2026-05-28";
const END   = "2026-05-28";

// ─── SUMUP ────────────────────────────────────────────────────────────────────
async function testSumUp() {
  const res = await fetch(
    `https://api.sumup.com/v0.1/me/transactions/history?oldest_time=${START}T00:00:00.000Z&newest_time=${END}T23:59:59.000Z&limit=500`,
    { headers: { Authorization: `Bearer ${env.SUMUP_ACCESS_TOKEN}` } }
  );
  const { items = [] } = await res.json();
  const ecritures = [];
  for (const t of items) {
    if (t.status !== "SUCCESSFUL" || t.type !== "PAYMENT") continue;
    const boutique = SUMUP_MAP[t.user?.toLowerCase()];
    if (!boutique) { console.log(`  [SumUp] Terminal inconnu: ${t.user}`); continue; }
    const brut  = Number(t.amount);
    const frais = Number(t.transaction_fee ?? 0);
    const date  = String(t.timestamp).slice(0, 10);
    const lib   = `SumUp ${boutique.lieu}`;
    const { ht, tva } = calcTva(brut);
    ecritures.push([date, COMPTES.PASSAGE_SUMUP,  lib,         brut]);
    ecritures.push([date, boutique.compte,         `${lib} HT`, -ht]);
    ecritures.push([date, COMPTES.TVA_VENTE,       `${lib} TVA`, -tva]);
    if (frais) {
      ecritures.push([date, COMPTES.FRAIS,          `Frais ${lib}`, frais]);
      ecritures.push([date, COMPTES.PASSAGE_SUMUP,  `Frais ${lib}`, -frais]);
    }
  }
  return ecritures;
}

// ─── PAYPAL ───────────────────────────────────────────────────────────────────
import { readFileSync as rfs } from "fs";
const comptesPaypal = JSON.parse(rfs("/Users/philippe/katana-scanner-mvp/lib/wineur/comptes_paypal.json", "utf8"));

function lookupFournisseur(nom, email) {
  const haystack = `${nom} ${email}`.toLowerCase();
  for (const [k, v] of Object.entries(comptesPaypal)) {
    if (haystack.includes(k) || k.includes(haystack.split(" ")[0])) return v;
  }
  return null;
}

async function getPaypalToken() {
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  return (await res.json()).access_token;
}

async function testPayPal() {
  const token = await getPaypalToken();
  const res = await fetch(
    `https://api-m.paypal.com/v1/reporting/transactions?start_date=${START}T00:00:00-0000&end_date=${END}T23:59:59-0000&fields=all&page_size=500`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { transaction_details = [] } = await res.json();
  const ecritures = [];
  const PAYPAL_COMPTES = { CHF: COMPTES.PASSAGE_PAYPAL_CHF, EUR: COMPTES.PASSAGE_PAYPAL_EUR, USD: COMPTES.PASSAGE_PAYPAL_USD };

  for (const tx of transaction_details) {
    const info  = tx.transaction_info;
    const payer = tx.payer_info;
    if (info.transaction_status !== "S") continue;

    const rawAmt = Number(info.transaction_amount?.value ?? 0);
    const fee    = Math.abs(Number(info.fee_amount?.value ?? 0));
    const devise = String(info.transaction_amount?.currency_code ?? "CHF").toUpperCase();
    const date   = String(info.transaction_initiation_date ?? "").slice(0, 10);
    const nameObj = payer?.payer_name;
    const altName = nameObj?.alternate_full_name ?? `${nameObj?.given_name ?? ""} ${nameObj?.surname ?? ""}`.trim();
    const nom = altName || "PayPal";
    const email  = String(payer?.email_address ?? "");
    const lib    = `PayPal: ${nom}`.replace(/,/g, "-").slice(0, 80);
    const cpte   = PAYPAL_COMPTES[devise] ?? COMPTES.PASSAGE_PAYPAL_CHF;

    // VENTE (montant positif)
    if (rawAmt > 0) {
      const brut = rawAmt;
      const { ht, tva } = calcTva(brut);
      if (devise === "CHF") {
        ecritures.push([date, cpte,              lib,          brut, "", ""]);
        ecritures.push([date, COMPTES.VENTE_GEN, `${lib} HT`, -ht,  "", "CHF"]);
        ecritures.push([date, COMPTES.TVA_VENTE, `${lib} TVA`,-tva, "", "CHF"]);
      } else {
        ecritures.push([date, cpte,              lib,          brut, brut, devise]);
        ecritures.push([date, COMPTES.VENTE_GEN, `${lib} HT`, -ht,  "",   "CHF"]);
        ecritures.push([date, COMPTES.TVA_VENTE, `${lib} TVA`,-tva, "",   "CHF"]);
      }
      if (fee > 0) {
        ecritures.push([date, COMPTES.COMMISSION, `Commission ${lib}`, fee,  "", "CHF"]);
        ecritures.push([date, cpte,               `Commission ${lib}`, -fee, "", "CHF"]);
      }
    }

    // PAIEMENT FOURNISSEUR (montant négatif)
    if (rawAmt < 0) {
      const brut = Math.abs(rawAmt);
      const cpteCharge = lookupFournisseur(nom.toLowerCase(), email.toLowerCase());
      if (cpteCharge) {
        const isCh = email.endsWith(".ch");
        if (isCh) {
          const { ht, tva } = calcTva(brut);
          ecritures.push([date, cpteCharge,       `${lib} HT`, ht,  "", "CHF"]);
          ecritures.push([date, COMPTES.TVA_ACQ,  `TVA CH ${lib}`, tva, "", "CHF"]);
        } else {
          const tvaZero = r2(brut * TAUX / (1 + TAUX));
          ecritures.push([date, cpteCharge,       lib, brut, "", "CHF"]);
          ecritures.push([date, COMPTES.TVA_ACQ,  `TVA étr. ${lib}`,  tvaZero,  "", "CHF"]);
          ecritures.push([date, COMPTES.TVA_ACQ,  `TVA étr. ${lib} cp`, -tvaZero, "", "CHF"]);
        }
        ecritures.push([date, cpte, lib, -brut, "", "CHF"]);
      } else {
        ecritures.push([date, "109999", `ATTENTE PayPal: ${nom} <${email}>`, brut,  "", "CHF"]);
        ecritures.push([date, cpte,     `ATTENTE PayPal: ${nom}`,            -brut, "", "CHF"]);
      }
    }
  }
  return ecritures;
}

// ─── SHOPIFY PAYOUTS ──────────────────────────────────────────────────────────
async function testShopify() {
  const headers = { "X-Shopify-Access-Token": env.SHOPIFY_PAYOUTS_TOKEN };
  const base = `https://${env.SHOPIFY_PAYOUTS_SHOP}/admin/api/2025-01`;
  const res = await fetch(`${base}/shopify_payments/payouts.json?date_min=${START}&date_max=${END}&limit=250`, { headers });
  const { payouts = [] } = await res.json();

  const ecritures = [];
  for (const payout of payouts) {
    const payoutDate = String(payout.date).slice(0, 10);
    const payoutAmount = Number(payout.amount);
    const txRes = await fetch(`${base}/shopify_payments/payouts/${payout.id}/transactions.json?limit=250`, { headers });
    const { transactions = [] } = await txRes.json();

    for (const tx of transactions) {
      const type = String(tx.type ?? "").toLowerCase();
      if (!["charge", "refund", "adjustment"].includes(type)) continue;
      const amount = Math.abs(Number(tx.amount ?? 0));
      const fee    = Math.abs(Number(tx.fee ?? 0));
      const date   = String(tx.processed_at ?? payoutDate).slice(0, 10);
      const orderId = tx.source_order_id ? `#${tx.source_order_id}` : `payout-${payout.id}`;
      const lib    = `Shopify ${orderId}`;
      const { ht, tva } = calcTva(amount);
      const tvaAcq = r2(amount * TAUX);

      if (type === "refund") {
        ecritures.push([date, COMPTES.PASSAGE_SHOPIFY, lib, -amount]);
        ecritures.push([date, COMPTES.VENTE_GEN, `${lib} (Acquis.)`, amount]);
        ecritures.push([date, COMPTES.TVA_ACQ, `TVA s/acquis. ${lib}`, -tvaAcq]);
        ecritures.push([date, COMPTES.TVA_ACQ, `TVA s/acquis. ${lib} (due)`, tvaAcq]);
      } else {
        ecritures.push([date, COMPTES.PASSAGE_SHOPIFY, lib, amount]);
        ecritures.push([date, COMPTES.VENTE_GEN, `${lib} (Acquis.)`, -amount]);
        ecritures.push([date, COMPTES.TVA_ACQ, `TVA s/acquis. ${lib}`, tvaAcq]);
        ecritures.push([date, COMPTES.TVA_ACQ, `TVA s/acquis. ${lib} (due)`, -tvaAcq]);
        if (fee) {
          ecritures.push([date, COMPTES.FRAIS, `Frais ${lib}`, fee]);
          ecritures.push([date, COMPTES.PASSAGE_SHOPIFY, `Frais ${lib}`, -fee]);
        }
      }
    }
    if (payoutAmount > 0) {
      ecritures.push([payoutDate, COMPTES.PASSAGE_POSTFINANCE, `Virement Shopify payout-${payout.id}`, payoutAmount]);
      ecritures.push([payoutDate, COMPTES.PASSAGE_SHOPIFY,     `Virement Shopify payout-${payout.id}`, -payoutAmount]);
    }
  }
  return ecritures;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function printCsv(label, ecritures) {
  const hasDevise = ecritures.some(r => r[5]);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${label} — ${ecritures.length} lignes`);
  console.log("=".repeat(60));
  if (hasDevise) {
    console.log("date,compte,libelle,montant_ref,montant_orig,devise");
  } else {
    console.log("date,compte,libelle,montant");
  }
  for (const r of ecritures) {
    const row = hasDevise
      ? [r[0], r[1], `"${r[2]}"`, r[3], r[4] ?? "", r[5] ?? ""]
      : [r[0], r[1], `"${r[2]}"`, r[3]];
    console.log(row.join(","));
  }
  // Contrôle de balance
  const total = ecritures.reduce((s, r) => s + (Number(r[3]) || 0), 0);
  console.log(`\n→ Balance totale (doit être ≈ 0) : ${r2(total)}`);
}

console.log(`Test WinEUR Hub — période ${START} → ${END}`);

const [sumup, paypal, shopify] = await Promise.all([testSumUp(), testPayPal(), testShopify()]);
printCsv("SUMUP", sumup);
printCsv("PAYPAL", paypal);
printCsv("SHOPIFY PAYOUTS", shopify);
