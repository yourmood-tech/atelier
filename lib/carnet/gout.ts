// Goût de la cliente (décision Philippe 14.11.2026) : 8 familles de design + couleur dominante, pour cibler les pépites.
// Familles = trouvées d'après les achats communs (analyse du 14.11 sur les achats depuis 2023), complétées par des règles
// de mots pour les nouvelles pièces. Couleur = la variante choisie, sinon la ligne « Couleur » de la description de la
// fiche (corrigé le 14.11 : « myrtille » = bleu, cf. Ours céleste), sinon le titre, sinon les étiquettes.
// Fêtes (décision Philippe 14.11) : Noël, Saint-Valentin, Fête des mères — lues dans le nom et les étiquettes des fiches.
// Couleur dominante (validée 14.11) : sur les 12 derniers anneaux dont la couleur est lisible, au moins 2 anneaux et
// au moins 40 % de la même teinte ; sinon « melange ». Même logique que le calcul initial (scratchpad design/gout.py).
import CARTE from "./carte-familles.json";
import FICHES from "./fiches-anneaux.json";

export const FAMILLES = {
  coeurs: "Cœurs et amour", aura: "Aura sertis", suisse: "Suisse et montagne", brutes: "Matières brutes",
  lumineux: "Argent coloré lumineux", "email-nacre": "Émail et nacre", sombre: "Sombre et gothique", uni: "Aluminium uni et minis",
} as const;
export type Famille = keyof typeof FAMILLES;
export const TEINTES = ["noir", "blanc", "rose", "rouge", "violet", "bleu", "turquoise", "vert", "dore", "brun", "argente"] as const;
export type Teinte = (typeof TEINTES)[number];

const norm = (s?: string | null) => (s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\x00-\x7f]/g, "");

