import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import JSZip from "jszip";
import { getMappings, lookupInMap } from "@/lib/wineur/mappings";
import type { UnknownEntry } from "@/lib/wineur/mappings";

// SubFmlyCd → paiement OPAE généré depuis GIT/WinEUR → ignorer
const OPAE_SUB = new Set(["DMCT", "XBCT", "ESCT", "BOOK"]);

// Shopify (Stripe) → ignorer car déjà enregistré dans la route Shopify (virement 100101/220006)
const CRDT_SHOPIFY_KEYWORD = "stripe payments";

// Autres providers de paiement → CRDT = virement provider → banque PostFinance
// Enregistrer : débit pfCompte (banque PostFinance) / crédit compte passage provider
const PROVIDER_PASSAGE: Record<string, string> = {
  "sumup payments":  "220004",  // SumUp passage
  "twint acquiring": "220003",  // Twint passage
  "paypal":          "100401",  // PayPal CHF
  "powerpay":        "220005",  // Powerpay passage
  "mf group":        "220005",  // Powerpay (raison sociale MF Group AG)
  "deindeal":        "199001",  // DeinDeal → compte d'attente ventes flash (détail non fourni)
  "qoqa":            "199001",  // Qoqa → compte d'attente ventes flash
  "realdeal":        "199001",  // Realdeals → compte d'attente ventes flash
};

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

// ── Dépôts cash des boutiques (versement sur propre compte via carte PostFinance) ──
// Chaque boutique dépose son liquide avec sa propre carte ; le n° de carte identifie la caisse.
const CAISSE_CARTE: Record<string, string> = {
  "8693": "100003", // Martigny
  "0718": "100004", // Carouge
  "0726": "100001", // Orbe (dépôt à Chavornay)
  "9283": "100006", // Fribourg
};

// La ligne est-elle un dépôt cash d'une boutique sur le compte PostFinance ?
function isDepotCaisse(addtl: string): boolean {
  const s = addtl.toUpperCase();
  return s.includes("VERSEMENT SUR PROPRE COMPTE") || s.includes("MOOD STORE Z");
}

// Caisse WinEUR correspondant au dépôt, ou null si la carte est inconnue
function caisseFromDeposit(addtl: string): string | null {
  const s = addtl.toUpperCase();
  // Zürich : dépôt boutique via filiale de la poste, sans carte
  if (s.includes("MOOD STORE Z")) return "100005";
  const card = addtl.match(/CARTE\s*NO\.?\s*X+(\d{4})/i)?.[1];
  if (!card) return null;
  // Carte …0456 : Zermatt si déposé à Zermatt, sinon événements/foire
  if (card === "0456") return /ZERMATT/i.test(addtl) ? "100007" : "100009";
  return CAISSE_CARTE[card] ?? null;
}

// ── Indemnités remboursant un salaire (assurances + caisse chômage) — pas une vente ──
// Détectées uniquement quand l'EXPÉDITEUR est l'organisme (jamais un nom de banque ou de ville).
function isIndemniteSalaire(debtorName: string, addtl: string): boolean {
  const s = `${debtorName} ${addtl}`.toUpperCase();
  if (s.includes("SWICA")) return true;                       // accident / maladie SWICA
  const isZurich = s.includes("ZUERICH") || s.includes("ZÜRICH") || s.includes("ZURICH");
  if (s.includes("VERSICHERUNG") && isZurich) return true;    // Zurich assurance (maladie)
  if (s.includes("CHOMAGE") || s.includes("CHÔMAGE")) return true; // caisse cantonale de chômage
  if (s.includes("CAISSE AVS") || s.includes("CAISSE DE COMPENSATION")) return true; // caisse AVS
  return false;
}

// lookupPostfinance est appelé avec le config chargé dynamiquement dans POST

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

