import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import comptesPostfinance from "@/lib/wineur/comptes_postfinance.json";
import JSZip from "jszip";

// SubFmlyCd qui indiquent un paiement OPAE (généré depuis GIT/WinEUR)
const OPAE_SUB = new Set(["DMCT", "XBCT", "ESCT", "BOOK"]);

const TAUX = 8.1 / 100;
function r2(n: number) { return Math.round(n * 100) / 100; }

function tagText(xml: string, tag: string): string {
  return xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`))?.[1]?.trim() ?? "";
}

function firstBlock(xml: string, tag: string): string {
  return xml.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`))?.[0] ?? "";
}

interface CamtEntry {
  date: string;
  amount: number;
  currency: string;
  direction: "CRDT" | "DBIT";
  subFmlyCd: string;
  fmlyCd: string;
  domainCd: string;
  debtorName: string;
  creditorName: string;
  country: string;         // pays du donneur d'ordre (CRDT) ou bénéficiaire (DBIT)
  communication: string;   // RmtInf/Ustrd
  addtlInfo: string;       // AddtlNtryInf
  iban: string;            // IBAN compte PostFinance
}

function parseEntries(xml: string, iban: string): CamtEntry[] {
  const entries: CamtEntry[] = [];
  const ntryBlocks = xml.match(/<Ntry>[\s\S]*?<\/Ntry>/g) ?? [];

  for (const ntry of ntryBlocks) {
    if (tagText(ntry, "Sts") !== "BOOK") continue;

    const direction = tagText(ntry, "CdtDbtInd") as "CRDT" | "DBIT";
    const amount    = parseFloat(tagText(ntry, "Amt") || "0");
    const currency  = ntry.match(/<Amt[^>]*Ccy="([^"]+)"/)?.[1] ?? "CHF";
    const date      = tagText(ntry, "Dt");

    const bkTxCd   = firstBlock(ntry, "BkTxCd");
    const domainCd  = tagText(bkTxCd, "Cd");
    const fmlyCd    = bkTxCd.match(/<Fmly><Cd>([^<]+)<\/Cd>/)?.[1] ?? "";
    const subFmlyCd = tagText(bkTxCd, "SubFmlyCd");

    const txDtls    = firstBlock(ntry, "TxDtls");
    const rltdPties = firstBlock(txDtls, "RltdPties");

    // Nom et pays du donneur (CRDT) ou bénéficiaire (DBIT)
    const dbtrBlock = firstBlock(rltdPties, "Dbtr");
    const cdtrBlock = firstBlock(rltdPties, "Cdtr");
    const debtorName   = tagText(dbtrBlock, "Nm");
    const creditorName = tagText(cdtrBlock, "Nm");

    const countryBlock = direction === "CRDT" ? dbtrBlock : cdtrBlock;
    const country = tagText(firstBlock(countryBlock, "PstlAdr"), "Ctry").toUpperCase();

    // Communication libre
    const rmtInf     = firstBlock(txDtls, "RmtInf");
    const communication = tagText(rmtInf, "Ustrd")
      || tagText(rmtInf, "Ref")
      || tagText(firstBlock(rmtInf, "CdtrRefInf"), "Ref");

    const addtlInfo = tagText(ntry, "AddtlNtryInf");

    entries.push({ date, amount, currency, direction, subFmlyCd, fmlyCd, domainCd, debtorName, creditorName, country, communication, addtlInfo, iban });
  }
  return entries;
}

function lookupPostfinance(text: string): string | null {
  const haystack = text.toLowerCase().replace(/\s+/g, " ");
  const config = comptesPostfinance as Record<string, string>;
  for (const [k, v] of Object.entries(config)) {
    if (haystack.includes(k)) return v;
  }
  return null;
}

function buildEcritures(entries: CamtEntry[]): { ecritures: Ecriture[]; skipped: number; processed: number } {
  const ecritures: Ecriture[] = [];
  let skipped = 0;
  let processed = 0;

  for (const e of entries) {
    const { date, amount, direction, subFmlyCd, debtorName, creditorName, country, communication, addtlInfo } = e;
    const isCH = country === "CH" || country === "";

    // DBIT OPAE → ignorer (paiements générés depuis GIT/WinEUR)
    // Cas 1 : SubFmlyCd standard OPAE (DMCT, XBCT, ESCT, BOOK)
    // Cas 2 : ICDT/AUTT avec mention "ORDRE GROUPÉ OPAE" dans AddtlNtryInf
    const isOpaeGrouped = direction === "DBIT" && addtlInfo.includes("ORDRE GROUPÉ OPAE");
    if ((direction === "DBIT" && OPAE_SUB.has(subFmlyCd)) || isOpaeGrouped) {
      skipped++;
      continue;
    }

    processed++;

    // ── CRDT : entrée d'argent sur PostFinance ──────────────────────────────
    if (direction === "CRDT") {
      // Fallback : comm → nom débiteur → extrait AddtlNtryInf (sans le préfixe standard)
      const addtlShort = addtlInfo.replace(/^CRÉDIT DONNEUR D'ORDRE:\s*/i, "").slice(0, 60);
      const ref  = communication || debtorName || addtlShort || "Rentrée PostFinance";
      const lib  = `PostFinance ${ref}`.replace(/,/g, "-").slice(0, 80);

      if (isCH) {
        const { ht, tva } = calculTva(amount);
        ecritures.push({ date, compte: COMPTES.PASSAGE_POSTFINANCE, libelle: lib, montant: amount });
        ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: `${lib} HT`, montant: -ht });
        ecritures.push({ date, compte: COMPTES.TVA_VENTE, libelle: `${lib} TVA`, montant: -tva });
      } else {
        // Client étranger → pas de TVA suisse
        ecritures.push({ date, compte: COMPTES.PASSAGE_POSTFINANCE, libelle: lib, montant: amount });
        ecritures.push({ date, compte: COMPTES.VENTE_GEN, libelle: lib, montant: -amount });
      }
      continue;
    }

    // ── DBIT non-OPAE : charge, prélèvement, carte ─────────────────────────
    const ref  = creditorName || addtlInfo.slice(0, 50) || "Débit PostFinance";
    const lib  = `PostFinance: ${ref}`.replace(/,/g, "-").slice(0, 80);
    const haystack = `${creditorName} ${communication} ${addtlInfo}`.toLowerCase();
    const cpteCharge = lookupPostfinance(haystack) ?? "109999";
    const tvaAcq = r2(amount * TAUX);

    if (isCH) {
      const { ht, tva } = calculTva(amount);
      ecritures.push({ date, compte: cpteCharge, libelle: `${lib} HT`, montant: ht });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA CH ${lib}`, montant: tva });
    } else {
      // Fournisseur étranger → TVA auto-liquidée
      ecritures.push({ date, compte: cpteCharge, libelle: lib, montant: amount });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA auto-liq. ${lib}`, montant: tvaAcq });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA auto-liq. ${lib} (due)`, montant: -tvaAcq });
    }
    ecritures.push({ date, compte: COMPTES.PASSAGE_POSTFINANCE, libelle: lib, montant: -amount });
  }

  return { ecritures, skipped, processed };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const allEntries: CamtEntry[] = [];

  const isZip = file.name.endsWith(".zip");

  if (isZip) {
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

  const { ecritures, skipped, processed } = buildEcritures(allEntries);

  return NextResponse.json({
    ecritures,
    total: allEntries.length,
    processed,
    skipped_opae: skipped,
  });
}
