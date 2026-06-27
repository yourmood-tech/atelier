// Pré-génère la matrice d'avatars Pixar via l'atelier (KIE). Resumable (saute l'existant).
// Axes : genre × âge × teint × coiffure × couleur × barbe(homme). → /public/avatars + manifest.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SKILL = "/Users/amila/YourRender/mood-collection/.claude/skills/atelier-amila";
const ATELIER = path.join(SKILL, "scripts/atelier.mjs");
const OUT = "/Users/amila/YourRender/atelier/public/avatars";
const RECIPE = "/tmp/recipe-avatar.json";
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(RECIPE, JSON.stringify({
  engine: { model: "gpt-image-2-text-to-image", fallback: "nano-banana-2", resolution: "1K", aspect: "1:1", via: "KIE" },
  promptTemplate: "{{prompt}}",
}));

const TEINTS = [
  { id: "porcelaine", label: "Porcelaine", p: "fair porcelain light skin" },
  { id: "clair", label: "Clair", p: "light skin" },
  { id: "dore", label: "Doré", p: "golden tanned skin" },
  { id: "caramel", label: "Caramel", p: "warm caramel brown skin" },
  { id: "ebene", label: "Ébène", p: "deep ebony brown skin" },
];
// Liste de coiffures = union femme + homme (chacune dispo selon le genre via le sélecteur).
const COIFFURES = [
  { id: "chignon", label: "Chignon décoiffé", p: "messy high bun with loose face-framing strands" },
  { id: "longs", label: "Longs ondulés", p: "long flowing wavy hair down past shoulders" },
  { id: "carre", label: "Carré", p: "shoulder-length straight bob haircut" },
  { id: "queue", label: "Queue de cheval", p: "high ponytail with loose face-framing strands" },
  { id: "boucles", label: "Bouclés", p: "voluminous curly hair" },
  { id: "court", label: "Court", p: "short cropped hair" },
  { id: "milong", label: "Mi-long", p: "medium tousled hair" },
  { id: "rase", label: "Rasé", p: "very short buzzcut faded haircut" },
];
const COULEURS = [
  { id: "brun", label: "Brun", p: "brown" },
  { id: "blond", label: "Blond", p: "blonde" },
  { id: "noir", label: "Noir", p: "black" },
  { id: "auburn", label: "Auburn", p: "auburn red" },
  { id: "gris", label: "Gris", p: "grey silver" },
];
const AGES = [{ id: "jeune", label: "Jeune" }, { id: "mure", label: "Mûre" }];
const GENRES = [{ id: "femme", label: "Femme" }, { id: "homme", label: "Homme" }];
const BARBES = [{ id: "sans", label: "Sans barbe", p: "clean-shaven" }, { id: "avec", label: "Barbe", p: "short well-groomed beard" }];

const C = (id) => COIFFURES.find((x) => x.id === id);
const L = (id) => COULEURS.find((x) => x.id === id);
const T = (id) => TEINTS.find((x) => x.id === id);
const B = (id) => BARBES.find((x) => x.id === id);

// Coiffures par genre
const COIF_FEMME = ["chignon", "longs", "carre", "queue", "boucles", "court"];
const COIF_HOMME = ["court", "milong", "boucles", "rase"];

// Fichiers : femme garde l'ancien nommage (compat 180 déjà générés).
function fileName(genre, age, t, co, cl, barbe) {
  if (genre === "femme") return age === "jeune" ? `av-${t}-${co}-${cl}.png` : `av-mure-${t}-${co}-${cl}.png`;
  return `av-h-${age}-${t}-${co}-${cl}-${barbe}.png`;
}

// Construit la liste des cibles.
const TARGETS = [];
// FEMME (inchangé) — jeune complète + mûre ciblée
for (const t of TEINTS) for (const coId of COIF_FEMME) for (const cl of COULEURS)
  TARGETS.push({ genre: "femme", age: "jeune", t: t.id, co: coId, cl: cl.id, barbe: "sans" });
const FMURE_COIF = new Set(["chignon", "carre", "court"]), FMURE_COUL = new Set(["gris", "brun"]);
for (const t of TEINTS) for (const coId of COIF_FEMME) for (const cl of COULEURS)
  if (FMURE_COIF.has(coId) && FMURE_COUL.has(cl.id)) TARGETS.push({ genre: "femme", age: "mure", t: t.id, co: coId, cl: cl.id, barbe: "sans" });
