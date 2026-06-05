import { NextRequest, NextResponse } from "next/server";

const SKIP_WORDS = new Set(["Stainless", "Development", "Freight", "Page", "INVOICE", "Item", "Total", "USD", "CARTON", "HIS", "Description", "Size", "Qty", "Amount"]);
const REF_RE = /MD-[A-Z]{2}-\d+/;
const SIZE_RANGE_RE = /\/(\d{2}-\d{2})/;

interface ParsedItem {
  ref: string;
  size_range: string; // "50-60" | "none"
  price: number;
  count: number;
  price_min: number;
  price_max: number;
}

// Extracts text from PDF buffer and parses Icelea price rows.
// pdf-parse returns raw text in reading order. We reconstruct rows by splitting
// on newlines and matching the ref / size-range / price patterns from each line.
function parseIceleaText(text: string): ParsedItem[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: Record<string, number[]> = {};

  let pendingRef: string | null = null;

  for (const line of lines) {
    // Skip header/footer lines
    if (SKIP_WORDS.has(line.split(/\s+/)[0])) {
      if (pendingRef) { flush(pendingRef, null, items); pendingRef = null; }
      continue;
    }

    const refMatch = line.match(REF_RE);
    const sizeMatch = line.match(SIZE_RANGE_RE);

    // Extract price from the line — last number in reasonable range
    let price: number | null = null;
    const nums = [...line.matchAll(/\b(\d{1,3}(?:[.,]\d{2})?)\b/g)]
      .map(m => parseFloat(m[1].replace(",", ".")))
      .filter(n => n > 1 && n < 500);
    if (nums.length) price = nums[nums.length - 1];

    if (refMatch) {
      // Flush previous earring-style pending
      if (pendingRef) flush(pendingRef, null, items);
      pendingRef = refMatch[0];

      if (sizeMatch && price !== null) {
        const key = `${pendingRef}/${sizeMatch[1]}`;
        (items[key] ??= []).push(price);
        pendingRef = null;
      } else if (!sizeMatch && price !== null) {
        // Could be earring (no size) with price on same line
        const key = `${pendingRef}/none`;
        (items[key] ??= []).push(price);
        pendingRef = null;
      }
      // else: wait for size range on next line
    } else if (pendingRef) {
      if (sizeMatch && price !== null) {
        const key = `${pendingRef}/${sizeMatch[1]}`;
        (items[key] ??= []).push(price);
        pendingRef = null;
      } else if (price !== null && !sizeMatch) {
        // Continuation line with price but no size → earring
        const key = `${pendingRef}/none`;
        (items[key] ??= []).push(price);
        pendingRef = null;
      }
    }
  }

  if (pendingRef) flush(pendingRef, null, items);

  return Object.entries(items)
    .map(([key, prices]) => {
      const [ref, size_range] = key.split("/", 2);
      const sorted = [...prices].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      return {
        ref,
        size_range,
        price: median,
        price_min: sorted[0],
        price_max: sorted[sorted.length - 1],
        count: sorted.length,
      };
    })
    .sort((a, b) => a.ref.localeCompare(b.ref) || a.size_range.localeCompare(b.size_range));
}

function flush(ref: string, _price: number | null, items: Record<string, number[]>) {
  // Nothing to flush if no price was accumulated — the next line should carry it
  void ref; void items;
}

// Extrait le texte d'un PDF via pdfjs-dist + worker_threads (seule méthode
// fiable en environnement serverless Node.js — pas de Web Worker disponible).
async function extractPDFText(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  const { Worker } = await import("worker_threads");
  const { createRequire } = await import("module");
  const _require = createRequire(import.meta.url);

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = _require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjsWorker = new Worker(workerPath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs.GlobalWorkerOptions as any).workerPort = pdfjsWorker;

  try {
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    }).promise;

    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // Reconstitue le texte avec retours à la ligne sur les items à y décroissant
      const items = content.items as { str: string; transform: number[] }[];
      let prevY: number | null = null;
      for (const item of items) {
        const y = item.transform[5];
        if (prevY !== null && Math.abs(y - prevY) > 3) fullText += "\n";
        fullText += item.str + " ";
        prevY = y;
      }
      fullText += "\n";
      page.cleanup();
    }
    await doc.destroy();
    return { text: fullText, numPages: doc.numPages };
  } finally {
    await pdfjsWorker.terminate();
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier PDF fourni" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text: rawText, numPages } = await extractPDFText(buffer);
    const items = parseIceleaText(rawText);

    if (items.length === 0) {
      return NextResponse.json({
        error: "Aucune référence Icelea trouvée dans ce PDF (attendu : MD-RI-XXX, MD-EA-XXX…)",
        rawText: rawText.slice(0, 1500),
      }, { status: 422 });
    }

    return NextResponse.json({ items, totalPages: numPages });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 500 });
  }
}
