// Étiquettes des pièces envoyées chez Icelea pour traitement (émail, PVD, glitter).
// Rouleau continu Brother 38 mm, étiquette de 29 mm de long. Trois lignes :
//   1. le modèle et son traitement        « ICE : RM01 »
//   2. la largeur / le format et la taille « Base large · 54 »
//   3. la commande cliente et le bon Icelea « #401738 · ICE-20261105-XXXX »

export type LabelIngredient = { name: string; sku: string | null };
export type LabelItem = {
  productName: string;
  quantity: number;
  orderName: string | null;
  ingredients: LabelIngredient[];
};
export type Label = { line1: string; line2: string; line3: string };

const WIDTH: Record<string, string> = { L: "large", S: "small", XS: "extra small" };
const FORMAT: Record<string, string> = { ADDON: "Addon", DEUXTIERS: "Deux tiers", MEDIUM: "Medium" };
const PVD_BASE: Record<string, string> = { GUNMETAL: "Anthracite : Gun Metal PVD", RAINBOW: "Rainbow : Rainbow PVD" };
const PVD_RING: Record<string, string> = { ROYALBLUE: "Océan : Royal Blue PVD", BROWN: "Coco : Brown PVD" };

/** « Anneau (addon) "💙 Océan - martelé " en argent… » → « martelé » */
function ringModel(productName: string): string {
  const m = productName.match(/(?:Océan|Coco)\s*-\s*([^"»]+?)\s*["»]/i);
  return m ? m[1].trim() : "";
}

function cut(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function labelFor(ing: LabelIngredient, productName: string): Omit<Label, "line3"> {
  const sku = (ing.sku ?? "").toUpperCase();
  let m: RegExpMatchArray | null;

  // Émail sur base : MTRL-BASE-ENAMEL-RM01-L-54, nom « Base émail large ICE (RM01) »
  if ((m = sku.match(/^MTRL-BASE-ENAMEL-([A-Z0-9]+)-(L|S|XS)-(\d\d)$/))) {
    const n = ing.name.match(/^Base émail (?:large|small|extra small) (.+) \(([A-Z0-9]+)\)$/i);
    // Le nom de collection prend trop de place sur 38 mm : on garde la couleur / le modèle
    const model = (n ? n[1] : "Émail").replace(/^(Émail d'Automne|Éternité Astrale|Néon)\s+/i, "");
    return { line1: cut(`${model} : ${m[1]}`, 44), line2: `Base ${WIDTH[m[2]]} · ${m[3]}` };
  }
  // Glitter (Neige Éternelle) : MTRL-BASE-GLITTER-S-54
  if ((m = sku.match(/^MTRL-BASE-GLITTER-(S|XS)-(\d\d)$/))) {
    return { line1: "Neige Éternelle : Glitter", line2: `Base ${WIDTH[m[1]]} · ${m[2]}` };
  }
  // PVD sur base : MTRL-BASE-PVD-GUNMETAL-S-54
  if ((m = sku.match(/^MTRL-BASE-PVD-([A-Z]+)-(L|S|XS)-(\d\d)$/))) {
    return { line1: PVD_BASE[m[1]] ?? `${m[1]} PVD`, line2: `Base ${WIDTH[m[2]]} · ${m[3]}` };
  }
  // PVD sur anneau argent : MTRL-PVD-ROYALBLUE-ADDON-54
  if ((m = sku.match(/^MTRL-PVD-([A-Z]+)-(ADDON|DEUXTIERS|MEDIUM)-(\d\d)$/))) {
    const model = ringModel(productName);
    return {
      line1: PVD_RING[m[1]] ?? `${m[1]} PVD`,
      line2: cut(`${FORMAT[m[2]]}${model ? " " + model : ""} · ${m[3]}`, 30),
    };
  }
  // Toute autre pièce Icelea : son nom, et la taille si la référence la porte
  const size = sku.match(/-(\d\d)$/);
  return { line1: cut(ing.name || sku || "Pièce Icelea", 30), line2: size ? `Taille ${size[1]}` : "" };
}

export function buildLabels(items: LabelItem[], poNumber: string | null): Label[] {
  const labels: Label[] = [];
  for (const item of items) {
    const line3 = [item.orderName, poNumber].filter(Boolean).join(" · ");
    for (const ing of item.ingredients) {
      const base = labelFor(ing, item.productName);
      for (let k = 0; k < Math.max(1, item.quantity); k++) labels.push({ ...base, line3 });
    }
  }
  return labels;
}

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Page d'impression : une étiquette 38 × 29 mm par page, pour la fenêtre d'impression du Mac. */
export function labelsHtml(labels: Label[]): string {
  const body = labels
    .map(
      (l) =>
        `<div class="lab"><div class="l1">${esc(l.line1)}</div><div class="l2">${esc(l.line2)}</div><div class="l3">${esc(l.line3)}</div></div>`
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Étiquettes Icelea</title><style>
@page { size: 38mm 29mm; margin: 0; }
html, body { margin: 0; padding: 0; }
body { font-family: Helvetica, Arial, sans-serif; color: #000; }
.lab { width: 38mm; height: 29mm; box-sizing: border-box; padding: 2mm 2mm; display: flex; flex-direction: column; justify-content: center; gap: 1.2mm; overflow: hidden; page-break-after: always; break-after: page; }
.lab:last-child { page-break-after: auto; break-after: auto; }
.l1 { font-size: 9pt; font-weight: 700; line-height: 1.1; max-height: 2.2em; overflow: hidden; }
.l2 { font-size: 9pt; line-height: 1.1; }
.l3 { font-size: 6.5pt; line-height: 1.1; white-space: nowrap; overflow: hidden; }
@media screen { body { background: #eee; padding: 8px; } .lab { background: #fff; margin: 0 auto 6px; outline: 1px dashed #999; } }
</style></head><body>${body}</body></html>`;
}

/** Ouvre la page d'étiquettes dans une nouvelle fenêtre et lance la fenêtre d'impression. */
export function printLabels(labels: Label[]): boolean {
  const w = window.open("", "_blank", "width=420,height=600");
  if (!w) return false;
  w.document.open();
  w.document.write(labelsHtml(labels));
  w.document.close();
  // Une seule fenêtre d'impression, que onload se déclenche ou non après document.write
  let done = false;
  const go = () => { if (done) return; done = true; try { w.focus(); w.print(); } catch {} };
  w.onload = go;
  setTimeout(go, 600);
  return true;
}
