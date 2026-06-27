// Pré-génère la matrice d'avatars Pixar via l'atelier (KIE). Resumable (saute l'existant).
// Axes : âge × teint × coiffure × couleur. Écrit /public/avatars + manifest avatars.json.
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
const COIFFURES = [
  { id: "chignon", label: "Chignon décoiffé", p: "messy high bun with loose face-framing strands" },
  { id: "longs", label: "Longs ondulés", p: "long flowing wavy hair down past shoulders" },
  { id: "carre", label: "Carré", p: "shoulder-length straight bob haircut" },
  { id: "queue", label: "Queue de cheval", p: "high ponytail with loose face-framing strands" },
  { id: "boucles", label: "Bouclés", p: "voluminous shoulder-length curly hair" },
  { id: "court", label: "Court", p: "short cropped pixie haircut" },
];
const COULEURS = [
  { id: "brun", label: "Brun", p: "brown" },
  { id: "blond", label: "Blond", p: "blonde" },
  { id: "noir", label: "Noir", p: "black" },
  { id: "auburn", label: "Auburn", p: "auburn red" },
  { id: "gris", label: "Gris", p: "grey silver" },
];
const AGES = [
  { id: "jeune", label: "Jeune", subj: "a young woman", face: "" },
  { id: "mure", label: "Mûre", subj: "an elegant mature woman in her late fifties", face: "graceful older face with soft natural wrinkles, gentle laugh lines and refined features, " },
];

// Fichier : jeune garde l'ancien nommage (compat 100 déjà générés).
const fileName = (age, t, co, cl) => (age === "jeune" ? `av-${t}-${co}-${cl}.png` : `av-${age}-${t}-${co}-${cl}.png`);

// Cible : jeune = matrice complète ; mûre = set ciblé (gris/brun, 3 coiffures).
const MURE_COIFFURES = new Set(["chignon", "carre", "court"]);
const MURE_COULEURS = new Set(["gris", "brun"]);
const TARGETS = [];
for (const a of AGES) for (const t of TEINTS) for (const co of COIFFURES) for (const cl of COULEURS) {
  if (a.id === "mure" && (!MURE_COIFFURES.has(co.id) || !MURE_COULEURS.has(cl.id))) continue;
  TARGETS.push({ a, t, co, cl });
}

function prompt(a, t, co, cl) {
  return `Cute 3D character portrait of ${a.subj} in modern Pixar / Disney 3D animation style, friendly warm closed-lip smile, ${a.face}big expressive bright eyes with soft catchlights, smooth polished 3D render with soft subsurface skin and gentle studio lighting. ${co.p}, ${cl.p} hair, ${t.p}, small gold hoop earrings, plain white relaxed t-shirt. Front-facing, head and shoulders, plain soft cream background, centered composition, adorable, premium, high quality, identical consistent framing and proportions.`;
}

function writeManifest() {
  const entries = [];
  for (const { a, t, co, cl } of TARGETS) {
    const fn = fileName(a.id, t.id, co.id, cl.id);
    if (fs.existsSync(path.join(OUT, fn))) entries.push({ age: a.id, teint: t.id, coiffure: co.id, couleur: cl.id, file: `/avatars/${fn}` });
  }
  fs.writeFileSync(path.join(OUT, "avatars.json"), JSON.stringify({
    ages: AGES.map(({ id, label }) => ({ id, label })),
    teints: TEINTS.map(({ id, label }) => ({ id, label })),
    coiffures: COIFFURES.map(({ id, label }) => ({ id, label })),
    couleurs: COULEURS.map(({ id, label }) => ({ id, label })),
    avatars: entries,
  }, null, 2));
  return entries.length;
}

let done = 0, made = 0, failed = 0;
const total = TARGETS.length;
for (const { a, t, co, cl } of TARGETS) {
  done++;
  const fn = fileName(a.id, t.id, co.id, cl.id);
  const target = path.join(OUT, fn);
  if (fs.existsSync(target)) continue;
  const slug = fn.replace(/\.png$/, "");
  const briefPath = `/tmp/b-${slug}.json`;
  fs.writeFileSync(briefPath, JSON.stringify({ slug, recipe: RECIPE, content: { prompt: prompt(a, t, co, cl) }, format: "1:1", resolution: "1K" }));
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
