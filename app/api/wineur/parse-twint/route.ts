import { NextRequest, NextResponse } from "next/server";
import { COMPTES, calculTva } from "@/lib/wineur/accounting";
import type { Ecriture } from "@/lib/wineur/accounting";

const TWINT_TERMINAUX: Record<string, { lieu: string; compte: string }> = {
  "Mood Collection SA":                    { lieu: "Online",      compte: "320001" },
  "bca657cb-c73b-44a6-a152-0bbc93cf9c86": { lieu: "Orbe",        compte: "320002" },
  "15f05e85-0dfe-4096-a15f-283b457e95f7": { lieu: "Orbe",        compte: "320002" },
  "20e7408f-a7a4-4f93-bc47-f424c8b3bf8f": { lieu: "Martigny",    compte: "320003" },
  "cb69f9d3-13f3-4f12-9d6c-a6be41b17ee4": { lieu: "Carouge",     compte: "320004" },
  "2b3ecaf1-52c4-4c2a-a3d0-4ba11a27f150": { lieu: "Zurich",      compte: "320005" },
  "255e29d7-112b-4a7c-beaf-285b1a2007ff": { lieu: "Fribourg",    compte: "320007" },
  "d79cd35a-4967-4fd4-875e-97bfb87f0fdc": { lieu: "Zermatt",     compte: "320008" },
  "66c78452-6021-4119-8e09-609b3fb926ac": { lieu: "Stand-foire", compte: "320009" },
  "moodmarketplacemyshopifycom":           { lieu: "Online",      compte: "320001" },
};

function cleanNum(v: string): number {
  const s = v.replace(/'/g, "").replace(/,/g, ".").trim();
  return parseFloat(s) || 0;
}

function formatDate(raw: string): string {
  // DD.MM.YYYY → YYYY-MM-DD
  const m = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return raw.slice(0, 10);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const text = await file.text();
  const lines = text.split(/\r?\n/);

  // Trouver la ligne d'en-tête (contient "Statut")
  let headerIdx = -1;
  for (let i = 10; i < 20 && i < lines.length; i++) {
    if (lines[i].includes("Statut")) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return NextResponse.json({ error: "En-tête Twint introuvable (colonne Statut)" }, { status: 400 });

  const headers = lines[headerIdx].split(";").map((h) => h.trim().replace(/^"|"$/g, ""));
  const col = (row: string[], name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? (row[idx] ?? "").trim().replace(/^"|"$/g, "") : "";
  };

  const ecritures: Ecriture[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = line.split(";");

    const statut = col(row, "Statut").toLowerCase();
    const type   = col(row, "Type").toLowerCase();
    if (statut !== "facturé") { skipped++; continue; }
    if (!["paiement", "remboursement"].includes(type)) { skipped++; continue; }

    const tid    = col(row, "ID de terminal TWINT") || col(row, "Référence de la transaction commerçant");
    const info   = TWINT_TERMINAUX[tid];
    if (!info) { skipped++; continue; }

    const montant = cleanNum(col(row, "Montant de la transaction (CHF)"));
    const frais   = cleanNum(col(row, "Coûts de transaction (CHF)"));
    const date    = formatDate(col(row, "Date"));
    const { ht, tva } = calculTva(Math.abs(montant) + (type === "paiement" ? frais : 0));

    if (type === "paiement") {
      const vBrut = Math.round((montant + frais) * 100) / 100;
      const lib   = `Vente Twint ${info.lieu}`;
      ecritures.push({ date, compte: COMPTES.PASSAGE_TWINT, libelle: lib, montant: vBrut });
      ecritures.push({ date, compte: info.compte, libelle: `${lib} HT`, montant: -ht });
      ecritures.push({ date, compte: COMPTES.TVA_VENTE, libelle: `${lib} TVA`, montant: -tva });
      if (frais !== 0) {
        ecritures.push({ date, compte: COMPTES.FRAIS, libelle: `Frais ${lib}`, montant: Math.abs(frais) });
        ecritures.push({ date, compte: COMPTES.PASSAGE_TWINT, libelle: `Frais ${lib}`, montant: -Math.abs(frais) });
      }
    } else {
      const vBrut = Math.abs(montant);
      const lib   = `Remboursement Twint ${info.lieu}`;
      ecritures.push({ date, compte: info.compte, libelle: `${lib} HT`, montant: ht });
      ecritures.push({ date, compte: COMPTES.TVA_VENTE, libelle: `${lib} TVA`, montant: tva });
      ecritures.push({ date, compte: COMPTES.PASSAGE_TWINT, libelle: lib, montant: -vBrut });
      if (frais !== 0) {
        ecritures.push({ date, compte: COMPTES.FRAIS, libelle: `Frais ${lib}`, montant: -Math.abs(frais) });
        ecritures.push({ date, compte: COMPTES.PASSAGE_TWINT, libelle: `Frais ${lib}`, montant: Math.abs(frais) });
      }
    }
    imported++;
  }

  return NextResponse.json({ ecritures, imported, skipped });
}
