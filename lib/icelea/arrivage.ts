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
  unit: "pcs" | "pairs" | "sets" | null; // unité écrite dans la colonne Qty
  page: number;             // page de la facture
  issues: string[];         // écarts de format trouvés sur cette ligne (vide = ligne conforme)
  service: boolean;         // frais / réparation / mise à taille : pas de réception de stock
}

// Une ligne du plan de réception : un couple (produit, taille) rattaché à ses PO ouverts.
export interface ReceptionRow {
  code: string | null;
  label: string;            // libellé lisible
  size: string | null;
  invoiceQty: number;       // quantité facturée pour ce (produit, taille)
  sku: string | null;       // SKU Katana résolu
  name: string | null;      // nom de l'ingrédient Katana
  variantId: number | null;
  barcode: string | null;   // code-barres Katana (Code128)
  pos: { po: string; line: number; rowId: number; qty: number; created: string }[]; // PO ouverts FIFO
  openQty: number;          // total encore à recevoir dans les PO ouverts
  match: "code" | "nom" | "approx" | "manuel" | "corrige" | "aucun"; // corrige = mémorisé · aucun = sans association Katana (volontaire)
}

// Marqueur d'override signifiant "cette ligne n'a volontairement PAS d'association Katana".
export const OVERRIDE_NONE = "__NONE__";

export interface VariantIndex {
  vmap: Record<string, { sku: string; name: string | null; size: string | null; barcode: string | null }>;
  openRows: { vid: number; qty: number; rowId: number; po: string; line: number; created: string }[];
}

