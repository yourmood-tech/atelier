import { NextRequest, NextResponse } from "next/server";

// Mots à ignorer (en-têtes, pieds de page, lignes de résumé)
const SKIP_WORDS = new Set(["Stainless", "Development", "Freight", "Page", "INVOICE", "Item", "Total", "USD", "CARTON", "HIS", "Description", "Size", "Qty", "Amount"]);
const REF_RE = /MD-[A-Z]{2}-\d+/;
const SIZE_RANGE_RE = /\/(\d{2}-\d{2})/;

// Colonnes dans la facture Icelea (identiques au script Python pdfplumber)
const X_ITEM_MAX  = 165;   // colonne "Item / ref" : x0 < 165
const X_PRICE_MIN = 465;   // colonne "Prix unitaire" : 465 < x0 < 490
const X_PRICE_MAX = 490;

interface PdfWord { text: string; x: number; y: number }

interface ParsedItem {
  ref: string;
  size_range: string;
  price: number;
  count: number;
  price_min: number;
  price_max: number;
}

// Regroupe les mots par ligne (y arrondi à 4px comme Python)
// et applique le filtre x exact pour séparer ref et prix.
function parseIceleaWords(words: PdfWord[]): ParsedItem[] {
  // Grouper par y_key = round(y / 4) * 4
  const lineMap = new Map<number, PdfWord[]>();
  for (const w of words) {
    const yKey = Math.round(w.y / 4) * 4;
    if (!lineMap.has(yKey)) lineMap.set(yKey, []);
    lineMap.get(yKey)!.push(w);
  }

  const items: Record<string, number[]> = {};
  let pendingRef: string | null = null;
  let pendingPrice: number | null = null;

  for (const yKey of [...lineMap.keys()].sort((a, b) => b - a)) { // PDF y croît vers le haut
    const lw = lineMap.get(yKey)!.sort((a, b) => a.x - b.x);

    const itemWords = lw.filter(w => w.x < X_ITEM_MAX).map(w => w.text);
    const priceWords = lw.filter(w => w.x > X_PRICE_MIN && w.x < X_PRICE_MAX);
    const itemText = itemWords.join(" ").trim();

    // Sauter les lignes vides ou de header
    if (!itemText || SKIP_WORDS.has(itemText.split(/\s+/)[0])) {
      // Flush earring en attente si on tombe sur une ligne skip
      if (pendingRef !== null && pendingPrice !== null) {
        (items[`${pendingRef}/none`] ??= []).push(pendingPrice);
        pendingRef = null; pendingPrice = null;
      }
      continue;
    }

    // Extraire le prix de la colonne prix (pas des autres colonnes)
    let price: number | null = null;
    for (const pw of priceWords) {
      const p = parseFloat(pw.text.replace(",", ""));
      if (p > 1 && p < 500) { price = p; break; }
    }

    const refMatch = itemText.match(REF_RE);
    const sizeMatch = itemText.match(SIZE_RANGE_RE);

    if (refMatch) {
      // Flush le pending earring précédent
      if (pendingRef !== null && pendingPrice !== null) {
        (items[`${pendingRef}/none`] ??= []).push(pendingPrice);
      }
      pendingRef = refMatch[0];
      pendingPrice = price;

      if (sizeMatch && price !== null) {
        (items[`${pendingRef}/${sizeMatch[1]}`] ??= []).push(price);
        pendingRef = null; pendingPrice = null;
      }
    } else if (pendingRef !== null) {
      if (sizeMatch) {
        const p = pendingPrice ?? price;
        if (p !== null) (items[`${pendingRef}/${sizeMatch[1]}`] ??= []).push(p);
        pendingRef = null; pendingPrice = null;
      }
    }
  }

  // Flush dernier pending
  if (pendingRef !== null && pendingPrice !== null) {
    (items[`${pendingRef}/none`] ??= []).push(pendingPrice);
  }

  return Object.entries(items)
    .map(([key, prices]) => {
      const [ref, size_range] = key.split("/", 2);
      const sorted = [...prices].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      return { ref, size_range, price: median, price_min: sorted[0], price_max: sorted[sorted.length - 1], count: sorted.length };
    })
    .sort((a, b) => a.ref.localeCompare(b.ref) || a.size_range.localeCompare(b.size_range));
}

// Extrait les mots avec leurs coordonnées x/y via pdfjs-dist (fake worker Node.js)
async function extractPDFWords(buffer: Buffer): Promise<{ words: PdfWord[]; numPages: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
    const allWords: PdfWord[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      const pageH = viewport.height;

      for (const item of content.items as { str: string; transform: number[] }[]) {
        const str = item.str.trim();
        if (!str) continue;
        const x = item.transform[4];
        // pdfjs y=0 en bas — convertir en y depuis le haut comme pdfplumber
        const y = pageH - item.transform[5];
        allWords.push({ text: str, x, y });
      }
      page.cleanup();
    }
    await doc.destroy();
    return { words: allWords, numPages: doc.numPages };
  } catch (e) {
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier PDF fourni" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { words, numPages } = await extractPDFWords(buffer);
    const items = parseIceleaWords(words);

    if (items.length === 0) {
      // Renvoyer un échantillon des mots pour debug si besoin
      const sample = words.slice(0, 30).map(w => `(x=${w.x.toFixed(0)},y=${w.y.toFixed(0)}) ${w.text}`).join("\n");
      return NextResponse.json({
        error: "Aucune référence Icelea trouvée (attendu : MD-RI-XXX, MD-EA-XXX…)",
        debug: sample,
      }, { status: 422 });
    }

    return NextResponse.json({ items, totalPages: numPages });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 500 });
  }
}
