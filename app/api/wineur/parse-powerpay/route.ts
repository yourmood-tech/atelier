import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";
import * as pdfParseModule from "pdf-parse";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default ?? pdfParseModule;

const MOIS: Record<string, string> = {
  janvier: "01", février: "02", fevrier: "02", mars: "03",
  avril: "04", mai: "05", juin: "06", juillet: "07",
  août: "08", aout: "08", septembre: "09", octobre: "10",
  novembre: "11", décembre: "12", decembre: "12",
};

function cleanAmount(raw: string): number {
  let s = raw.replace(/CHF/g, "").replace(/'/g, "").replace(/\s/g, "").trim();
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(".") > s.lastIndexOf(",")
      ? s.replace(/,/g, "")
      : s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  return parseFloat(s) || 0;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const pdf = await pdfParse(buffer);
  const text = pdf.text;

  // Date : "St. Gallen, {d} {mois} {yyyy}"
  const mDate = text.match(/St\.\s*Gallen,\s*(\d{1,2})\s+([A-Za-zéèêëàâäîïôöùûüç]+)\s+(\d{4})/i);
  if (!mDate) return NextResponse.json({ error: "Date Powerpay introuvable dans le PDF" }, { status: 400 });
  const moisNum = MOIS[mDate[2].toLowerCase()];
  if (!moisNum) return NextResponse.json({ error: `Mois inconnu : ${mDate[2]}` }, { status: 400 });
  const date = `${mDate[3]}-${moisNum}-${mDate[1].padStart(2, "0")}`;

  // Période label
  const mPeriode = text.match(/Décompte\s+.+?\s+semaine\s+([0-9]{2}\/[0-9]{2})/i);
  const periode = mPeriode ? `semaine ${mPeriode[1]}` : "décompte";

  // Montants
  const mCredit = text.match(/Note de crédit déduction faite de la commission en CHF\s*([\d'\s.,-]+)/i);
  const mComm   = text.match(/Commission CHF\s*([-]?[\d'\s.,-]+)/i);
  if (!mCredit) return NextResponse.json({ error: "Montant 'Note de crédit' introuvable" }, { status: 400 });
  if (!mComm)   return NextResponse.json({ error: "Montant 'Commission CHF' introuvable" }, { status: 400 });

  const netCredit  = cleanAmount(mCredit[1]);
  const commission = Math.abs(cleanAmount(mComm[1]));
  const totalVentes = Math.round((netCredit + commission) * 100) / 100;

  const { ht, tva } = calculTva(totalVentes);
  const lib = `Powerpay ${periode}`;

  const ecritures: Ecriture[] = [
    { date, compte: COMPTES.PASSAGE_POWERPAY, libelle: lib, montant: totalVentes },
    { date, compte: COMPTES.VENTE_GEN, libelle: `${lib} HT`, montant: -ht },
    { date, compte: COMPTES.TVA_VENTE, libelle: `${lib} TVA`, montant: -tva },
  ];

  if (commission !== 0) {
    ecritures.push({ date, compte: COMPTES.FRAIS, libelle: `Commission ${lib}`, montant: commission });
    ecritures.push({ date, compte: COMPTES.PASSAGE_POWERPAY, libelle: `Commission ${lib}`, montant: -commission });
  }

  return NextResponse.json({ ecritures, date, periode, netCredit, commission, totalVentes });
}