function buildEcritures(entries: CamtEntry[], config: Record<string, string>): { ecritures: Ecriture[]; stats: Record<string, number>; unknowns: UnknownEntry[] } {
  const ecritures: Ecriture[] = [];
  const unknowns: UnknownEntry[] = [];
  const stats = { crdt: 0, crdt_skip: 0, opae: 0, carte: 0, dbit_other: 0, depot_caisse: 0, indemnite: 0 };

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

    // ── CRDT Shopify/Stripe → ignorer (virement déjà enregistré dans la route Shopify) ──
    if (direction === "CRDT" && addtlLc.includes(CRDT_SHOPIFY_KEYWORD)) {
      stats.crdt_skip++;
      continue;
    }

    // ── CRDT provider de paiement → virement passage provider vers banque PostFinance ──
    // ex: SumUp → 220004 se vide / 100101 reçoit l'argent
    if (direction === "CRDT") {
      const providerEntry = Object.entries(PROVIDER_PASSAGE).find(([k]) => addtlLc.includes(k));
      if (providerEntry) {
        stats.crdt++;
        const [, providerCompte] = providerEntry;
        const ref = (communication || debtorName || addtlInfo.replace(/^CRÉDIT DONNEUR D'ORDRE:\s*/i, "").slice(0, 50) || "Virement").replace(/,/g, "-");
        const lib = `Virement ${ref}`.slice(0, 80);
        ecritures.push({ date, compte: pfCompte,       libelle: lib, montant:  amount }); // banque PostFinance reçoit
        ecritures.push({ date, compte: providerCompte, libelle: lib, montant: -amount }); // compte passage provider se vide
        continue;
      }
    }

    // ── CRDT dépôt cash boutique (versement sur propre compte / MOOD STORE ZÜRICH) ──
    // Ce n'est PAS une vente : la banque monte, la caisse de la boutique baisse, sans TVA.
    if (direction === "CRDT" && isDepotCaisse(addtlInfo)) {
      stats.depot_caisse++;
      const caisse = caisseFromDeposit(addtlInfo);
      const ref = addtlInfo.replace(/\s+/g, " ").slice(0, 60).replace(/,/g, "-");
      const lib = `Versement caisse ${ref}`.slice(0, 80);
      if (!caisse) {
        unknowns.push({ key: ref.toLowerCase().slice(0, 80), label: ref.slice(0, 60), amount, date, source: "postfinance" });
      }
      const cpteCaisse = caisse ?? "109999";
      ecritures.push({ date, compte: pfCompte,   libelle: lib, montant:  amount }); // banque reçoit
      ecritures.push({ date, compte: cpteCaisse, libelle: lib, montant: -amount }); // caisse boutique baisse
      continue;
    }

    // ── CRDT indemnité de salaire (SWICA, Zurich assurance, caisse chômage) → 500050, sans TVA ──
    // Ce n'est PAS une vente : la banque monte, l'indemnité vient en déduction des charges de personnel.
    if (direction === "CRDT" && isIndemniteSalaire(debtorName, addtlInfo)) {
      stats.indemnite++;
      const src = debtorName || addtlInfo.replace(/^CRÉDIT\s*(DONNEUR D'ORDRE:)?\s*/i, "").slice(0, 60);
      const ref = src.replace(/\s+/g, " ").slice(0, 60).replace(/,/g, "-");
      const lib = `Indemnité ${ref}`.slice(0, 80);
      ecritures.push({ date, compte: pfCompte, libelle: lib, montant:  amount }); // banque reçoit
      ecritures.push({ date, compte: "500050", libelle: lib, montant: -amount }); // indemnités (déduction charges personnel)
      continue;
    }

    // ── CRDT : rentrée client sur compte PostFinance ─────────────────────────
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
    const cpteCharge = lookupInMap(haystack, config);
    if (!cpteCharge) {
      unknowns.push({ key: haystack.slice(0, 80), label: ref.slice(0, 60), amount, date, source: "postfinance" });
    }
    const cpte = cpteCharge ?? "109999";
    const tvaAcq = r2(amount * TAUX);

    if (isCH) {
      const { ht, tva } = calculTva(amount);
      ecritures.push({ date, compte: cpte,             libelle: `${lib} HT`,          montant:  ht  });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA CH ${lib}`,       montant:  tva });
    } else {
      ecritures.push({ date, compte: cpte,             libelle: lib,                            montant:  amount   });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA auto-liq. ${lib}`,        montant:  tvaAcq  });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA auto-liq. ${lib} (due)`,  montant: -tvaAcq  });
    }
    ecritures.push({ date, compte: pfCompte, libelle: lib, montant: -amount });
  }

  return { ecritures, stats, unknowns };
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

  const config = await getMappings("postfinance");
  const { ecritures, stats, unknowns } = buildEcritures(allEntries, config);

  return NextResponse.json({ ecritures, stats, unknowns, total: allEntries.length });
}
