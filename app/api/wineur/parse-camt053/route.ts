import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import comptesPostfinance from "@/lib/wineur/comptes_postfinance.json";
import JSZip from "jszip";

// SubFmlyCd → paiement OPAE généré depuis GIT/WinEUR → ignorer
const OPAE_SUB = new Set(["DMCT", "XBCT", "ESCT", "BOOK"]);

// Mots-clés dans AddtlNtryInf identifiant des CRDT déjà couverts par d'autres sources
const CRDT_SKIP_KEYWORDS = [
  "sumup payments",       // SumUp payouts
  "stripe payments",      // Shopify payouts (via Stripe)
  "twint acquiring",      // Twint payouts
  "paypal",               // PayPal payouts
  "powerpay",             // Powerpay payouts
];

const TAUX = 8.1 / 100;
function r2(n: number) { return Math.round(n * 100) / 100; }

function tagText(xml: string, tag: string): string {
  return xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`))?.[1]?.trim() ?? "";
}
function firstBlock(xml: string, tag: string): string {
  return xml.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`))?.[0] ?? "";
}

// Détermine le compte WinEUR PostFinance d'après le dernier chiffre de l'IBAN
function ibanToCompte(iban: string): string {
  const lastDigit = iban.trim().slice(-1);
  if (lastDigit === "5") return "100101";
  if (lastDigit === "9") return "100102";
  if (lastDigit === "7") return "100103";
  return "100101"; // fallback compte principal
}

function lookupPostfinance(haystack: string): string | null {
  const h = haystack.toLowerCase();
  const config = comptesPostfinance as Record<string, string>;
  for (const [k, v] of Object.entries(config)) {
    if (h.includes(k)) return v;
  }
  return null;
}

interface CamtEntry {
  date: string;
  amount: number;
  direction: "CRDT" | "DBIT";
  subFmlyCd: string;
  debtorName: string;
  creditorName: string;
  country: string;
  communication: string;
  addtlInfo: string;
  pfCompte: string; // compte PostFinance WinEUR selon IBAN du fichier
}

function parseEntries(xml: string, iban: string): CamtEntry[] {
  const pfCompte = ibanToCompte(iban);
  const entries: CamtEntry[] = [];
  const ntryBlocks = xml.match(/<Ntry>[\s\S]*?<\/Ntry>/g) ?? [];

  for (const ntry of ntryBlocks) {
    if (tagText(ntry, "Sts") !== "BOOK") continue;

    const direction  = tagText(ntry, "CdtDbtInd") as "CRDT" | "DBIT";
    const amount     = parseFloat(tagText(ntry, "Amt") || "0");
    const date       = tagText(ntry, "Dt");
    const bkTxCd     = firstBlock(ntry, "BkTxCd");
    const subFmlyCd  = tagText(bkTxCd, "SubFmlyCd");
    const txDtls     = firstBlock(ntry, "TxDtls");
    const rltdPties  = firstBlock(txDtls, "RltdPties");
    const dbtrBlock  = firstBlock(rltdPties, "Dbtr");
    const cdtrBlock  = firstBlock(rltdPties, "Cdtr");
    const debtorName  = tagText(dbtrBlock, "Nm");
    const creditorName= tagText(cdtrBlock, "Nm");
    const countryBlock = direction === "CRDT" ? dbtrBlock : cdtrBlock;
    const country    = tagText(firstBlock(countryBlock, "PstlAdr"), "Ctry").toUpperCase();
    const rmtInf     = firstBlock(txDtls, "RmtInf");
    const communication = tagText(rmtInf, "Ustrd")
      || tagText(rmtInf, "Ref")
      || tagText(firstBlock(rmtInf, "CdtrRefInf"), "Ref");
    const addtlInfo  = tagText(ntry, "AddtlNtryInf");

    entries.push({ date, amount, direction, subFmlyCd, debtorName, creditorName, country, communication, addtlInfo, pfCompte });
  }
  return entries;
}

