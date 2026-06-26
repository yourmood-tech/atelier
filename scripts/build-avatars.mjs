// Pré-génère la matrice d'avatars Pixar (teint × coiffure × couleur) via l'atelier (KIE).
// Resumable : saute les images déjà présentes. Écrit /public/avatars + manifest avatars.json.
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
];
const COULEURS = [
  { id: "brun", label: "Brun", p: "brown" },
  { id: "blond", label: "Blond", p: "blonde" },
  { id: "noir", label: "Noir", p: "black" },
  { id: "auburn", label: "Auburn", p: "auburn red" },
];

function prompt(t, h, c) {
  return `Cute 3D character portrait of a young woman in modern Pixar / Disney 3D animation style, friendly warm closed-lip smile, big expressive bright eyes with soft catchlights, smooth polished 3D render with soft subsurface skin and gentle studio lighting. ${h.p}, ${c.p} hair, ${t.p}, small gold hoop earrings, plain white relaxed t-shirt. Front-facing, head and shoulders, plain soft cream background, centered composition, adorable, premium, high quality, identical consistent framing and proportions.`;
}

function writeManifest() {
  const entries = [];
  for (const t of TEINTS) for (const h of COIFFURES) for (const c of COULEURS) {
    const file = `av-${t.id}-${h.id}-${c.id}.png`;
    if (fs.existsSync(path.join(OUT, file))) entries.push({ teint: t.id, coiffure: h.id, couleur: c.id, file: `/avatars/${file}` });
  }
  const manifest = {
    teints: TEINTS.map(({ id, label }) => ({ id, label })),
    coiffures: COIFFURES.map(({ id, label }) => ({ id, label })),
    couleurs: COULEURS.map(({ id, label }) => ({ id, label })),
    avatars: entries,
  };
  fs.writeFileSync(path.join(OUT, "avatars.json"), JSON.stringify(manifest, null, 2));
  return entries.length;
}

let done = 0, made = 0, failed = 0;
const total = TEINTS.length * COIFFURES.length * COULEURS.length;
for (const t of TEINTS) for (const h of COIFFURES) for (const c of COULEURS) {
  done++;
  const file = `av-${t.id}-${h.id}-${c.id}.png`;
  const target = path.join(OUT, file);
  if (fs.existsSync(target)) { continue; }
  const slug = `av-${t.id}-${h.id}-${c.id}`;
  const briefPath = `/tmp/b-${slug}.json`;
  fs.writeFileSync(briefPath, JSON.stringify({ slug, recipe: RECIPE, content: { prompt: prompt(t, h, c) }, format: "1:1", resolution: "1K" }));
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
