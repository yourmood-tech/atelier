// Arrivage marchandise Icelea — cœur : parse de la facture PDF + matching aux PO ouverts.
// Le parse tourne via pdfjs (même chemin que l'outil prix Icelea, compatible Vercel).
// Validé sur INV0015 : 492/492 pièces décomposées (398 MD-RI + 87 sans réf + 7 frais).

export interface ParsedItem {
  ref: string;              // libellé complet reconstitué (réf + wrap)
  code: string | null;      // code normalisé MD-RI-<n> sans zéro-padding, null si ligne sans réf
  qty: number;              // "N Pcs." de la facture
  sizes: Record<string, number>; // répartition par taille EUROPE (54=2, 60=1)
  unitPrice: number | null;
  lineTotal: number | null;
}

// Une ligne du plan de réception : un couple (produit, taille) rattaché à ses PO ouverts.
export interface ReceptionRow {
  code: string | null;
  label: string;            // libellé lisible
  size: string | null;
  invoiceQty: number;       // quantité facturée pour ce (produit, taille)
  sku: string | null;       // SKU Katana résolu
  variantId: number | null;
  barcode: string | null;   // code-barres Katana (Code128)
  pos: { po: string; line: number; rowId: number; qty: number; created: string }[]; // PO ouverts FIFO
  openQty: number;          // total encore à recevoir dans les PO ouverts
  match: "code" | "nom" | "approx" | "manuel" | "corrige"; // corrige = correction mémorisée réappliquée
}

export interface VariantIndex {
  vmap: Record<string, { sku: string; size: string | null; barcode: string | null }>;
  openRows: { vid: number; qty: number; rowId: number; po: string; line: number; created: string }[];
}

