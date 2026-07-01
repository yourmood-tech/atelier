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
  match: "code" | "nom" | "manuel"; // comment le SKU a été trouvé
}

export interface VariantIndex {
  vmap: Record<string, { sku: string; size: string | null; barcode: string | null }>;
  openRows: { vid: number; qty: number; rowId: number; po: string; line: number; created: string }[];
}

// ── Normalisation ────────────────────────────────────────────────────────────
export function codeOf(s: string | null | undefined): string | null {
  const m = (s || "").toUpperCase().match(/MD-[A-Z]{2}-0*(\d+)/);
  return m ? `MD-${m[0].match(/MD-([A-Z]{2})/)![1]}-${m[1]}` : null;
}
function nameTokens(s: string): string[] {
  return (s || "")
    .toUpperCase()
    .replace(/MTRL-|MD-[A-Z]{2}-\d+|\d{2,3}\b|[^A-Z0-9]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
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
      cur && ref0 && !/^\d+\.\d+$/.test(ref0) && /^[\w.\/\-()'’ ]+$/.test(ref0) &&
      ref0.length < 45 && !/\d{3,}/.test(ref0) &&
      !/EUROPE|Ring|Item|Total|Price|Qty|Descr|Page|USD|Stainless|Royal/i.test(ref0)
    ) {
      // continuation du SKU coupé sur plusieurs lignes
      cur.ref = (cur.ref + " " + ref0).replace(/\s+/g, " ").trim();
      cur.code = cur.code || codeOf(cur.ref);
    }
  }
  return items;
}

// ── Matching produit+taille → PO(s) ouverts FIFO ─────────────────────────────
export function matchToOpenPOs(items: ParsedItem[], index: VariantIndex): ReceptionRow[] {
  const { vmap, openRows } = index;
  // index des lignes ouvertes par code|taille + par taille (pour le fallback nom)
  const byCodeSize = new Map<string, ReturnType<typeof buildRec>[]>();
  const bySize = new Map<string, ReturnType<typeof buildRec>[]>();
  function buildRec(r: VariantIndex["openRows"][number]) {
    const v = vmap[r.vid];
    return { ...r, sku: v?.sku ?? "", size: v?.size ?? null, barcode: v?.barcode ?? null, code: codeOf(v?.sku), tk: nameTokens(v?.sku ?? "") };
  }
  for (const r of openRows) {
    const rec = buildRec(r);
    if (!rec.size) continue;
    if (rec.code) {
      const k = `${rec.code}|${rec.size}`;
      (byCodeSize.get(k) || byCodeSize.set(k, []).get(k)!).push(rec);
    }
    (bySize.get(rec.size) || bySize.set(rec.size, []).get(rec.size)!).push(rec);
  }
  const fifo = <T extends { created: string }>(a: T[]) => a.sort((x, y) => (x.created || "").localeCompare(y.created || ""));

  const rows: ReceptionRow[] = [];
  for (const it of items) {
    const sizeEntries = Object.entries(it.sizes);
    const entries = sizeEntries.length ? sizeEntries : [["", it.qty] as [string, number]];
    for (const [size, q] of entries) {
      let cands: ReturnType<typeof buildRec>[] = [];
      let via: ReceptionRow["match"] = "code";
      if (it.code && size) cands = byCodeSize.get(`${it.code}|${size}`) || [];
      if (!cands.length && size) {
        // fallback : jetons de nom (préfixe/inclusion) + taille
        const pool = bySize.get(size) || [];
        const itTk = nameTokens(it.ref);
        let best: (typeof pool)[number] | null = null, bestScore = 0;
        for (const c of pool) {
          const score = c.tk.filter((w) => itTk.some((x) => x.startsWith(w) || w.startsWith(x))).length;
          if (score > bestScore) { bestScore = score; best = c; }
        }
        if (best && bestScore >= 1) { cands = pool.filter((c) => c.sku === best!.sku); via = "nom"; }
      }
      fifo(cands);
      const c0 = cands[0];
      rows.push({
        code: it.code,
        label: it.ref,
        size: size || null,
        invoiceQty: q,
        sku: c0?.sku ?? null,
        variantId: c0?.vid ?? null,
        barcode: c0?.barcode ?? null,
        pos: cands.map((c) => ({ po: c.po, line: c.line, rowId: c.rowId, qty: c.qty, created: c.created })),
        openQty: cands.reduce((s, c) => s + c.qty, 0),
        match: cands.length ? via : "manuel",
      });
    }
  }
  return rows;
}
