import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import comptesPostfinance from "@/lib/wineur/comptes_postfinance.json";
import * as pdfParseModule from "pdf-parse";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default ?? pdfParseModule;

const TAUX = 8.1 / 100;
function r2(n: number) { return Math.round(n * 100) / 100; }

// Codes pays étrangers → mode EXT (TVA auto-liquidée)
const FOREIGN_CODES = ["IRL", "USA", "DEU", "LUX", "GBR", "EST", "AUT", "FRA", "DNK", "FIN", "NLD", "BEL", "ITA", "ESP"];

// Mots-clés qui indiquent une ligne à ignorer (même si deux dates correspondent)
const SKIP_KEYWORDS = ["recharge", "paiement", "total", "report", "page ", "cours ", "¹", "²", "comptabi", "lisation", "titulaire", "compte de carte", "période", "date de la facture", "solde", "limit", "payable", "veuillez", "conseil"];

function normalizeMerchant(text: string): string {
  return text
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*(CHF|EUR|USD|GBP)\s*[-+]?\d[\d\s.,]*$/i, "")
    .trim()
    .toLowerCase();
}

function lookupAccount(merchant: string): string | null {
  const key = normalizeMerchant(merchant);
  const config = comptesPostfinance as Record<string, string>;

  // Correspondance exacte
  if (config[key]) return config[key];

  // Correspondance partielle (plus longue clé commune en premier)
  const matches: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(config)) {
    const kn = normalizeMerchant(k);
    if (!kn) continue;
    if (key.includes(kn) || kn.includes(key.split(" ")[0])) {
      matches.push([kn, v]);
    }
  }
  if (matches.length > 0) {
    matches.sort((a, b) => b[0].length - a[0].length);
    return matches[0][1];
  }
  return null;
}

function isExt(description: string): boolean {
  const up = description.toUpperCase();
  return FOREIGN_CODES.some(c => up.includes(c));
}

function parseDate(ddmmyy: string): string {
  const [d, m, y] = ddmmyy.split(".");
  return `20${y}-${m}-${d}`;
}

function cleanAmount(s: string): number {
  return parseFloat(s.replace(/'/g, "").replace(/,/g, ".")) || 0;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { text } = await pdfParse(buffer);
  const lines = text.split("\n");

  const ecritures: Ecriture[] = [];
  let imported = 0;
  let skipped = 0;
  const unknownMerchants: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // La ligne doit commencer par DEUX dates (Comptabilisation + Achat)
    const match = trimmed.match(/^(\d{2}\.\d{2}\.\d{2})\s+(\d{2}\.\d{2}\.\d{2})\s+(.+)$/);
    if (!match) continue;

    const [, dateC, , reste] = match;

    // Ignorer les lignes de skip
    const resteLc = reste.toLowerCase();
    if (SKIP_KEYWORDS.some(k => resteLc.includes(k))) {
      skipped++;
      continue;
    }

    // Extraire montant = dernier token (séparé par whitespace)
    const parts = reste.split(/\s+/);
    const montantStr = parts[parts.length - 1];
    const montantVal = cleanAmount(montantStr);

    if (isNaN(montantVal) || montantVal <= 0) {
      // Négatif = crédit (remboursement), ignorer
      skipped++;
      continue;
    }

    const description = parts.slice(0, -1).join(" ").trim();
    const date = parseDate(dateC);
    const lib = `CC PF: ${normalizeMerchant(description).toUpperCase().slice(0, 35)}`;

    const cpte = lookupAccount(description);
    if (!cpte) {
      unknownMerchants.push(description.slice(0, 60));
      // Compte attente pour les fournisseurs inconnus
      const tvaAcq = r2(montantVal * TAUX);
      ecritures.push({ date, compte: "109999", libelle: `ATTENTE CC PF: ${description.slice(0, 50)}`, montant: montantVal });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA auto-liq. ${lib}`, montant: tvaAcq });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA auto-liq. ${lib} (due)`, montant: -tvaAcq });
      ecritures.push({ date, compte: "220001", libelle: `ATTENTE CC PF: ${description.slice(0, 50)}`, montant: -montantVal });
      imported++;
      continue;
    }

    const mode = isExt(description) ? "EXT" : "CH";

    if (mode === "CH") {
      const { ht, tva } = calculTva(montantVal);
      ecritures.push({ date, compte: "220001",         libelle: lib,          montant:  montantVal });
      ecritures.push({ date, compte: cpte,             libelle: `${lib} HT`,  montant: -ht         });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `${lib} TVA`, montant: -tva        });
    } else {
      const tvaAcq = r2(montantVal * TAUX);
      ecritures.push({ date, compte: "220001",         libelle: lib,                            montant:  montantVal });
      ecritures.push({ date, compte: cpte,             libelle: `${lib} (Acquis.)`,             montant: -montantVal });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA s/acquis. ${lib}`,        montant:  tvaAcq    });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA s/acquis. ${lib} (due)`,  montant: -tvaAcq    });
    }

    imported++;
  }

  return NextResponse.json({
    ecritures,
    imported,
    skipped,
    unknown_merchants: [...new Set(unknownMerchants)],
  });
}
