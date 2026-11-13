// Carnet cliente (Mood Cash Engine, étage 1 — décision Philippe 13.11.2026) : ce que chaque cliente a acheté.
// Tri d'une ligne de commande en pièces (base + largeur, addon, deux tiers, medium, mini) et lecture de la taille.
// Même logique que le calcul initial fait sur tout l'historique le 13.11.2026 (65 596 clientes).
// Compatibilité (validée Philippe 13.11) : mini 1 place, medium 2, deux tiers 4, addon 6 ; base XS 4 places, small/large 6 ; même taille.
export type Piece = { type: "base" | "addon" | "deux tiers" | "medium" | "mini" | "anneau" | "inconnu"; largeur: "XS" | "S" | "L" | "?" | null; nb: number };
export const PLACES = { mini: 1, medium: 2, "deux tiers": 4, addon: 6 } as const;
export const PLACES_BASE = { XS: 4, S: 6, L: 6 } as const;

const norm = (s?: string | null) => (s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\x00-\x7f]/g, "");
const IGN = /bon cadeau|gift|baguier|multisizer|gravure|renovation|service|boite|box(?! surprise)|insert|sertissage de base|flash|collier|bracelet|boucle|pendentif|chaine|frais|livraison|emballage|ecrin|pochette|carte|montre|broche|charm|polish|chiffon|nettoy|reparation|ajustement|mise a taille|retouche|acompte|supplement|\bdon\b|sertissage|\bsac\b|flyers?|papier|pmma|enveloppe|^sav$|certificat|catalogue|concept|brochure|sachet|formulaire|devis|tirelire|calendrier/;
const NB: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8 };

export function taille(sku?: string | null, vt?: string | null, title?: string | null): number | null {
  for (const s of [vt, title]) { const m = norm(s).match(/taille ?(4[4-9]|5\d|6\d|7[0-6])\b/); if (m) return Number(m[1]); }
  const m = (vt ?? "").match(/(?<!\d)(4[4-9]|5\d|6\d|7[0-6])(?!\d|[.,]\d| ?mm| ?k| ?ct| ?%)/); if (m) return Number(m[1]);
  const m2 = (sku ?? "").match(/-(4[4-9]|5\d|6\d|7[0-6])$/); if (m2) return Number(m2[1]);
  return null;
}
function largeur(t: string): "XS" | "S" | "L" | "?" {
  if (/extra ?small|\bxs\b|9 ?mm|-xs-|-xct|\bx-small/.test(t)) return "XS";
  if (/\blarge\b|13 ?mm|ba-l-/.test(t)) return "L";
  if (/\bsmall\b|11 ?mm|ba-s-|-sm-/.test(t)) return "S";
  return "?";
}
function anneauxDuTexte(t: string) {
  const out: Record<string, number> = {};
  const types: [Piece["type"], string][] = [["mini", "minis?\\b"], ["medium", "mediums?\\b"], ["deux tiers", "(?:deux tiers|2/3)"], ["addon", "addons?\\b(?! medium| mini| deux| 2/3)"]];
  for (const [typ, pat] of types) {
    const re = new RegExp("(\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit)\\s+(?:\\w+\\s+){0,2}" + pat, "g");
    for (const m of t.matchAll(re)) out[typ] = (out[typ] ?? 0) + (/^\d+$/.test(m[1]) ? Number(m[1]) : NB[m[1]] ?? 1);
  }
  return out;
}
export function classe(title: string | null, vt: string | null, sku: string | null, ptype: string | null): { pieces: Piece[]; taille: number | null } {
  const t = norm(title), v = norm(vt), s = norm(sku), p = norm(ptype), tout = [p, t, v, s].join(" ");
  const tl = taille(sku, vt, title);
  if (IGN.test(p + " " + t) && !/seconde main/.test(t)) return { pieces: [], taille: tl };
  if (/open mood/.test(tout)) return { pieces: [], taille: tl };
  const pieces: Piece[] = [];
  let aBase = (p.startsWith("base") || /\bbase\b|mood white/.test(t)) && !/sans base/.test(v);
  if (/avec base/.test(v)) aBase = true;
  if ((/^(coffret|best of|mood box)/.test(p) || /^bague mood|^coffret/.test(t)) && !/pack|mini|medium/.test(p) && !/sans base/.test(v)) aBase = true;
  const estPack = /pack|coffret|starter|package|best of|box|kit|lot de|set\b|\+|&| et ses /.test(p + " " + t);
  if (aBase) {
    pieces.push({ type: "base", largeur: largeur([t, v, s].join(" ")), nb: 1 });
    if (!estPack) return { pieces, taille: tl };
  }
  if (estPack) {
    let a = anneauxDuTexte(t);
    if (/^2mini/.test(s) && !Object.keys(a).length) a = { mini: 2 };
    if (Object.keys(a).length) for (const [k, n] of Object.entries(a)) pieces.push({ type: k as Piece["type"], largeur: null, nb: n });
    else if (!aBase || /[+&]| et /.test(t)) pieces.push({ type: "anneau", largeur: null, nb: 1 });
    return { pieces, taille: tl };
  }
  const ordre: [Piece["type"], RegExp, RegExp][] = [
    ["mini", /\bminis?\b|^mini/, /\bminis?\b|^mini/],
    ["medium", /medium/, /medium|^med-|^me-/],
    ["deux tiers", /deux tiers|2\/3|^dt-/, /deux tiers|2\/3|^dt-/],
    ["addon", /addon|^ad-|^acetate/, /addon|^ad-|^acetate/],
  ];
  for (const [typ, pp] of ordre) if (pp.test(p)) return { pieces: [{ type: typ, largeur: null, nb: 1 }], taille: tl };
  for (const [typ, , pt] of ordre) if (pt.test(t) || pt.test(s)) return { pieces: [{ type: typ, largeur: null, nb: 1 }], taille: tl };
  return { pieces: [{ type: "inconnu", largeur: null, nb: 1 }], taille: tl };
}