function buildEcritures(entries: CamtEntry[]): { ecritures: Ecriture[]; stats: Record<string, number> } {
  const ecritures: Ecriture[] = [];
  const stats = { crdt: 0, crdt_skip: 0, opae: 0, carte: 0, dbit_other: 0 };

  for (const e of entries) {
    const { date, amount, direction, subFmlyCd, debtorName, creditorName, country, communication, addtlInfo, pfCompte } = e;
    const isCH    = country === "CH" || country === "";
    const addtlLc = addtlInfo.toLowerCase();

    // ── DBIT OPAE → ignorer ──────────────────────────────────────────────────
    const isOpaeGrouped = direction === "DBIT" && addtlLc.includes("ordre groupé opae");
    if ((direction === "DBIT" && OPAE_SUB.has(subFmlyCd)) || isOpaeGrouped) {
      stats.opae++;
      continue;
    }

    // ── CRDT depuis SumUp / Shopify / Twint / PayPal → ignorer (déjà dans d'autres sources) ──
    if (direction === "CRDT" && CRDT_SKIP_KEYWORDS.some(k => addtlLc.includes(k))) {
      stats.crdt_skip++;
      continue;
    }

    // ── CRDT : rentrée sur compte PostFinance ────────────────────────────────
    if (direction === "CRDT") {
      stats.crdt++;
      const addtlShort = addtlInfo.replace(/^CRÉDIT DONNEUR D'ORDRE:\s*/i, "").slice(0, 60);
      const ref = (communication || debtorName || addtlShort || "Rentrée PostFinance").replace(/,/g, "-");
      const lib = `PostFinance ${ref}`.slice(0, 80);

      if (isCH) {
        const { ht, tva } = calculTva(amount);
        ecritures.push({ date, compte: pfCompte,          libelle: lib,          montant:  amount });
        ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: `${lib} HT`,  montant: -ht    });
        ecritures.push({ date, compte: COMPTES.TVA_VENTE, libelle: `${lib} TVA`, montant: -tva   });
      } else {
        ecritures.push({ date, compte: pfCompte,          libelle: lib, montant:  amount });
        ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: lib, montant: -amount });
      }
      continue;
    }

    // ── DBIT ICDT/AUTT "CHARGE CPTE CARTE DE CREDIT" → recharge carte ───────
    // 220001 augmente (carte rechargée), pfCompte diminue (compte bancaire)
    if (subFmlyCd === "AUTT" && addtlLc.includes("charge cpte carte de credit")) {
      stats.carte++;
      const ref = addtlInfo.slice(0, 60).replace(/,/g, "-");
      const lib = `PostFinance: ${ref}`.slice(0, 80);
      ecritures.push({ date, compte: "220001", libelle: lib, montant:  amount }); // carte rechargée
      ecritures.push({ date, compte: pfCompte, libelle: lib, montant: -amount }); // compte bancaire débité
      continue;
    }

    // ── DBIT non-OPAE (frais, prélèvements SEPA, autres) ────────────────────
    stats.dbit_other++;
    const ref = (creditorName || addtlInfo.slice(0, 50) || "Débit PostFinance").replace(/,/g, "-");
    const lib = `PostFinance: ${ref}`.slice(0, 80);
    const haystack = `${creditorName} ${communication} ${addtlInfo}`.toLowerCase();
    const cpteCharge = lookupPostfinance(haystack) ?? "109999";
    const tvaAcq = r2(amount * TAUX);

    if (isCH) {
      const { ht, tva } = calculTva(amount);
      ecritures.push({ date, compte: cpteCharge,       libelle: `${lib} HT`,          montant:  ht  });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA CH ${lib}`,       montant:  tva });
    } else {
      ecritures.push({ date, compte: cpteCharge,       libelle: lib,                            montant:  amount   });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA auto-liq. ${lib}`,        montant:  tvaAcq  });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA auto-liq. ${lib} (due)`,  montant: -tvaAcq  });
    }
    ecritures.push({ date, compte: pfCompte, libelle: lib, montant: -amount });
  }

  return { ecritures, stats };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const allEntries: CamtEntry[] = [];

  if (file.name.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(buffer);
    for (const [name, zipEntry] of Object.entries(zip.files)) {
      if (!name.endsWith(".xml") || zipEntry.dir) continue;
      const xml  = await zipEntry.async("string");
      const iban = xml.match(/<IBAN>([^<]+)<\/IBAN>/)?.[1] ?? "";
      allEntries.push(...parseEntries(xml, iban));
    }
  } else {
    const xml  = buffer.toString("utf8");
    const iban = xml.match(/<IBAN>([^<]+)<\/IBAN>/)?.[1] ?? "";
    allEntries.push(...parseEntries(xml, iban));
  }

  const { ecritures, stats } = buildEcritures(allEntries);

  return NextResponse.json({ ecritures, stats, total: allEntries.length });
}