// Clé d'un design (même calcul que l'analyse) : le nom entre guillemets, sinon le titre sans taille ni mots de type.
export function cle(title?: string | null): string {
  const t0 = title ?? "";
  const m = t0.match(/[«„"]\s*([^»“"]+?)\s*[»“"]/);
  if (m) return norm(m[1]).trim();
  let t = norm(t0);
  t = t.replace(/[^\w\s'-]/g, " ");
  t = t.replace(/\b(taille|t\.?)\s*\d{2}\b/g, " ").replace(/\b(4[4-9]|5\d|6\d|7[0-6])\b/g, " ");
  t = t.replace(/\b(anneau|addon|add-on|deux tiers|2\/3|medium|mini|pour bague mood interchangeable|pour bague mood|bague mood|interchangeable)\b/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

const REGLES: [Famille, RegExp][] = [
  ["coeurs", /coeur|\blove\b|amour|infini|papillon|heart/],
  ["aura", /\baura\b|soraura|willow/],
  ["suisse", /edelweiss|suisse|swiss|schweiz|poya|zermatt|montagne|alpage|cervin|matterhorn|vache|mont blanc|valais|brame du cerf|hop suisse/],
  ["sombre", /skull|skeleton|crane|ossia|epine|gothi|tete de mort|squelette/],
  ["email-nacre", /\bemail|emaille|nacre|inlay/],
  ["lumineux", /\bglow\b|revetement|lune bleue|bleu des dieux/],
  ["brutes", /froiss|\brock\b|carbon|clawgrunge|hammergrunge|martel|\bbrut|moab|grunge|cocon de soie/],
];
const COUL: [Teinte, RegExp][] = [
  ["noir", /\bnoir|\bblack|anthracite|obscur|nocturne|ebene|onyx/],
  ["blanc", /\bblanc|\bwhite|nacre|perle|ivoire|neige|givre/],
  ["rose", /\brose\b|\bpink|blush|sakura|poudre|corail|saumon|peche|abricot/],
  ["rouge", /\brouge|\bred\b|rubis|framboise|cerise|chili|bordeaux|lie-de-vin|lie de vin|grenat/],
  ["violet", /violet|aubergine|lilas|lavand|prune|purple|mauve|parme|indigo|amethyste/],
  ["bleu", /\bbleu|\bblue|marine|azur|saphir|lapis|\bnuit\b|cobalt|\bciel\b|london|\bsky\b|myrtille/],
  ["turquoise", /turquoise|lagon|menthe|aqua|cyan|celadon/],
  ["vert", /\bvert|\bgreen|emeraude|olive|kaki|sapin|jade|anis|tilleul/],
  ["dore", /jaune|\bor\b|dore|orange|ocre|moutarde|soleil|citron|caramel|ambre|miel|\bgold/],
  ["brun", /\bbrun|bronze|chocolat|\bcafe\b|cuivre|cognac|marron|taupe|\bsable\b/],
  ["argente", /argent|\bacier\b|titane|\bgris|silver|platine|rhodi|carbone|inox/],
];
const MOTS_UNI = /\b(en|aluminium|alu|anodise|anodisee|polymere|polymer|opaque|colore|coloree|acetate|mini|minis|s|1|un|medium|addon|deux|tiers|couleur|a|choix|de|pour|bague|mood|interchangeable)\b/g;

export function couleurTexte(texte?: string | null): Teinte | null {
  // « rose gold » / « or rose » = une touche sur une pièce d'argent ou d'acier, pas sa couleur (Entwine, 14.11)
  const s = norm(texte).replace(/rose[- ]?gold|pink[- ]?gold|\bor rose\b|\bgold[- ]?rose/g, " ");
  for (const [c, re] of COUL.slice(0, -1)) if (re.test(s)) return c;
  return COUL.at(-1)![1].test(s) ? "argente" : null;
}
export function familleRegles(titre?: string | null): Famille | null {
  const s = norm(titre);
  for (const [f, re] of REGLES) if (re.test(s)) return f;
  if (/alumin|\balu\b|anodis|polym|opaque|acetate|\bmini/.test(s)) {
    let reste = s.replace(/[^a-z\s]/g, " ").replace(MOTS_UNI, " ");
    for (const [, re] of COUL) reste = reste.replace(new RegExp(re.source, "g"), " ");
    if (!reste.trim()) return "uni";
  }
  return null;
}
// Étiquette de fiche « famille-<code> » / « couleur-<teinte> » : choix manuel, prioritaire (ex. pour une pépite)
export function familleDe(titre?: string | null, etiquettes: string[] = []): Famille | null {
  const t = etiquettes.map((e) => norm(e)).find((e) => e.startsWith("famille-"))?.slice(8);
  if (t && t in FAMILLES) return t as Famille;
  return ((CARTE as Record<string, string>)[cle(titre)] as Famille | undefined) ?? familleRegles(titre);
}
type Fiche = { c?: Teinte; fe?: Fete[] };
const fiche = (titre?: string | null) => (FICHES as Record<string, Fiche>)[cle(titre)];
export function couleurDe(titre?: string | null, variante?: string | null, etiquettes: string[] = [], description?: string | null): Teinte | null {
  const t = etiquettes.map((e) => norm(e)).find((e) => e.startsWith("couleur-"))?.slice(8);
  if (t && (TEINTES as readonly string[]).includes(t)) return t as Teinte;
  const ligne = description?.match(/<td>\s*Couleur\s*<\/td>\s*<td>([\s\S]*?)<\/td>/i)?.[1];
  return couleurTexte(variante) ?? (ligne ? couleurTexte(ligne.replace(/<[^>]+>/g, " ")) : null) ?? fiche(titre)?.c ?? couleurTexte(titre)
    ?? couleurTexte(etiquettes.filter((e) => e.length < 25).join(" "));
}

export const FETES = { noel: "Noël", "saint-valentin": "Saint-Valentin", "fete-des-meres": "Fête des mères" } as const;
export type Fete = keyof typeof FETES;
const REGLES_FETES: [Fete, RegExp][] = [
  ["noel", /no[e]l|sapin|flocon|renne|pere noel|weihnacht|christmas|xmas|bonhomme de neige|calendrier de l.avent/],
  ["saint-valentin", /saint[- ]?valentin|\bvalentin|valentine/],
  ["fete-des-meres", /fete des meres|fete-des-meres|\bmaman|\bmom\b|muttertag|\bmama\b/],
];
export function fetesDe(titre?: string | null, etiquettes: string[] = []): Fete[] {
  const tx = norm(`${titre ?? ""} ${etiquettes.join(" ")}`);
  return [...new Set([...REGLES_FETES.filter(([, re]) => re.test(tx)).map(([f]) => f), ...(fiche(titre)?.fe ?? [])])];
}
export function dominante(suite: { jour: string; teinte: Teinte }[]): Teinte | "melange" | null {
  const s = [...suite].sort((a, b) => a.jour.localeCompare(b.jour)).slice(-12);
  if (s.length < 2) return null;
  const n = new Map<Teinte, number>(); for (const x of s) n.set(x.teinte, (n.get(x.teinte) ?? 0) + 1);
  const [t, v] = [...n.entries()].sort((a, b) => b[1] - a[1])[0];
  return v / s.length >= 0.4 ? t : "melange";
}