// Catalogue des matériaux présents sur les PO Icelea ouverts (pour la recherche manuelle
// des lignes non résolues) : un variant = son SKU/taille/code-barres + les PO où le trouver.
export interface CatalogEntry {
  vid: number;
  sku: string;
  size: string | null;
  barcode: string | null;
  pos: { po: string; line: number; qty: number }[]; // PO ouverts (vide si aucun → réception sans PO)
}
// Catalogue de recherche = TOUS les variants Icelea, chacun avec ses PO ouverts (le cas
// échéant). Permet de trouver un produit même s'il n'est sur aucun PO (réception forcée).
export function buildCatalog(index: VariantIndex): CatalogEntry[] {
  const posByVid = new Map<number, { po: string; line: number; qty: number }[]>();
  for (const r of index.openRows) {
    (posByVid.get(r.vid) || posByVid.set(r.vid, []).get(r.vid)!).push({ po: r.po, line: r.line, qty: r.qty });
  }
  return Object.entries(index.vmap)
    .filter(([, v]) => v.sku)
    .map(([id, v]) => ({ vid: Number(id), sku: v.sku, size: v.size, barcode: v.barcode, pos: posByVid.get(Number(id)) ?? [] }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

// ── Normalisation ────────────────────────────────────────────────────────────
export function codeOf(s: string | null | undefined): string | null {
  const m = (s || "").toUpperCase().match(/MD-[A-Z]{2}-0*(\d+)/);
  return m ? `MD-${m[0].match(/MD-([A-Z]{2})/)![1]}-${m[1]}` : null;
}
// ── Parse de la facture (pdfjs) ──────────────────────────────────────────────
export async function extractInvoiceItems(buffer: Buffer): Promise<ParsedItem[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;

  type W = { t: string; x: number; y: number; p: number };
  const words: W[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const h = page.getViewport({ scale: 1 }).height;
    for (const it of content.items as { str: string; transform: number[] }[]) {
      const s = (it.str || "").trim();
      if (s) words.push({ t: s, x: it.transform[4], y: h - it.transform[5], p: i });
    }
    page.cleanup();
  }
  await doc.destroy();

  // Regrouper par ligne (page + y arrondi)
  const lineMap = new Map<string, W[]>();
  for (const w of words) {
    const k = `${w.p}:${Math.round(w.y / 3)}`;
    (lineMap.get(k) || lineMap.set(k, []).get(k)!).push(w);
  }
  const keys = [...lineMap.keys()].sort((a, b) => {
    const [pa, ya] = a.split(":").map(Number);
    const [pb, yb] = b.split(":").map(Number);
    return pa - pb || ya - yb;
  });
  // 1re cellule = colonne "Item" (on s'arrête au premier gros écart de x)
  const firstCell = (ws: W[]) => {
    ws.sort((a, b) => a.x - b.x);
    let cur = "", lastX: number | null = null;
    for (const w of ws) {
      if (lastX !== null && w.x - lastX > 18) break;
      cur = (cur ? cur + " " : "") + w.t;
      lastX = w.x + w.t.length * 4;
    }
    return cur.trim();
  };
  const lineText = (ws: W[]) => [...ws].sort((a, b) => a.x - b.x).map((w) => w.t).join(" ");

  const isRef = (s: string) => /^(md-[a-z]{2}-\d+)/i.test(s);
  const items: ParsedItem[] = [];
  let cur: ParsedItem | null = null;

  for (const k of keys) {
    const ws = lineMap.get(k)!;
    const ref0 = firstCell(ws);
    const line = lineText(ws);
    if (/development fee/i.test(line)) { cur = null; continue; } // frais/services → exclus

    const hasPcs = /\bPcs?\b/i.test(line);
    const isProductLine = hasPcs && (isRef(ref0) || /\bRing\b/i.test(line));
    if (isProductLine) {
      const qty = Number((line.match(/(\d+)\s+Pcs?\b/i) || [])[1]) || 0;
      // ne capture QUE la suite de paires "taille=qté" (s'arrête avant le prix)
      const eur = (line.match(/EUROPE\s+((?:\d{2}\s*=\s*\d+\s*,?\s*)+)/i) || [])[1] || "";
      const sizes: Record<string, number> = {};
      for (const m of eur.matchAll(/(\d{2})\s*=\s*(\d+)/g)) sizes[m[1]] = (sizes[m[1]] || 0) + Number(m[2]);
      const nums = [...line.matchAll(/(\d+\.\d{2})/g)].map((m) => Number(m[1]));
      cur = {
        ref: ref0,
        code: isRef(ref0) ? codeOf(ref0) : null,
        qty,
        sizes,
        unitPrice: nums.length >= 2 ? nums[nums.length - 2] : null,
        lineTotal: nums.length ? nums[nums.length - 1] : null,
      };
      items.push(cur);
    } else if (
      cur && ref0 && !/^\d+\.\d+$/.test(ref0) && !/\d,\d/.test(ref0) &&   // ni "0.00" ni prix "3,300"
      /^[\w.#/+&\-()'’ ]+$/.test(ref0) && ref0.length < 45 &&
      !/EUROPE|Ring|Item|Total|Price|Qty|Descr|Page|USD|Carton|Weight/i.test(ref0)
    ) {
      // continuation du SKU coupé sur plusieurs lignes (ex. "Glitter/Royal Blue PVD/50-60",
      // "4.85/RB319/50-60", "#110/3") — les mots couleur (Royal, Stainless…) sont légitimes ici.
      cur.ref = (cur.ref + " " + ref0).replace(/\s+/g, " ").trim();
      cur.code = cur.code || codeOf(cur.ref);
    }
  }
  return items;
}

// ── Matching produit+taille → PO(s) ouverts FIFO ─────────────────────────────
// Discriminant fort : le CODE ÉMAIL de la facture (RP36, RK17, RM04, RB319…),
// pris entre les slashes du libellé, doit se retrouver dans le SKU du variant.
// Règle dure : pour une ligne AVEC code MD-RI, on ne sort JAMAIS de ce code.
const EMAIL_RE = /^[A-Z]{1,3}\d{1,3}$/;
const emailCodes = (s: string) => s.toUpperCase().split(/[^A-Z0-9]+/).filter((t) => EMAIL_RE.test(t));
const wordToks = (s: string) => s.toUpperCase().replace(/MTRL-|MD-[A-Z]{2}-\d+/g, " ").split(/[^A-Z]+/).filter((w) => w.length >= 3);
const compact = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

type Rec = VariantIndex["openRows"][number] & {
  sku: string; size: string | null; barcode: string | null; code: string | null; cmp: string; w: string[];
};

export function matchToOpenPOs(items: ParsedItem[], index: VariantIndex): ReceptionRow[] {
  const { vmap, openRows } = index;
  const recs: Rec[] = openRows.map((r) => {
    const v = vmap[r.vid];
    const sku = v?.sku ?? "";
    return { ...r, sku, size: v?.size ?? null, barcode: v?.barcode ?? null, code: codeOf(sku), cmp: compact(sku), w: wordToks(sku) };
  });
  const byCodeSize = new Map<string, Rec[]>();
  const bySize = new Map<string, Rec[]>();
  for (const rec of recs) {
    if (!rec.size) continue;
    if (rec.code) (byCodeSize.get(`${rec.code}|${rec.size}`) || byCodeSize.set(`${rec.code}|${rec.size}`, []).get(`${rec.code}|${rec.size}`)!).push(rec);
    (bySize.get(rec.size) || bySize.set(rec.size, []).get(rec.size)!).push(rec);
  }
  const fifo = (a: Rec[]) => [...a].sort((x, y) => (x.created || "").localeCompare(y.created || ""));

  const rows: ReceptionRow[] = [];
  for (const it of items) {
    const itEmail = emailCodes(it.ref);
    const itWords = wordToks(it.ref);
    const entries = Object.keys(it.sizes).length ? Object.entries(it.sizes) : [["", it.qty] as [string, number]];
    for (const [size, q] of entries) {
      // AVEC code MD-RI → uniquement ce code+taille ; SANS code → repli par taille (couleurs mot).
      const pool = it.code && size ? (byCodeSize.get(`${it.code}|${size}`) || []) : size ? (bySize.get(size) || []) : [];
      const scoreOf = (c: Rec) => {
        let s = 0;
        if (itEmail.length && itEmail.some((code) => c.cmp.includes(code))) s += 100;
        s += itWords.filter((w) => c.w.includes(w)).length;
        return s;
      };
      const scored = fifo(pool).map((c) => ({ c, s: scoreOf(c) }));
      const top = scored.reduce((m, x) => Math.max(m, x.s), -1);
      const topSkus = new Set(scored.filter((x) => x.s === top).map((x) => x.c.sku));
      const best: Rec | null = scored.find((x) => x.s === top)?.c ?? null; // FIFO-first parmi les meilleurs

      let accept = false, approx = false;
      if (best) {
        const distinct = new Set(pool.map((c) => c.sku)).size;
        if (distinct === 1) {
          accept = true;                                                          // un seul variant pour ce code+taille
        } else if (it.code && itEmail.length) {
          // code émail présent : il DOIT se retrouver, sinon on ne devine pas (source d'erreur connue)
          accept = itEmail.some((code) => best.cmp.includes(code));
          approx = accept && topSkus.size > 1;                                    // plusieurs SKU avec ce code → à vérifier
        } else {
          // couleur en toutes lettres : on propose le meilleur choix (option B)
          accept = top >= 1;
          approx = accept && topSkus.size > 1;                                    // égalité → proposé mais à vérifier
        }
      }
      const via: ReceptionRow["match"] = approx ? "approx" : it.code ? "code" : "nom";
      const chosen = accept ? best : null;
      const posRows = chosen ? fifo(pool.filter((c) => c.sku === chosen.sku)) : [];
      rows.push({
        code: it.code, label: it.ref, size: size || null, invoiceQty: q,
        sku: chosen?.sku ?? null, variantId: chosen?.vid ?? null, barcode: chosen?.barcode ?? null,
        pos: posRows.map((c) => ({ po: c.po, line: c.line, rowId: c.rowId, qty: c.qty, created: c.created })),
        openQty: posRows.reduce((s, c) => s + c.qty, 0),
        match: chosen ? via : "manuel",
      });
    }
  }
  return rows;
}

// ── Apprentissage : mémoriser les corrections manuelles et les réappliquer ────
// Clé = signature du libellé facture (sans dépendre de la casse/ponctuation).
export function overrideKey(label: string): string {
  return (label || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
// Famille d'un SKU = le SKU sans sa taille finale → une correction se généralise à
// toutes les tailles du même produit (ex. …-BLK-CZ-WHITE-CZ-54 → …-BLK-CZ-WHITE-CZ).
export function familyOf(sku: string): string {
  return (sku || "").replace(/-\s*\d{1,3}\s*$/, "").trim().toUpperCase();
}

// overrides : { signatureLibellé → familleSKU }. Réapplique la correction sur chaque
// ligne (toutes tailles), en retrouvant le variant famille+taille dans le catalogue.
export function applyOverrides(rows: ReceptionRow[], overrides: Record<string, string>, catalog: CatalogEntry[]): ReceptionRow[] {
  if (!overrides || Object.keys(overrides).length === 0) return rows;
  const byFamSize = new Map<string, CatalogEntry>();
  for (const e of catalog) if (e.size) byFamSize.set(`${familyOf(e.sku)}|${e.size}`, e);
  return rows.map((r) => {
    if (!r.size) return r;
    const fam = overrides[overrideKey(r.label)];
    if (!fam) return r;
    const e = byFamSize.get(`${fam}|${r.size}`);
    if (!e) return r;
    return {
      ...r, sku: e.sku, variantId: e.vid, barcode: e.barcode,
      pos: e.pos.map((p) => ({ po: p.po, line: p.line, rowId: 0, qty: p.qty, created: "" })),
      openQty: e.pos.reduce((s, p) => s + p.qty, 0), match: "corrige",
    };
  });
}
