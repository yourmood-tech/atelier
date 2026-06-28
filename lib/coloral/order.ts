import ExcelJS from "exceljs";
import { COLORAL_TEMPLATE_B64 } from "./template-b64";

// ─── Mapping type de SKU Coloral → feuille du gabarit fournisseur ────────────────
// Confirmé avec Philippe (par les minimums par couleur) :
//   ALU 35 → 7.1mm · 23ALU 40 → 4.8mm · MEDALU 45 → 2,4mm · MINIALU 45 → 1.22mm
// (attention : "anneaux 7.1 mm " a un espace final dans le gabarit)
export const COLORAL_TYPE_TO_SHEET: Record<string, string> = {
  ALU: "anneaux 7.1 mm ",
  "23ALU": "anneaux 4.8mm",
  MEDALU: "mediums 2,4mm",
  MINIALU: "anneaux 1.22mm",
};

const SIZES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];

export type ColoralItem = { sku: string; qty: number };
export type ColoralUnmatched = { sku: string; qty: number; reason: string };

// Normalise une couleur pour la comparaison : minuscules, sans accents, sans code
// Pantone (938C, 2757C…), sans contenu entre parenthèses, sans chiffres ni ponctuation.
function normColor(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/p?\d{2,4}\s*c\b/gi, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTotalish(v: unknown): boolean {
  const n = normColor(v);
  return n.startsWith("total") || n.startsWith("usiner");
}

function looksLikeColor(v: unknown): boolean {
  if (typeof v !== "string") return false;
  if (v.includes("=") || v.includes("*")) return false;
  if (/^\s*\d/.test(v)) return false;
  if (isTotalish(v)) return false;
  return /[a-zA-Z]/.test(v);
}

type ColorColumn = { name: string; cells: Map<number, { r: number; c: number }> };

// Repère automatiquement les grilles couleur × taille d'une feuille (gère les blocs
// multiples et les colonnes "total"). Renvoie une map couleur-normalisée → colonne.
function scanSheet(ws: ExcelJS.Worksheet): Map<string, ColorColumn> {
  const colors = new Map<string, ColorColumn>();
  let active: Map<number, string> | null = null; // colIndex → couleur-normalisée du bloc courant

  ws.eachRow({ includeEmpty: false }, (row, r) => {
    const a = row.getCell(1).value;
    const aNum =
      typeof a === "number"
        ? a
        : typeof a === "string" && /^\d+$/.test(a.trim())
        ? parseInt(a.trim(), 10)
        : null;
    const aEmpty = a === null || a === undefined || String(a).trim() === "";

    // Ligne d'en-tête : colonne A vide + au moins 2 noms de couleur
    const colorCells: [number, string][] = [];
    row.eachCell({ includeEmpty: false }, (cell, c) => {
      if (c > 1 && looksLikeColor(cell.value)) colorCells.push([c, String(cell.value)]);
    });
    if (aEmpty && colorCells.length >= 2) {
      active = new Map();
      for (const [c, name] of colorCells) {
        const k = normColor(name);
        if (!colors.has(k)) colors.set(k, { name, cells: new Map() });
        active.set(c, k);
      }
      return;
    }

    // Ligne de taille : on relie chaque colonne couleur active à sa cellule
    if (active && aNum != null && SIZES.includes(aNum)) {
      for (const [c, k] of active) colors.get(k)!.cells.set(aNum, { r, c });
    }
  });

  return colors;
}

function parseSku(sku: string): { type: string; size: number; color: string } | null {
  const parts = (sku ?? "").trim().toUpperCase().split("-");
  if (parts[0] !== "MTRL" || parts.length < 4) return null;
  const size = parseInt(parts[2], 10);
  if (Number.isNaN(size)) return null;
  return { type: parts[1], size, color: parts.slice(3).join("-") };
}

// Construit le classeur de commande Coloral à partir des lignes de réassort.
// Repart du gabarit (feuilles, couleurs, prix, minimums, formules de total inchangés),
// efface les anciennes quantités et remplit les cases. Renvoie le fichier + les lignes
// non placées (type/couleur/taille introuvable) pour qu'aucune ne soit perdue en silence.
export async function buildColoralOrder(
  items: ColoralItem[]
): Promise<{ buffer: Buffer; unmatched: ColoralUnmatched[]; filledLines: number; totalQty: number }> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(Buffer.from(COLORAL_TEMPLATE_B64, "base64") as any);

  // Scanne chaque feuille gérée
  const scans = new Map<string, Map<string, ColorColumn>>();
  for (const [type, sheet] of Object.entries(COLORAL_TYPE_TO_SHEET)) {
    const ws = wb.getWorksheet(sheet);
    if (ws) scans.set(type, scanSheet(ws));
  }

  // Efface toutes les anciennes quantités (cases couleur uniquement, jamais les totaux)
  for (const [type, sheet] of Object.entries(COLORAL_TYPE_TO_SHEET)) {
    const ws = wb.getWorksheet(sheet);
    const sc = scans.get(type);
    if (!ws || !sc) continue;
    for (const col of sc.values()) {
      for (const { r, c } of col.cells.values()) ws.getCell(r, c).value = null;
    }
  }

  // Remplit
  const unmatched: ColoralUnmatched[] = [];
  let filledLines = 0;
  let totalQty = 0;
  for (const it of items) {
    const qty = Math.round(it.qty);
    if (!qty || qty <= 0) continue;
    const p = parseSku(it.sku);
    if (!p) {
      unmatched.push({ sku: it.sku, qty, reason: "référence illisible" });
      continue;
    }
    const sheet = COLORAL_TYPE_TO_SHEET[p.type];
    const sc = scans.get(p.type);
    if (!sheet || !sc) {
      unmatched.push({ sku: it.sku, qty, reason: `type ${p.type} hors Coloral` });
      continue;
    }
    const col = sc.get(normColor(p.color));
    if (!col) {
      unmatched.push({ sku: it.sku, qty, reason: `couleur "${p.color}" absente de la feuille ${sheet}` });
      continue;
    }
    const cell = col.cells.get(p.size);
    if (!cell) {
      unmatched.push({ sku: it.sku, qty, reason: `taille ${p.size} absente pour ${p.color}` });
      continue;
    }
    wb.getWorksheet(sheet)!.getCell(cell.r, cell.c).value = qty;
    filledLines++;
    totalQty += qty;
  }

  const ab = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(ab), unmatched, filledLines, totalQty };
}
