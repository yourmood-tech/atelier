import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import { getMappings, lookupInMap } from "@/lib/wineur/mappings";
import type { UnknownEntry } from "@/lib/wineur/mappings";
import * as pdfParseModule from "pdf-parse";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default ?? pdfParseModule;

const TAUX = 8.1 / 100;
function r2(n: number) { return Math.round(n * 100) / 100; }

const FOREIGN_CODES = ["IRL", "USA", "DEU", "LUX", "GBR", "EST", "AUT", "FRA", "DNK", "FIN", "NLD", "BEL", "ITA", "ESP"];
const SKIP_KEYWORDS  = ["recharge", "paiement", "total", "report", "page ", "cours ", "¹", "²", "comptabi", "lisation", "titulaire", "compte de carte", "période", "date de la facture", "solde", "limit", "payable", "veuillez", "conseil"];

function normalizeMerchant(text: string): string {
  return text.replace(/'/g, "").replace(/\s+/g, " ")
    .replace(/\s*(CHF|EUR|USD|GBP)\s*[-+]?\d[\d\s.,]*$/i, "").trim().toLowerCase();
}

function isPaypalTopup(description: string): boolean {
  return description.toUpperCase().replace(/\s+/g, "").includes("PAYPAL*");
}

function isExt(description: string): boolean {
  return FOREIGN_CODES.some(c => description.toUpperCase().includes(c));
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

  // Charger les mappings fusionnés (statique + KV overrides)
  const config = await getMappings("postfinance");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { text } = await pdfParse(buffer);

  const ecritures: Ecriture[] = [];
  const unknowns: UnknownEntry[] = [];
  let imported = 0;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d{2}\.\d{2}\.\d{2})\s+(\d{2}\.\d{2}\.\d{2})\s+(.+)$/);
    if (!match) continue;

    const [, dateC, , reste] = match;
    if (SKIP_KEYWORDS.some(k => reste.toLowerCase().includes(k))) continue;

    const parts     = reste.split(/\s+/);
    const montantVal = cleanAmount(parts[parts.length - 1]);
    if (isNaN(montantVal) || montantVal <= 0) continue;

    const description = parts.slice(0, -1).join(" ").trim();
    const date        = parseDate(dateC);
    const lib         = `CC PF: ${normalizeMerchant(description).toUpperCase().slice(0, 35)}`;

    // PAYPAL * → transfert inter-comptes
    if (isPaypalTopup(description)) {
      const libPP = `Recharge PayPal CC PF: ${description.slice(0, 30)}`;
      ecritures.push({ date, compte: "100401", libelle: libPP, montant:  montantVal });
      ecritures.push({ date, compte: "220001", libelle: libPP, montant: -montantVal });
      imported++;
      continue;
    }

    const cpte = lookupInMap(normalizeMerchant(description), config);

    if (!cpte) {
      // Fournisseur inconnu → signaler pour résolution
      unknowns.push({
        key:    normalizeMerchant(description),
        label:  description.slice(0, 60),
        amount: montantVal,
        date,
        source: "postfinance",
      });
      // Enregistrer quand même avec 109999 en attendant
      const tvaAcq = r2(montantVal * TAUX);
      ecritures.push({ date, compte: "109999",         libelle: `ATTENTE ${lib}`, montant:  montantVal });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA auto-liq. ${lib}`, montant:  tvaAcq  });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ,  libelle: `TVA auto-liq. ${lib} (due)`, montant: -tvaAcq  });
      ecritures.push({ date, compte: "220001",         libelle: `ATTENTE ${lib}`, montant: -montantVal });
      imported++;
      continue;
    }

    const mode     = isExt(description) ? "EXT" : "CH";
    const { ht, tva } = calculTva(montantVal);
    const tvaAcq   = r2(montantVal * TAUX);

    if (mode === "CH") {
      ecritures.push({ date, compte: "220001",        libelle: lib,                           montant:  montantVal });
      ecritures.push({ date, compte: cpte,            libelle: `${lib} HT`,                  montant: -ht         });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `${lib} TVA`,                 montant: -tva        });
    } else {
      ecritures.push({ date, compte: "220001",        libelle: lib,                           montant:  montantVal });
      ecritures.push({ date, compte: cpte,            libelle: `${lib} (Acquis.)`,            montant: -montantVal });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA s/acquis. ${lib}`,       montant:  tvaAcq    });
      ecritures.push({ date, compte: COMPTES.TVA_ACQ, libelle: `TVA s/acquis. ${lib} (due)`, montant: -tvaAcq    });
    }
    imported++;
  }

  return NextResponse.json({ ecritures, imported, unknowns });
}