// Catalogue des matériaux présents sur les PO Icelea ouverts (pour la recherche manuelle
// des lignes non résolues) : un variant = son SKU/taille/code-barres + les PO où le trouver.
export interface CatalogEntry {
  vid: number;
  sku: string;
  name: string | null;
  size: string | null;
  barcode: string | null;
  pos: { po: string; line: number; qty: number; created: string }[]; // PO ouverts triés du plus ancien au plus récent (vide si aucun → réception sans PO)
}
// Catalogue de recherche = TOUS les variants Icelea, chacun avec ses PO ouverts (le cas
// échéant). Permet de trouver un produit même s'il n'est sur aucun PO (réception forcée).
// Les PO de chaque variant sont triés par DATE (plus ancien d'abord) = ordre réel de réception.
export function buildCatalog(index: VariantIndex): CatalogEntry[] {
  const posByVid = new Map<number, { po: string; line: number; qty: number; created: string }[]>();
  for (const r of index.openRows) {
    (posByVid.get(r.vid) || posByVid.set(r.vid, []).get(r.vid)!).push({ po: r.po, line: r.line, qty: r.qty, created: r.created });
  }
  for (const list of posByVid.values()) list.sort((a, b) => (a.created || "").localeCompare(b.created || ""));
  return Object.entries(index.vmap)
    .filter(([, v]) => v.sku)
    .map(([id, v]) => ({ vid: Number(id), sku: v.sku, name: v.name, size: v.size, barcode: v.barcode, pos: posByVid.get(Number(id)) ?? [] }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

// ── Normalisation ────────────────────────────────────────────────────────────
export function codeOf(s: string | null | undefined): string | null {
  const m = (s || "").toUpperCase().match(/MD-[A-Z]{2}-0*(\d+)/);
  return m ? `MD-${m[0].match(/MD-([A-Z]{2})/)![1]}-${m[1]}` : null;
}
// ── Parse de la facture (pdfjs) ──────────────────────────────────────────────
// Format d'une ligne produit Icelea (5 colonnes, lignes séparées par une ligne blanche) :
//   Item (nom, 1 à 4 lignes) | Qty (quantité totale + « Pcs. »/« Pairs ») |
//   Description (tailles « EUROPE 54=2, 60=1 », peut déborder sur la ligne suivante) |
//   Price (prix unitaire) | Total Amount (montant de la ligne).
// Les colonnes sont repérées sur l'en-tête de chaque page (Item / Qty. / Description / Price / Total).
// La facture contient aussi des chiffres INVISIBLES (cumul des pièces à gauche de Qty, cumul des
// montants entre Price et Total) : ils sont écartés, et le prix est choisi comme celui qui
// vérifie quantité × prix = montant. Chaque ligne est contrôlée (somme des tailles = quantité,
// quantité × prix = montant) et la facture entière aussi (Total Pieces / Total Pairs / Total USD).
export interface InvoiceCheck {
  footerPieces: number | null; footerPairs: number | null;
  footerTotal: number | null;   // F.O.B Bangkok = marchandise
  footerCif: number | null;     // Total C.I.F. = à payer
  charges: number; discount: number; // frais (port…) et remise lus au pied de page
  pieces: number; pairs: number; total: number;
  lineIssues: { ref: string; page: number; issues: string[] }[];
  orphans: { page: number; text: string }[];
  ok: boolean;
}
const MONEY_RE = /^(\d{1,3}(?:,\d{3})+|\d+)\.\d{2}$/;
const INT_RE = /^\d{1,3}(?:,\d{3})*(?:\s+(?:pcs?\.?|pc\.?|pairs?\.?|sets?\.?))?$/i; // « 25 » ou « 25 Pcs. » (même bloc)
const UNIT_RE = /^(pcs?\.?|pc\.?|pairs?\.?|sets?\.?)$/i;
const num = (s: string) => Number(s.replace(/,/g, ""));
const EXTRA_RE = /^(freight|shipping|insurance|bank\s*charge|discount)\b/i; // ligne de pied de page (commence par le libellé)

export async function extractInvoiceItems(buffer: Buffer): Promise<{ items: ParsedItem[]; invoiceNo: string | null; legacyInvoiceNo: string | null; check: InvoiceCheck }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;

  type W = { t: string; x: number; y: number };
  const pages: W[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const h = page.getViewport({ scale: 1 }).height;
    const ws: W[] = [];
    for (const it of content.items as { str: string; transform: number[] }[]) {
      const s = (it.str || "").trim();
      if (s) ws.push({ t: s, x: it.transform[4], y: h - it.transform[5] });
    }
    pages.push(ws);
    page.cleanup();
  }
  await doc.destroy();

  // regroupe les mots d'une page en rangées (même hauteur à ±1,6 pt), triées de haut en bas
  const rowsOf = (ws: W[]) => {
    const rows: { y: number; ws: W[] }[] = [];
    for (const w of [...ws].sort((a, b) => a.y - b.y)) {
      const r = rows.find((q) => Math.abs(q.y - w.y) <= 1.6);
      if (r) r.ws.push(w); else rows.push({ y: w.y, ws: [w] });
    }
    for (const r of rows) r.ws.sort((a, b) => a.x - b.x);
    return rows;
  };
  const text = (ws: W[]) => ws.map((w) => w.t).join(" ").replace(/\s+/g, " ").trim();

  const items: (ParsedItem & { _name: string[]; _desc: string[]; _money: W[]; _lastY: number })[] = [];
  const orphans: InvoiceCheck["orphans"] = [];
  const allRowsText: string[] = [];
  let invoiceNo: string | null = null;

  pages.forEach((ws, pi) => {
    const page = pi + 1;
    const rows = rowsOf(ws);
    for (const r of rows) allRowsText.push(text(r.ws));
    if (!invoiceNo) {
      const lab = ws.find((w) => /^Invoice\s*No/i.test(w.t));
      const cand = ws.filter((w) => /^INV\d+[-/]\d{2}[-/]\d{4}$/i.test(w.t));
      const near = lab ? cand.find((c) => Math.abs(c.y - lab.y) <= 3 && c.x > lab.x) : undefined;
      invoiceNo = (near ?? cand[0])?.t ?? null;
    }
    const hdr = rows.find((r) => r.ws.some((w) => /^Qty\.?$/i.test(w.t)) && r.ws.some((w) => /^Description$/i.test(w.t)));
    if (!hdr) return;
    const X = (re: RegExp) => hdr.ws.find((w) => re.test(w.t))!.x;
    const qtyX = X(/^Qty\.?$/i), priceX = X(/^Price$/i);
    const zItem = (w: W) => w.x < qtyX - 18 && !MONEY_RE.test(w.t);        // nom (chiffres invisibles exclus)
    const zQty = (w: W) => w.x >= qtyX - 18 && w.x < qtyX + 40;
    const zDesc = (w: W) => w.x >= qtyX + 40 && w.x < priceX - 5;
    const zMoney = (w: W) => w.x >= priceX - 5 && MONEY_RE.test(w.t);

    let cur: (typeof items)[number] | null = null;
    for (const r of rows) {
      if (r.y <= hdr.y + 12) continue;                                       // en-tête (« Total / Amount »)
      const line = text(r.ws);
      if (/Total\s*Pieces|Total\s*Pairs|Total\s*C\.?\s*I\.?\s*F|F\.?\s*O\.?\s*B\.?\s*Bangkok/i.test(line)) break;
      if (EXTRA_RE.test(line) && !r.ws.some((w) => zQty(w) && INT_RE.test(w.t))) continue; // frais de port / remise : lus au pied de page
      const qtyTok = r.ws.find((w) => zQty(w) && INT_RE.test(w.t));
      const nameWs = r.ws.filter(zItem), descWs = r.ws.filter(zDesc), moneyWs = r.ws.filter(zMoney);
      if (qtyTok) {                                                          // début d'une ligne produit
        const unitTok = r.ws.find((w) => zQty(w) && UNIT_RE.test(w.t)) ?? (/\s(\S+)$/.test(qtyTok.t) ? { t: qtyTok.t.split(/\s+/).pop()!, x: qtyTok.x, y: qtyTok.y } : undefined);
        cur = {
          ref: "", code: null, qty: num(qtyTok.t.split(/\s+/)[0]), sizes: {}, unitPrice: null, lineTotal: null,
          unit: unitTok ? (/^pair/i.test(unitTok.t) ? "pairs" : /^set/i.test(unitTok.t) ? "sets" : "pcs") : null,
          page, issues: [], service: false,
          _name: nameWs.length ? [text(nameWs)] : [], _desc: descWs.length ? [text(descWs)] : [], _money: moneyWs, _lastY: r.y,
        };
        items.push(cur);
        continue;
      }
      if (!nameWs.length && !descWs.length) continue;                        // rangée vide ou chiffres invisibles
      if (cur && cur.page === page && r.y - cur._lastY < 13) {               // suite de la même ligne (pas de ligne blanche)
        if (nameWs.length) cur._name.push(text(nameWs));
        if (descWs.length) cur._desc.push(text(descWs));
        cur._lastY = r.y;
      } else {
        orphans.push({ page, text: line });                                  // texte isolé : signalé, jamais rattaché au hasard
      }
    }
  });

  for (const it of items) {
    it.ref = it._name.join(" ").replace(/\s+/g, " ").trim();
    it.code = codeOf(it.ref);
    const desc = it._desc.join(" ");
    for (const m of desc.matchAll(/(\d{2})\s*=\s*(\d+)/g)) it.sizes[m[1]] = (it.sizes[m[1]] || 0) + Number(m[2]);
    it.service = /develop\w*\s*fee|repair|resiz|shipping|freight/i.test(it.ref + " " + desc);
    // montant = chiffre le plus à droite ; prix = celui qui vérifie quantité × prix = montant
    const money = [...it._money].sort((a, b) => a.x - b.x).map((w) => num(w.t));
    it.lineTotal = money.length ? money[money.length - 1] : null;
    const cands = money.slice(0, -1);
    const exact = it.lineTotal != null ? cands.find((p) => Math.abs(p * it.qty - it.lineTotal!) <= 0.02) : undefined;
    it.unitPrice = exact ?? (cands.length ? cands[0] : null);
    if (!it.ref) it.issues.push("nom de l'article absent");
    if (it._name.length > 4) it.issues.push(`nom sur ${it._name.length} lignes (plus de 4)`);
    if (!it.unit && !it.service) it.issues.push("unité absente (ni « Pcs. » ni « Pairs »)");
    const sum = Object.values(it.sizes).reduce((s, n) => s + n, 0);
    if (sum > 0 && sum !== it.qty) it.issues.push(`tailles = ${sum} pièces, quantité = ${it.qty}`);
    if (sum === 0 && /EUROPE/i.test(desc)) it.issues.push("tailles illisibles");
    if (it.lineTotal == null) it.issues.push("montant absent");
    else if (exact === undefined) it.issues.push(`quantité × prix ≠ montant (${it.qty} × ${it.unitPrice ?? "?"} ≠ ${it.lineTotal.toFixed(2)})`);
  }

  // contrôle de la facture entière contre son pied de page :
  // somme des lignes = F.O.B Bangkok ; F.O.B + frais (port…) − remise = Total C.I.F.
  const lastMoney = (l: string) => { const m = l.match(/(\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?!.*\d\.\d{2})/); return m ? num(m[0]) : null; };
  const lineWith = (re: RegExp) => allRowsText.find((l) => re.test(l));
  const grab = (re: RegExp) => { for (const l of allRowsText) { const m = l.match(re); if (m) return num(m[1]); } return null; };
  const fobLine = lineWith(/F\.?\s*O\.?\s*B/i), cifLine = lineWith(/Total\s*C\.?\s*I\.?\s*F/i);
  let charges = 0, discount = 0;
  for (const l of allRowsText) {
    if (/after\s*discount/i.test(l) || /\b(pcs?\.?|pairs?)\b/i.test(l) || !EXTRA_RE.test(l)) continue; // une ligne facturée (avec quantité) n'est pas un frais de pied de page
    const v = lastMoney(l); if (v == null) continue;
    if (/discount/i.test(l)) discount += v; else charges += v;
  }
  const pieces = items.filter((i) => i.unit !== "pairs").reduce((s, i) => s + i.qty, 0);
  const pairs = items.filter((i) => i.unit === "pairs").reduce((s, i) => s + i.qty, 0);
  const total = Math.round(items.reduce((s, i) => s + (i.lineTotal ?? 0), 0) * 100) / 100;
  const check: InvoiceCheck = {
    footerPieces: grab(/Total\s*Pieces\s*:?\s*([\d,]+)/i),
    footerPairs: grab(/Total\s*Pairs\s*:?\s*([\d,]+)/i),
    footerTotal: fobLine ? lastMoney(fobLine) : null,
    footerCif: cifLine ? lastMoney(cifLine) : null,
    charges: Math.round(charges * 100) / 100, discount: Math.round(discount * 100) / 100,
    pieces, pairs, total,
    lineIssues: items.filter((i) => i.issues.length).map((i) => ({ ref: i.ref || "(sans nom)", page: i.page, issues: i.issues })),
    orphans,
    ok: false,
  };
  const cifOk = check.footerCif == null || check.footerTotal == null ||
    Math.abs(check.footerTotal + check.charges - check.discount - check.footerCif) <= 0.02;
  check.ok = check.lineIssues.length === 0 && orphans.length === 0 && cifOk &&
    (check.footerPieces == null || check.footerPieces === pieces) &&
    (check.footerPairs == null || check.footerPairs === pairs) &&
    (check.footerTotal == null || Math.abs(check.footerTotal - total) <= 0.02);

  // n° de facture : fallback sur le texte brut (cas d'un libellé et d'une valeur dans le même bloc)
  const raw = pages.flat().map((w) => w.t).join(" ");
  if (!invoiceNo) invoiceNo = (raw.match(/Invoice\s*No\.?\s*:?\s*(INV[A-Z0-9\-/]{4,})/i) || raw.match(/\b(INV\d+[-/]\d{2}[-/]\d{4})\b/i) || [])[1] || null;
  // ancienne clé de reprise (l'ancien lecteur prenait souvent la date de facture) : sert à retrouver
  // la progression d'un arrivage commencé avant cette version
  const legacyInvoiceNo = (raw.match(/Invoice\s*No\.?\s*:?\s*([A-Z0-9][A-Z0-9\-/]{3,})/i) || [])[1] || null;

  const clean: ParsedItem[] = items.map((i) => ({
    ref: i.ref, code: i.code, qty: i.qty, sizes: i.sizes, unitPrice: i.unitPrice, lineTotal: i.lineTotal,
    unit: i.unit, page: i.page, issues: i.issues, service: i.service,
  }));
  return { items: clean, invoiceNo, legacyInvoiceNo, check };
}

// Signature stable d'une ligne de réception (pour mémoriser la progression d'un arrivage).
export function rowSig(label: string, size: string | null): string {
  return `${overrideKey(label)}|${size ?? ""}`;
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
  sku: string; name: string | null; size: string | null; barcode: string | null; code: string | null; cmp: string; w: string[];
};

export function matchToOpenPOs(items: ParsedItem[], index: VariantIndex): ReceptionRow[] {
  const { vmap, openRows } = index;
  const recs: Rec[] = openRows.map((r) => {
    const v = vmap[r.vid];
    const sku = v?.sku ?? "";
    return { ...r, sku, name: v?.name ?? null, size: v?.size ?? null, barcode: v?.barcode ?? null, code: codeOf(sku), cmp: compact(sku), w: wordToks(sku) };
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
        sku: chosen?.sku ?? null, name: chosen?.name ?? null, variantId: chosen?.vid ?? null, barcode: chosen?.barcode ?? null,
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
    const fam = overrides[overrideKey(r.label)];
    if (!fam) return r;
    if (fam === OVERRIDE_NONE) {
      // correction mémorisée = "pas d'association Katana"
      return { ...r, sku: null, name: null, variantId: null, barcode: null, pos: [], openQty: 0, match: "aucun" as const };
    }
    if (!r.size) return r;
    const e = byFamSize.get(`${fam}|${r.size}`);
    if (!e) return r;
    return {
      ...r, sku: e.sku, name: e.name, variantId: e.vid, barcode: e.barcode,
      pos: e.pos.map((p) => ({ po: p.po, line: p.line, rowId: 0, qty: p.qty, created: p.created })),
      openQty: e.pos.reduce((s, p) => s + p.qty, 0), match: "corrige",
    };
  });
}