const MAT: [string, RegExp][] = [["aluminium", /alumin|\balu\b|^alu-|-alu-/], ["argent", /argent|\bsilver\b|-arg-/], ["or", /\bor\b|\b9k\b|\b18k\b|\bgold\b|carats?/], ["titane", /titan/], ["ceramique", /ceramique/], ["carbone", /carbone/], ["bois", /\bbois\b|ebene|olivier|zebrano/], ["bronze", /bronze/], ["email", /\bemail\b|enamel/], ["polymere", /polymere|acetate|plastique|resine|washed|translucide|colore/], ["acier", /acier|inox|316l|steel/]];
export function matiere(title: string | null, sku: string | null, ptype: string | null): string | null {
  const t = norm([ptype ?? "", title ?? "", sku ?? ""].join(" "));
  return MAT.find(([, re]) => re.test(t))?.[0] ?? null;
}

const ORDRE = ["addon", "deux tiers", "medium", "mini", "anneau"] as const;
const NOM: Record<string, string> = { XS: "extra small", S: "small", L: "large", "?": "largeur inconnue" };
type Ligne = { title: string; variantTitle: string | null; sku: string | null; currentQuantity: number; product: { productType: string } | null };
export type Commande = { createdAt: string; cancelledAt: string | null; lignes: Ligne[] };

export function carnet(cmds: Commande[]) {
  const tailles = new Map<number, number>(), bases = new Map<string, number>(), ann: Record<string, number> = {}, mat: Record<string, number> = {};
  const dates: string[] = []; let nbCmd = 0;
  for (const c of cmds) {
    if (c.cancelledAt) continue;
    let compte = false;
    for (const l of c.lignes) {
      const q = l.currentQuantity ?? 0; if (q <= 0) continue;
      const { pieces, taille: tl } = classe(l.title, l.variantTitle, l.sku, l.product?.productType ?? null);
      compte = true;
      for (const pc of pieces) {
        if (pc.type === "inconnu") continue;
        const n = pc.nb * q;
        if (tl) tailles.set(tl, (tailles.get(tl) ?? 0) + n);
        if (pc.type === "base") { const k = `${pc.largeur}|${tl ?? ""}`; bases.set(k, (bases.get(k) ?? 0) + n); }
        else {
          ann[pc.type] = (ann[pc.type] ?? 0) + n;
          const m = matiere(l.title, l.sku, l.product?.productType ?? null);
          if (m) mat[m] = (mat[m] ?? 0) + n;
        }
      }
    }
    if (compte) { nbCmd++; dates.push(c.createdAt.slice(0, 10)); }
  }
  if (!tailles.size && !bases.size && !Object.keys(ann).length) return null;
  const tri = [...tailles.entries()].sort((a, b) => b[1] - a[1]);
  const tp = tri[0]?.[0] ?? null;
  const bl = [...bases.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => { const [w, t] = k.split("|"); return { largeur: w, taille: t ? Number(t) : null, nb: n }; });
  const autres = tri.filter(([t, c]) => t !== tp && (c >= 2 || bl.some((b) => b.taille === t))).map(([t]) => t);
  const basesTxt = bl.map((b) => `${NOM[b.largeur]} ${b.taille ?? "(taille ?)"}${b.nb > 1 ? ` ×${b.nb}` : ""}`).join("\n");
  const anneauxTxt = ORDRE.filter((x) => ann[x]).map((x) => `${ann[x]} ${x === "anneau" ? "anneaux en pack" : x}${ann[x] > 1 && ["addon", "medium", "mini"].includes(x) ? "s" : ""}`).join(" · ");
  dates.sort();
  return {
    taille: tp, basesTxt, anneauxTxt,
    json: { taille: tp, autres_tailles: autres, bases: bl, anneaux: Object.fromEntries(ORDRE.filter((x) => ann[x]).map((x) => [x, ann[x]])), matieres: Object.fromEntries(Object.entries(mat).sort((a, b) => b[1] - a[1])), premier_achat: dates[0], dernier_achat: dates.at(-1), commandes: nbCmd },
  };
}

// Propriétés envoyées à Klaviyo (mêmes règles que l'envoi initial du 13.11.2026)
export function proprietesKlaviyo(r: NonNullable<ReturnType<typeof carnet>>) {
  const j = r.json;
  const bases = j.bases.filter((b) => b.largeur in { XS: 1, S: 1, L: 1 } && b.taille);
  const bp = [...bases].sort((a, b) => Number(b.taille === j.taille) - Number(a.taille === j.taille) || b.nb - a.nb)[0];
  const p: Record<string, unknown> = {
    carnet_taille: j.taille, carnet_largeurs: [...new Set(bases.map((b) => b.largeur))].sort(),
    carnet_tailles_bases: [...new Set(bases.map((b) => b.taille))].sort(), carnet_base_principale: bp ? `${NOM[bp.largeur]} ${bp.taille}` : null,
    carnet_dernier_achat: j.dernier_achat, carnet_anneaux: r.anneauxTxt || null,
    carnet_bases_codes: [...new Set(bases.map((b) => `${b.largeur}${b.taille}`))].sort(), carnet_matieres: Object.keys(j.matieres).sort(),
  };
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length)));
}
