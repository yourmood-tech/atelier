// Scanne le gabarit Coloral embarqué (lib/coloral/template-b64.ts) et imprime, par
// type d'anneau, les couleurs présentes (normalisées, graphies unifiées) — à recopier
// dans COLORAL_FILE_COLORS de lib/coloral/colors.ts si le gabarit fournisseur change.
//
//   node scripts/scan-coloral-colors.mjs
//
// Aucune dépendance : un .xlsx est un zip, on lit directement sharedStrings + feuilles.
// La détection des couleurs reproduit scanSheet() de lib/coloral/order.ts :
// une ligne d'en-tête = colonne A vide + au moins 2 cellules "couleur". Une feuille
// peut contenir PLUSIEURS blocs d'en-tête (fichier exporté depuis Numbers).

import fs from "fs";
import zlib from "zlib";

// — doit rester aligné avec lib/coloral/colors.ts —
function normColor(s) {
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
function canonFileColor(n) {
  if (n === "lila" || n === "lila cashmer" || n === "lila caschmere") return "lila cashmere";
  if (n === "jaune") return "jaune chaud";
  return n;
}
// — doit rester aligné avec looksLikeColor() de order.ts —
function looksLikeColor(v) {
  if (typeof v !== "string") return false;
  if (v.includes("=") || v.includes("*")) return false;
  if (/^\s*\d/.test(v)) return false;
  const n = normColor(v);
  if (n.startsWith("total") || n.startsWith("usiner")) return false;
  return /[a-zA-Z]/.test(v);
}
// type Katana → feuille du gabarit (aligné avec COLORAL_TYPE_TO_SHEET de order.ts)
const TYPE_TO_SHEET = {
  ALU: "anneaux 7.1 mm ",
  "23ALU": "anneaux 4.8mm",
  MEDALU: "mediums 2,4mm",
  MINIALU: "anneaux 1.22mm",
};

function readZip(b) {
  const files = {};
  let i = 0;
  while (i < b.length - 4) {
    if (b.readUInt32LE(i) === 0x04034b50) {
      const method = b.readUInt16LE(i + 8);
      const csize = b.readUInt32LE(i + 18);
      const nlen = b.readUInt16LE(i + 26);
      const elen = b.readUInt16LE(i + 28);
      const name = b.toString("utf8", i + 30, i + 30 + nlen);
      const dstart = i + 30 + nlen + elen;
      const cdata = b.slice(dstart, dstart + csize);
      let data;
      try { data = method === 8 ? zlib.inflateRawSync(cdata) : cdata; } catch { data = Buffer.alloc(0); }
      files[name] = data;
      i = dstart + csize;
    } else i++;
  }
  return files;
}

function colToIndex(ref) {
  // "B12" -> 2 (1-based, comme ExcelJS)
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

const src = fs.readFileSync(new URL("../lib/coloral/template-b64.ts", import.meta.url), "utf8");
const m = src.match(/COLORAL_TEMPLATE_B64\s*=\s*([`"'])([\s\S]*?)\1/);
const b64 = m[2].replace(/\s+/g, "");
const f = readZip(Buffer.from(b64, "base64"));

// IMPORTANT : parser par <si> (une chaîne = un <si>, plusieurs <t> = morceaux à concaténer),
// sinon les indices référencés par les cellules sont décalés.
const ss = f["xl/sharedStrings.xml"].toString("utf8");
const strs = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join("").replace(/&amp;/g, "&")
);

const wbx = f["xl/workbook.xml"].toString("utf8");
const sheets = [...wbx.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((x) => ({ name: x[1], rid: x[2] }));
const relMap = {};
[...f["xl/_rels/workbook.xml.rels"].toString("utf8").matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)]
  .forEach((x) => (relMap[x[1]] = x[2]));

for (const [type, sheetName] of Object.entries(TYPE_TO_SHEET)) {
  const s = sheets.find((x) => x.name === sheetName);
  if (!s) { console.log(`// ${type}: feuille "${sheetName}" introuvable`); continue; }
  const xml = (f["xl/" + relMap[s.rid].replace(/^\//, "")] || Buffer.alloc(0)).toString("utf8");
  const set = new Set();
  for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [...rm[1].matchAll(/<c[^>]*r="([A-Z]+\d+)"([^>]*)>(?:<v>([\s\S]*?)<\/v>)?/g)]
      .map(([, ref, attrs, v]) => ({ col: colToIndex(ref), val: v === undefined ? "" : (/t="s"/.test(attrs) ? strs[+v] : v) }));
    const a = cells.find((c) => c.col === 1);
    const aEmpty = !a || String(a.val ?? "").trim() === "";
    const colorCells = cells.filter((c) => c.col > 1 && looksLikeColor(c.val));
    // ligne d'en-tête seulement (comme scanSheet) : colonne A vide + ≥2 couleurs
    if (aEmpty && colorCells.length >= 2) {
      for (const c of colorCells) {
        const k = canonFileColor(normColor(c.val));
        if (k) set.add(k);
      }
    }
  }
  const list = [...set].sort();
  console.log(`  ${JSON.stringify(type)}: new Set([\n    ${list.map((c) => JSON.stringify(c)).join(", ")},\n  ]),`);
}