// HOMME — jeune (brun/blond/noir) + mûr ciblé (court/rasé, gris/brun), chacun sans/avec barbe
const HJEUNE_COUL = ["brun", "blond", "noir"];
for (const t of TEINTS) for (const coId of COIF_HOMME) for (const clId of HJEUNE_COUL) for (const ba of BARBES)
  TARGETS.push({ genre: "homme", age: "jeune", t: t.id, co: coId, cl: clId, barbe: ba.id });
const HMURE_COIF = ["court", "rase"], HMURE_COUL = ["gris", "brun"];
for (const t of TEINTS) for (const coId of HMURE_COIF) for (const clId of HMURE_COUL) for (const ba of BARBES)
  TARGETS.push({ genre: "homme", age: "mure", t: t.id, co: coId, cl: clId, barbe: ba.id });

function prompt({ genre, age, t, co, cl, barbe }) {
  const teint = T(t).p, coif = C(co).p, coul = L(cl).p;
  if (genre === "femme") {
    const subj = age === "jeune" ? "a young woman" : "an elegant mature woman in her late fifties";
    const face = age === "mure" ? "graceful older face with soft natural wrinkles, gentle laugh lines and refined features, " : "";
    return `Cute 3D character portrait of ${subj} in modern Pixar / Disney 3D animation style, friendly warm closed-lip smile, ${face}big expressive bright eyes with soft catchlights, smooth polished 3D render with soft subsurface skin and gentle studio lighting. ${coif}, ${coul} hair, ${teint}, small gold hoop earrings, plain white relaxed t-shirt. Front-facing, head and shoulders, plain soft cream background, centered composition, adorable, premium, high quality, identical consistent framing and proportions.`;
  }
  const subj = age === "jeune" ? "a young man" : "a distinguished mature man in his late fifties";
  const face = age === "mure" ? "older face with soft natural wrinkles and refined features, " : "";
  return `Cute 3D character portrait of ${subj} in modern Pixar / Disney 3D animation style, friendly warm closed-lip smile, ${face}big expressive bright eyes with soft catchlights, smooth polished 3D render with soft subsurface skin and gentle studio lighting. ${coif}, ${coul} hair, ${B(barbe).p}, ${teint}, plain white relaxed t-shirt. Front-facing, head and shoulders, plain soft cream background, centered composition, adorable, premium, high quality, identical consistent framing and proportions.`;
}

function writeManifest() {
  const entries = [];
  for (const tg of TARGETS) {
    const fn = fileName(tg.genre, tg.age, tg.t, tg.co, tg.cl, tg.barbe);
    if (fs.existsSync(path.join(OUT, fn))) entries.push({ genre: tg.genre, age: tg.age, teint: tg.t, coiffure: tg.co, couleur: tg.cl, barbe: tg.barbe, file: `/avatars/${fn}` });
  }
  fs.writeFileSync(path.join(OUT, "avatars.json"), JSON.stringify({
    genres: GENRES, ages: AGES, barbes: BARBES,
    teints: TEINTS.map(({ id, label }) => ({ id, label })),
    coiffures: COIFFURES.map(({ id, label }) => ({ id, label })),
    couleurs: COULEURS.map(({ id, label }) => ({ id, label })),
    avatars: entries,
  }, null, 2));
  return entries.length;
}

let done = 0, made = 0, failed = 0;
const total = TARGETS.length;
for (const tg of TARGETS) {
  done++;
  const fn = fileName(tg.genre, tg.age, tg.t, tg.co, tg.cl, tg.barbe);
  const target = path.join(OUT, fn);
  if (fs.existsSync(target)) continue;
  const slug = fn.replace(/\.png$/, "");
  const briefPath = `/tmp/b-${slug}.json`;
  fs.writeFileSync(briefPath, JSON.stringify({ slug, recipe: RECIPE, content: { prompt: prompt(tg) }, format: "1:1", resolution: "1K" }));
  try {
    const out = execSync(`node ${ATELIER} --brief ${briefPath} --no-open --no-save`, { cwd: SKILL, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const m = out.match(/asset de conception : (.+\.png)/);
    if (!m) { failed++; console.log(`[${done}/${total}] ✗ ${slug} (pas de sortie)`); continue; }
    fs.copyFileSync(m[1].trim(), target);
    made++;
    writeManifest();
    console.log(`[${done}/${total}] ✓ ${slug}`);
  } catch (e) {
    failed++;
    console.log(`[${done}/${total}] ✗ ${slug} ${String(e).slice(0, 80)}`);
  }
}
const n = writeManifest();
console.log(`TERMINÉ — ${made} générés, ${failed} échecs, ${n}/${total} présents.`);
