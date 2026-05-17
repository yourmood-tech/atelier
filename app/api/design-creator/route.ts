import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

// Nuanciers émail Icelea — fichiers dans public/refs/email/
const EMAIL_NUANCIERS: { file: string; label: string }[] = [
  { file: "rb-01-80.jpg", label: "RB-01 to RB-80 : solid enamel colors (first batch)" },
  { file: "rb-81-160.jpg", label: "RB-81 to RB-160 : solid enamel colors (second batch)" },
  { file: "rb-161-240.jpg", label: "RB-161 to RB-240 : solid enamel colors (third batch)" },
  { file: "rp-pearl-glitter.jpg", label: "RP-01 to RP-40 : pearlescent/glitter enamel finishes" },
  { file: "rbf-motifs.jpg", label: "RBF-001 to RBF-072 : printed enamel motifs (animal prints, plaids, geometric)" },
];

function loadEmailNuanciers(): Array<{ inlineData: { mimeType: string; data: string } }> {
  const refs: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  for (const n of EMAIL_NUANCIERS) {
    const p = path.join(process.cwd(), "public", "refs", "email", n.file);
    if (!existsSync(p)) continue;
    try {
      const buf = readFileSync(p);
      refs.push({ inlineData: { mimeType: "image/jpeg", data: buf.toString("base64") } });
    } catch { /* skip */ }
  }
  return refs;
}

// Charge les PNG individuels des pastilles sélectionnées par l'utilisateur
// (cropés au centre de chaque pastille du nuancier — couleur isolée sans bruit)
function loadEmailPastilles(codesStr: string, maxCount = 8): Array<{ inlineData: { mimeType: string; data: string } }> {
  const codes = codesStr
    .split(/[,;\s]+/)
    .map(c => c.trim().toUpperCase())
    .filter(c => /^(RB|RP|RBF)-\d+$/.test(c))
    .slice(0, maxCount);
  const refs: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  for (const code of codes) {
    const p = path.join(process.cwd(), "public", "refs", "email", "pastilles", `${code}.png`);
    if (!existsSync(p)) continue;
    try {
      const buf = readFileSync(p);
      refs.push({ inlineData: { mimeType: "image/png", data: buf.toString("base64") } });
    } catch { /* skip */ }
  }
  return refs;
}

// Nombre de refs disponibles par finition et format (sélection random)
const FINITION_REFS_COUNT: Record<string, number> = {
  "poli": 11, "mat": 6, "froisse": 11, "glitter": 3,
};
const FORMAT_REFS_COUNT: Record<string, number> = {
  "addon": 6, "deux-tiers": 4, "medium": 3, "mini": 11, "base-large": 13, "base-small": 9, "base-xs": 3,
};

function loadFinitionRef(finition: string): { inlineData: { mimeType: string; data: string } } | null {
  const count = FINITION_REFS_COUNT[finition] || 0;
  if (!count) return null;
  const idx = Math.floor(Math.random() * count) + 1;
  const p = path.join(process.cwd(), "public", "refs", "finitions", finition, `${finition}-${idx}.jpg`);
  if (!existsSync(p)) return null;
  try {
    const buf = readFileSync(p);
    return { inlineData: { mimeType: "image/jpeg", data: buf.toString("base64") } };
  } catch { return null; }
}

function loadFormatRef(format: string): { inlineData: { mimeType: string; data: string } } | null {
  const count = FORMAT_REFS_COUNT[format] || 0;
  if (!count) return null;
  const idx = Math.floor(Math.random() * count) + 1;
  const p = path.join(process.cwd(), "public", "refs", "formats", format, `${format}-${idx}.jpg`);
  if (!existsSync(p)) return null;
  try {
    const buf = readFileSync(p);
    return { inlineData: { mimeType: "image/jpeg", data: buf.toString("base64") } };
  } catch { return null; }
}

const EMAIL_BORD_REFS_COUNT: Record<string, number> = { "avec": 5, "sans": 14, "base": 2 };

function loadEmailBordRef(bord: string): { inlineData: { mimeType: string; data: string } } | null {
  const count = EMAIL_BORD_REFS_COUNT[bord] || 0;
  if (!count) return null;
  const idx = Math.floor(Math.random() * count) + 1;
  const p = path.join(process.cwd(), "public", "refs", "email-bord", bord, `${bord}-${idx}.jpg`);
  if (!existsSync(p)) return null;
  try {
    const buf = readFileSync(p);
    return { inlineData: { mimeType: "image/jpeg", data: buf.toString("base64") } };
  } catch { return null; }
}

// Canvas templates pour mode "transform" email — un par combo (structure, format)
// Structure : avec / sans / base — pour bases, le canvas est unique (pas de variante avec/sans)
const EMAIL_CANVAS_FILES: Record<string, string> = {
  // Addons avec bord argent (canal émail entre 2 rails)
  "avec-addon": "avec-addon.jpg",
  "avec-deux-tiers": "avec-deux-tiers.jpg",
  "avec-medium": "avec-medium.jpg",
  "avec-mini": "avec-mini.jpg",
  // Addons sans bord (full enamel coverage)
  "sans-addon": "sans-addon.jpg",
  "sans-deux-tiers": "sans-deux-tiers.jpg",
  "sans-medium": "sans-medium.jpg",
  "sans-mini": "sans-mini.jpg",
  // Bases : style propre (2 bandes émail sur rails + centre céramique)
  "base-base-large": "base-large.png",
  "base-base-small": "base-small.png",
  "base-base-xs": "base-xs.png",
};

function loadEmailCanvas(structure: string, format: string): { inlineData: { mimeType: string; data: string } } | null {
  // Pour les bases : on prefixe avec "base-" pour la map
  const isBase = format === "base-large" || format === "base-small" || format === "base-xs";
  const key = isBase ? `base-${format}` : `${structure}-${format}`;
  const file = EMAIL_CANVAS_FILES[key];
  if (!file) return null;
  const p = path.join(process.cwd(), "public", "refs", "email-canvas", file);
  if (!existsSync(p)) return null;
  try {
    const buf = readFileSync(p);
    const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";
    return { inlineData: { mimeType: mime, data: buf.toString("base64") } };
  } catch { return null; }
}

function buildEmailTransformPrompt(structure: string, emailCodes: string, idea: string, format: string): string {
  const fmtLabel = ICELEA_FORMAT_LABELS[format] || format;
  const structureDesc = structure === "avec"
    ? `a Mood addon in the '${format}' format with TWO thin polished silver rails on top and bottom edges framing a central enamel channel (Mood signature addon style)`
    : structure === "sans"
    ? `a Mood ring in the '${format}' format with full enamel coverage edge-to-edge (no visible polished rails on the exterior)`
    : `a Mood BASE in the '${format}' format with two colored enamel stripes on its two rails (and a central element between the stripes)`;

  return `MOOD COLLECTION ENAMEL COLOR TRANSFORM — Take THIS EXACT RING from the attached image (IMAGE 1) and CHANGE ONLY THE ENAMEL COLOR. Nothing else.

🚨🚨🚨 CRITICAL INSTRUCTION 🚨🚨🚨
NE CHANGE RIEN AU FORMAT DE LA BAGUE.
DO NOT change the ring's format, shape, structure, proportions, rails, silhouette, angle, or any other visual element.
The ONLY change allowed is the COLOR of the enamel.
Treat this as a pixel-precise color-replacement task : isolate the enamel zone and recolor it. Keep every other pixel identical to the source image.

The ring in the attached image is ${structureDesc}.

🎨 NEW ENAMEL COLOR(S) : ${emailCodes}

🎯 EXACT COLOR REFERENCES ATTACHED : the images attached AFTER the source ring (IMAGE 1) are ISOLATED COLOR SWATCHES — one per selected code. Each swatch shows the EXACT color/pattern as it appears on the real Mood enamel sample. The order of the swatches matches the order of the codes listed above.

🚨 COLOR MATCHING RULES (CRITICAL — Gemini tends to drift the hue, force exact match) :
- Sample the color DIRECTLY from the attached swatch images. Do NOT interpret, do NOT shift the hue/saturation/brightness.
- The output enamel color MUST match the swatch IDENTICALLY — same hue, same saturation, same brightness, same finish (glossy/pearlescent/patterned).
- If the swatch is a deep saturated color, the output must be EXACTLY that depth — NOT lighter, NOT darker.
- For RP-* (pearlescent) : keep the sparkle / metallic sheen.
- For RBF-* (patterned) : reproduce the EXACT motif (animal print, plaid, geometric).
- For RB-* (solid) : a uniform pure flat color, glossy, identical to the swatch.

═══════════════════════════════════════════════
ABSOLUTE PRESERVATION RULES (NE CHANGE RIEN, EVERYTHING STAYS IDENTICAL)
═══════════════════════════════════════════════

- 🚨 METAL RAILS (polished silver borders) : EXACTLY as shown — same width, same shine, same placement, same thickness, same edges.
- 🚨 RING SHAPE / SILHOUETTE / PROPORTIONS : IDENTICAL pixel-by-pixel to the source.
- 🚨 RING FORMAT : IDENTICAL. NE CHANGE RIEN AU FORMAT DE LA BAGUE.
- 🚨 PHOTOGRAPHIC STYLE : same lighting, same background, same angle, same framing, same depth of field, same shadows.
- 🚨 INTERIOR of the ring : stays polished silver as shown.
- 🚨 RING ORIENTATION : keep the exact same orientation as the source image (standing upright, opening to the right, etc.).
- 🚨 ENAMEL TEXTURE : adapt to match the new code's type :
  • RB-* (solid colors) → glossy smooth solid enamel
  • RP-* (pearlescent) → pearlescent / glitter sparkle texture
  • RBF-* (patterns) → printed motif pattern (animal print, plaid, geometric)

═══════════════════════════════════════════════
ARTIST'S DESIGN IDEA (secondary context — DOES NOT override format preservation)
═══════════════════════════════════════════════
${idea || "(no additional idea — just change the enamel color, nothing else)"}

⚠️ Even if the idea mentions other elements, IGNORE THEM. The ONLY allowed change is the enamel color. Format, shape, rails, structure — all stay identical.

═══════════════════════════════════════════════
ABSOLUTE BANS
═══════════════════════════════════════════════
- NO text, NO logo, NO watermark in the output.
- NO hands, NO human.
- ⛔ NO changes to the ring's format, shape, structure, rails, or proportions.
- ⛔ NO changes to the photographic style, angle, lighting, or background.
- ⛔ NO reinterpretation — strictly a color swap.

Output : the SAME ring with the new enamel color applied. Pixel-identical to source EXCEPT for the enamel color.`;
}

type IceleaData = {
  materiau?: string | null;        // argent | acier | ceramique | autre
  materiauAutre?: string | null;
  format?: string | null;          // base-large | base-small | base-xs | addon | open-mood | deux-tiers | medium | mini
  decorations?: string[] | null;   // 3d | email | zircons | pvd | autre (multi)
  decorationAutre?: string | null;
  finitionArgent?: string | null;  // poli | matt | glitter | froisse | autre-fin
  finitionArgentAutre?: string | null;
  emailCodes?: string | null;      // ex: "RB-013, RB-067, RP-22, RBF-008"
  emailBord?: string | null;       // "avec" | "sans" — uniquement si email FULL revêtement (sans zircons/PVD)
  pvdColors?: string[] | null;     // ex: ["18K Rose Gold", "Royal Blue", "Rainbow"]
};

type DesignInput = {
  categorie?: string | null;     // icelea-3d | bijouterie-mood | mood-joaillerie | technocut
  withBase?: string | null;      // "avec" | "sans"
  sketch?: string | null;        // data URL image (optional)
  idea?: string | null;          // texte description libre
  largeur?: string | null;       // XS | S | L
  matiereBase?: string | null;   // acier-316L | titane-naturel | titane-noir | titane-bleu | titane-rose | titane-dore
  typeAddon?: string | null;     // lisse | pave-diamants | grave | pierre-centrale | libre
  matiereAddon?: string | null;  // acier | argent-925 | or-jaune-18k | or-rose-18k | or-blanc-18k | ceramique-noire | tantale | alu-couleur
  finitionAddon?: string | null; // poli-miroir | brosse | satine | martele
  format?: string | null;        // 1:1 | 3:2 | 4:5 | 9:16
  icelea?: IceleaData | null;
};

const ICELEA_MATERIAU_LABELS: Record<string, string> = {
  "argent": "925 sterling silver (warm silver tone, classic jewelry-grade)",
  "acier": "316L surgical stainless steel (silver mirror-polished, durable)",
  "ceramique": "high-tech ceramic (typically black or white, unscratchable, slightly velvety finish)",
};

const ICELEA_FORMAT_LABELS: Record<string, string> = {
  "base-large": "🚨 BASE LARGE — A MOOD BASE STANDALONE (13mm wide, THE WIDEST base). This is NOT a finished ring — it's the BASE COMPONENT alone, like a U-shaped channel ring. Structure : TWO polished metal rails on the top and bottom edges + a CENTRAL GROOVE between them that is EMPTY / RECESSED / HOLLOW (the groove is visible as a recess where an addon WOULD clip but DOES NOT — render the groove EMPTY and visible). The band profile looks like a small spool or pulley : two raised side flanges with a recessed central channel. ⛔ DO NOT add a decorated central addon — the groove must remain EMPTY and VISIBLE so the structural function is clear. Width : 13mm — substantial bold band.\n\n📊 ASCII PROFILE :\n```\n┃━━━━━━━━━━━┃     ← TOP RAIL (polished mirror)\n┃░░░░░░░░░░░┃     ← CENTRAL GROOVE (EMPTY, recessed, visible)\n┃━━━━━━━━━━━┃     ← BOTTOM RAIL (polished mirror)\n```",
  "base-small": "🚨 BASE SMALL — A MOOD BASE STANDALONE (11mm wide, MEDIUM base). Same structure as base-large but medium thickness : TWO polished rails on edges + EMPTY central groove visible between them. ⛔ DO NOT show an addon clipped inside the groove — the groove must be EMPTY and VISIBLE. Width : 11mm.\n\n📊 ASCII PROFILE : same as base-large but ~15% narrower band.",
  "base-xs": "🚨 BASE EXTRA-SMALL — A MOOD BASE STANDALONE (9mm wide, THE NARROWEST base). Slim elegant version : TWO thin polished rails + EMPTY central groove visible. ⛔ DO NOT show an addon clipped inside. The groove is empty/visible. Width : 9mm — refined fine band.\n\n📊 ASCII PROFILE : same structure as base-large but visibly slimmer (about 70% of base-large width).",
  "addon": "🚨 ADDON STANDALONE (7mm wide) — Render the ADDON ALONE on its own. NO BASE, NO RAILS, NO FLANKING METAL STRIPS. The addon is a SINGLE DECORATED BAND of ~7mm width. ⛔ DO NOT add polished rails. ⛔ DO NOT add a base structure. ⛔ DO NOT make it look like medium (2.3mm) or open mood (10mm). The addon visual signature is a MEDIUM-WIDE band (~7mm) shown as a standalone ring with the decoration as its primary surface.",
  "open-mood": "OPEN MOOD (10mm wide) — the WIDEST band (~10mm). The ring is OPEN with a visible GAP / SPLIT — the band does NOT close into a full circle. C-shape or split silhouette. Width signature : 10mm — bold, the widest format.",
  "deux-tiers": "DEUX TIERS / TWO-THIRDS (4.6mm wide) — a slim partial ring (~4.6mm width) covering only ~2/3 of the finger circumference. The BACK of the ring (below the finger) is OPEN. Width signature : 4.6mm — slim. Visual : open-back band, horseshoe shape from above.",
  "medium": "MEDIUM (2.3mm wide) — a VERY THIN delicate band (~2.3mm). NOT a standard-width band — this is a fine narrow ring profile. Width signature : 2.3mm — very thin. ⛔ DO NOT confuse with addon (7mm) — medium is MUCH thinner.",
  "mini": "MINI (~1.5mm wide) — the THINNEST band, ultra-fine. Even thinner than medium. Like a delicate stacking ring or a fine wire band. Width signature : the thinnest profile of all Mood formats.",
};

const ICELEA_DECO_LABELS: Record<string, string> = {
  "3d": "3D SCULPTED FORM — the band itself has dimensional sculpted shape (relief, curves, sculpted volume, not a flat surface)",
  "email": "ENAMEL COATING — colored enamel layer applied to the band surface (smooth glossy finish, jewelry-grade enameling)",
  "zircons": "ZIRCON GEMSTONE SETTING — small/medium cubic zirconia stones set into the band (sparkling, brilliant cut)",
  "pvd": "PVD COATING — physical vapor deposition coating that colors the surface (durable colored finish: gold, rose gold, black, blue, rainbow, etc.)",
};

const ICELEA_FINITION_LABELS: Record<string, string> = {
  "poli": "MIRROR-POLISHED finish (high-shine specular reflections, smooth)",
  "matt": "MATT finish (uniform soft matte surface, NO shine, NO reflections, velvety appearance)",
  "glitter": "GLITTER / SNOWFLAKE finish ('neige éternelle' Mood) — fine sparkling micro-crystalline texture across the entire surface, like frosted snow catching light, micro-pearl particles embedded in the metal, subtle sparkle uniform across the band",
  "froisse": "MOOD 'FROISSÉ' finish — DO NOT interpret as crumpled paper. The Mood 'froissé' is a FINE VERTICAL BRUSHED TEXTURE : ultra-thin parallel hairline striations running PERPENDICULAR to the band length (i.e., across the band's width), creating a delicate hand-brushed metal aesthetic. The surface has a soft satin sheen, with very fine micro-grooves catching the light in subtle vertical streaks. Refined, artisan, slightly directional reflective look — NOT chaotic, NOT crumpled, NOT crinkled, NOT papier-mâché. Think of finely-brushed dark steel watch bezels or premium titanium finish. Refer to the attached reference image for the exact look.",
  "brosse": "BRUSHED finish (fine parallel matte striations along the band length, soft satin look)",
  "satine": "SATIN finish (smooth matte with soft silky sheen, uniform low-gloss)",
  "martele": "HAMMERED finish (faceted texture with small irregular planes catching light, artisan beaten-metal look)",
};

const CATEGORIE_INTROS: Record<string, string> = {
  "icelea-3d": "🖥️ CATEGORY : ICELEA 3D DEVELOPMENT RENDER — This is a CAD-style 3D rendered prototype visualization, the kind a jewelry developer would produce before manufacturing. Clean, technical, photorealistic CAD rendering style with very precise edges, perfect geometry, slightly idealized surfaces. Like a Rhino + KeyShot render or Matrix CAD jewelry preview. The lighting should be studio-clean to showcase every facet and geometric detail. The aesthetic is precision + premium prototype, NOT a worn-in artisan piece.",
  "bijouterie-mood": "🔨 CATEGORY : MOOD INTERNAL JEWELRY WORKSHOP — This is a piece handcrafted in the Mood internal workshop. Real-feel artisan jewelry photograph with a sense of handmade quality, slight organic warmth, visible fine craftsmanship. The metalwork has the precision of skilled goldsmith work but retains a human touch (not the perfect machined look of CAD). Studio jewelry photography style, the kind a small high-end atelier would produce.",
  "mood-joaillerie": "💍 CATEGORY : MOOD JOAILLERIE HIGH-END — This is fine high-jewelry, the prestige line. Premium stones (diamonds, sapphires, emeralds, rubies, fine colored gems) with master-quality prong setting, exquisite craftsmanship, like Cartier / Van Cleef / Bulgari level. The photograph should feel like a luxury campaign — flawless brilliance, gemstone fire and clarity, sublime light play. This is the high-jewelry tier of Mood Collection.",
  "technocut": "⚙️ CATEGORY : TECHNOCUT — Stainless steel laser-cut design. Sharp geometric lines, precise CNC / laser cut openings, mechanical-industrial-precision aesthetic. The decoration is born from technical cutting work (perforations, geometric shapes, openwork lattice, etched lines) rather than gem-setting or hand-engraving. Cool, modern, architectural feel. Polished steel surface with crisp edges from the cutting process.",
};

const LARGEUR_LABELS: Record<string, string> = {
  "XS": "XS extra-fine (9mm width)",
  "S": "S medium (11mm width)",
  "L": "L large (13mm width)",
};

const MATIERE_BASE_LABELS: Record<string, string> = {
  "acier-316L": "polished 316L surgical steel (silver mirror finish — neutral steel base, INTERIOR is polished silver steel)",
  "titane-naturel": "natural brushed titanium (gunmetal silver-gray — INTERIOR is the same titanium color)",
  "titane-noir": "anodized BLACK titanium (deep matte black — INTERIOR is also anodized BLACK, same color all around)",
  "titane-bleu": "anodized DEEP ROYAL BLUE titanium — INTERIOR is also anodized BLUE, same color all around",
  "titane-rose": "anodized SOFT PINK / DUSTY ROSE titanium — INTERIOR is also anodized PINK, same color all around",
  "titane-dore": "anodized WARM GOLD titanium — INTERIOR is also anodized GOLD, same color all around",
};

const TYPE_ADDON_LABELS: Record<string, string> = {
  "lisse": "smooth flat band addon — uniform polished surface, no decoration, no setting",
  "pave-diamants": "pavé-set diamond addon — multiple small brilliant-cut diamonds set tightly across the central band surface (count the diamonds clearly, prong-setting visible, sparkling)",
  "grave": "engraved/textured addon — fine surface engraving (geometric pattern, organic motif, or signature texture per sketch/idea)",
  "pierre-centrale": "central single gemstone addon — one prominent stone (round brilliant or other cut per idea) set at the center, polished band on each side of the stone",
  "libre": "addon design per sketch + description (artist's intent — respect the visual idea provided)",
};

const MATIERE_ADDON_LABELS: Record<string, string> = {
  "acier": "316L surgical steel (silver mirror finish)",
  "argent-925": "sterling silver 925 (warm silver tone)",
  "or-jaune-18k": "18K yellow gold (warm rich gold tone)",
  "or-rose-18k": "18K rose gold (warm pink gold tone)",
  "or-blanc-18k": "18K white gold (cool platinum-like silver tone)",
  "ceramique-noire": "high-tech BLACK ceramic (deep matte black, unscratchable, slightly velvety finish)",
  "tantale": "tantalum metal (rare deep blue-gray tone, slightly darker than steel)",
  "alu-couleur": "anodized colored aluminum (per the idea — light, vivid color)",
};

const FINITION_LABELS: Record<string, string> = {
  "poli-miroir": "high-polish mirror finish (specular reflections, brilliant)",
  "brosse": "brushed finish (fine parallel matte striations)",
  "satine": "satin finish (smooth matte, soft sheen)",
  "martele": "hammered finish (faceted texture with small irregular planes catching light)",
};

function buildIceleaPrompt(input: DesignInput): string {
  const icelea = input.icelea || {};
  const matKey = icelea.materiau || "argent";
  const matLabel = matKey === "autre" && icelea.materiauAutre
    ? `${icelea.materiauAutre} (per artist's specification)`
    : ICELEA_MATERIAU_LABELS[matKey] || matKey;

  const fmtLabel = icelea.format ? ICELEA_FORMAT_LABELS[icelea.format] || icelea.format : ICELEA_FORMAT_LABELS["base-large"];
  const isAddonOnly = icelea.format === "addon";

  const decos = (icelea.decorations || []) as string[];
  const decoLabels = decos
    .map(d => d === "autre" && icelea.decorationAutre ? `- OTHER : ${icelea.decorationAutre}` : `- ${ICELEA_DECO_LABELS[d] || d}`)
    .join("\n");

  // Section émail : si "email" coché et codes fournis, instructions Gemini pour lire le nuancier
  let emailSection = "";
  if (decos.includes("email") && icelea.emailCodes) {
    emailSection = `\n\n🎨 ENAMEL COLOR REFERENCE (CRITICAL — match the user's exact selection) :
The user selected the following enamel codes from the Icelea Mood reference charts (provided as IMAGE references in this request) :
${icelea.emailCodes}

INSTRUCTIONS :
- The reference images attached to this request are the OFFICIAL Icelea enamel color charts used by Mood Collection.
- Identify each code listed above on the appropriate chart (RB-* = solid colors charts, RP-* = pearlescent/glitter chart, RBF-* = printed motif chart).
- Reproduce those EXACT colors and motifs on the ring's enamel surface.
- If multiple codes are listed → combine them on the band (e.g. zones of different colors, alternating segments, or a multi-color composition as per the artist's idea).
- The enamel finish should be glossy and smooth, jewelry-grade, like the references show.
- DO NOT invent enamel colors. STRICTLY use what's visible on the charts for the listed codes.`;
  } else if (decos.includes("email") && !icelea.emailCodes) {
    emailSection = "\n\n🎨 ENAMEL : applied to the band but no specific codes provided — choose a tasteful color that fits the artist's idea.";
  }

  // Structure email selon format et toggle
  const emailFullCoat = decos.includes("email") && !decos.includes("zircons") && !decos.includes("pvd");
  const isBaseFmt = icelea.format === "base-large" || icelea.format === "base-small" || icelea.format === "base-xs";
  if (emailFullCoat && isBaseFmt) {
    emailSection += "\n\n💎 STRUCTURE — BASE WITH ENAMEL STRIPES (Mood base signature) : this is a Mood BASE (not an addon), and the enamel is applied as TWO DISTINCT COLORED STRIPES on the TWO RAILS of the base (one stripe on the top rail, one stripe on the bottom rail). Between the two enamel stripes there is a CENTRAL GROOVE (the addon-receiving groove, typically rendered with a ceramic-white or polished metal fill). The enamel is NOT a continuous coverage — it's specifically on the two rails of the base. An attached reference image shows this exact base-with-enamel-stripes structure.";
  } else if (emailFullCoat && icelea.emailBord === "avec") {
    emailSection += "\n\n💍 STRUCTURE — ADDON WITH SILVER BORDER (Mood signature) : the addon has TWO THIN POLISHED SILVER RAILS visible on the top and bottom edges of the band, framing the enamel zone in the center. The enamel sits in the central groove between the two mirror-polished thin rails. This is the classic Mood addon structure. An attached reference image shows this exact structure.";
  } else if (emailFullCoat && icelea.emailBord === "sans") {
    emailSection += "\n\n🌊 STRUCTURE — ADDON WITHOUT SILVER BORDER (full enamel coverage) : the enamel covers the ENTIRE outer surface of the addon from edge to edge. NO polished rails visible on the outside. The interior of the ring (inside the hole) remains polished silver. An attached reference image shows this exact full-coverage structure.";
  }

  // Section PVD : couleurs sélectionnées dans la palette PVD Icelea
  let pvdSection = "";
  if (decos.includes("pvd")) {
    const pvdList = icelea.pvdColors || [];
    if (pvdList.length === 0) {
      pvdSection = "\n\n🌈 PVD COATING : applied but no specific color selected — choose a tasteful PVD finish.";
    } else if (pvdList.length === 1) {
      pvdSection = `\n\n🌈 PVD COATING : ${pvdList[0]}. Apply a uniform PVD coating in this exact color/finish to the metal surface.`;
    } else {
      pvdSection = `\n\n🌈 PVD COATING (MULTIPLE COLORS — combine elegantly) : ${pvdList.join(", ")}.
The user wants several PVD colors on the same ring. Combine them in a creative tasteful way : alternating segments, color blocks, gradient transitions, or zones — interpret the artist's idea to decide. Each color should be clearly identifiable and represent the actual PVD finish (deep saturated colors typical of physical vapor deposition coatings).`;
    }
  }

  // Matériau neutre sans revêtement (tout matériau) → finition appliquée
  const aRevetement = decos.includes("email") || decos.includes("pvd") || decos.includes("zircons");
  const finitionDispo = !!matKey && !aRevetement;
  let finitionSection = "";
  if (finitionDispo) {
    const finKey = icelea.finitionArgent || "poli";
    const finLabel = finKey === "autre-fin" && icelea.finitionArgentAutre
      ? `${icelea.finitionArgentAutre} finish (custom)`
      : ICELEA_FINITION_LABELS[finKey] || finKey;
    const matName = matKey === "autre" ? "material" : matKey;
    finitionSection = `\n💫 ${matName.toUpperCase()} FINISH (neutral material, no coating) : ${finLabel}.`;
  }

  const idea = (input.idea && input.idea.trim()) || "(no extra description — follow the sketch + selectors strictly)";
  const sketchPresent = !!(input.sketch && input.sketch.trim());

  return `ICELEA 3D DEVELOPMENT RENDER — Generate a PHOTOREALISTIC CAD-style 3D rendered preview of a Mood Collection ring design for the Icelea jewelry developer. This is a PROTOTYPE VISUALIZATION used to validate the design before manufacturing. Style : clean technical CAD render (like Rhino + KeyShot or Matrix Gold output), perfect geometry, premium prototype look.

═══════════════════════════════════════════════
ICELEA SPECIFICATIONS
═══════════════════════════════════════════════

🔩 MATERIAL : ${matLabel}.

📏 FORMAT : ${fmtLabel}.

✨ DECORATIONS / SURFACE TREATMENT (combine all of the following) :
${decoLabels || "- (none specified — clean plain band)"}${finitionSection}${emailSection}${pvdSection}

🎨 DESIGN IDEA (artist's intent — interpret faithfully, RESPECT EVERY DETAIL) :
${idea}

🚨 COLOR INSTRUCTION (CRITICAL) : if the idea above mentions a specific color (e.g. "noir", "rouge", "bleu marine", "vert sapin", "doré"), apply that EXACT color to the metal surface — even if the base material is "argent" or "acier", the FINAL color must match what the artist asked. For example : "acier noir" = black-coated stainless steel (matte/brushed black surface, like PVD black coating). Never default to the bare material color when a specific color is mentioned in the idea.

${sketchPresent ? "🖼️ SKETCH REFERENCE (IMAGE 1) : The user provided a sketch / drawing of the intended design. Interpret it FAITHFULLY — respect proportions, motifs, decorations, gemstone positions, and overall style. The sketch is the PRIMARY visual reference." : ""}

═══════════════════════════════════════════════
${isAddonOnly ? "ADDON-ONLY ANATOMY (no base, no rails)" : "MOOD RING ANATOMY"}
═══════════════════════════════════════════════

${isAddonOnly
    ? "This is the ADDON ONLY — a single decorated ring band, standalone, no base, no flanking rails. Show only the addon as a complete decorated ring with the decoration as its primary surface. Interior of the ring is polished smooth (silver tone)."
    : `The Mood ring is a patented INTERCHANGEABLE clip-on system. The BASE is the structural component with two polished rails (top/bottom of the band) and a central groove where the addon clips in.

CRITICAL geometry rules :
- TWO rails on top and bottom edges of the band, ALWAYS nickel-mirror-polished (specular highlights, clean).
- Central groove between rails where the addon decoration sits.
- Addon FLUSH with rails at the same height (no relief, no step).
- Addon uniform width along the entire visible length.
- Interior of the ring is polished smooth, color-matched to the base material.`}

═══════════════════════════════════════════════
PHOTOGRAPHY STYLE — CAD RENDER PREVIEW
═══════════════════════════════════════════════

📐 ANGLE & FRAMING — 🚨 RING STANDING UPRIGHT (NOT laying flat) :
- The ring is STANDING UPRIGHT ON ITS EDGE on the (invisible) surface — like a wedding band on a jewelry display, vertical orientation. The ring's circular axis is HORIZONTAL : opening faces toward the right side of the frame.
- Camera at near eye-level with a slight downward tilt (~5-15° plunge).
- Slight 3/4 perspective : the decorated outer surface of the band is visible on the LEFT-FRONT (facing the camera), the polished inner hole visible on the RIGHT as a soft oval opening.
- The ring fills 80-95% of the frame width, well-centered.
- ⛔ DO NOT lay the ring flat horizontally. The ring MUST be standing upright on its bottom edge.

🎯 BACKGROUND : Pure WHITE seamless studio background (#FFFFFF), no texture, no gradient.

💡 LIGHTING : CAD-render studio lighting — soft HDRI environment, subtle multi-direction reflections that showcase facets, gemstones, and geometric details. Clean and bright, like a Rhino + KeyShot premium render.

✨ STYLE : Photorealistic CAD render, slightly idealized perfect geometry, precise edges, no surface imperfections (no scratches, dust, fingerprints). The aesthetic is precision + premium prototype, NOT a worn-in artisan piece.

✨ QUALITY :
- ULTRA HIGH RESOLUTION photoreal output.
- Gemstones (if any) : crystal-clear, brilliant sparkle, prong/bezel setting visible.
- Polished metal : crisp specular reflections, smooth gradients.

═══════════════════════════════════════════════
ABSOLUTE BANS
═══════════════════════════════════════════════

- NO text, NO logo, NO watermark in the image.
- NO hands, NO human, NO mannequin holding the ring.
- NO scene props, NO leaves, NO water, NO fabric — just the ring on pure white.
- NO simplification or generic ring design — the output must reflect the sketch + specifications precisely.
${isAddonOnly ? "- NO base, NO rails — the addon is standalone." : ""}

Output : ONE photoreal CAD-render preview of the Icelea ring design described above.`;
}

function buildPrompt(input: DesignInput): string {
  const categorie = input.categorie || "bijouterie-mood";

  // Si Icelea avec données spécifiques → prompt dédié
  if (categorie === "icelea-3d" && input.icelea) {
    return buildIceleaPrompt(input);
  }

  const catIntro = CATEGORIE_INTROS[categorie] || CATEGORIE_INTROS["bijouterie-mood"];
  const withBase = input.withBase !== "sans"; // default = avec base
  const largeur = input.largeur ? LARGEUR_LABELS[input.largeur] || input.largeur : "S medium (11mm width)";
  const base = input.matiereBase ? MATIERE_BASE_LABELS[input.matiereBase] || input.matiereBase : "polished 316L surgical steel";
  const addonType = input.typeAddon ? TYPE_ADDON_LABELS[input.typeAddon] || input.typeAddon : "smooth flat band addon";
  const addonMat = input.matiereAddon ? MATIERE_ADDON_LABELS[input.matiereAddon] || input.matiereAddon : "316L surgical steel";
  const finition = input.finitionAddon ? FINITION_LABELS[input.finitionAddon] || input.finitionAddon : "high-polish mirror finish";
  const idea = (input.idea && input.idea.trim()) || "(no extra description — follow the sketch + selectors strictly)";
  const sketchPresent = !!(input.sketch && input.sketch.trim());

  // === Section catégorie ===
  const sectionCategorie = `═══════════════════════════════════════════════
DESIGN CATEGORY
═══════════════════════════════════════════════

${catIntro}`;

  // === Section spécifications (varie selon avec/sans base) ===
  const sectionBase = withBase
    ? `📐 RING WIDTH : ${largeur}.

🔩 BASE MATERIAL (the outer rails + interior of the ring) : ${base}.
The Mood base is the structural part of the ring. It has TWO polished metal rails (top and bottom edges of the band), and a central groove between them where the addon clips in.`
    : `🚨 NO BASE MODE — Render the ADDON ALONE as a standalone decorated band/ring. There are NO rails, NO outer base structure flanking the addon. The addon stands on its own as a complete decorated ring.

📏 The addon's width is the full ring width (no flanking rails).
🎯 Focus 100% of the visual attention on the addon's decoration, surface, gemstones, and craftsmanship.`;

  const sectionAddon = `💎 ${withBase ? "ADDON (the decorated central band that clips between the two rails)" : "ADDON (standalone — no base, no rails)"} :
- Type: ${addonType}
- Material: ${addonMat}
- Finish: ${finition}

🎨 DESIGN IDEA (artist's intent — interpret faithfully) :
${idea}

${sketchPresent ? "🖼️ SKETCH REFERENCE (IMAGE 1) : The user provided a sketch / drawing of the intended design. Interpret it FAITHFULLY — respect the proportions, motifs, decorations, gemstone positions, and overall style of the sketch. The sketch is the PRIMARY visual reference for the decoration." : ""}`;

  // === Section anatomie (varie) ===
  const sectionAnatomie = withBase
    ? `═══════════════════════════════════════════════
MOOD COLLECTION RING ANATOMY (NON-NEGOTIABLE)
═══════════════════════════════════════════════

The Mood ring is a patented INTERCHANGEABLE clip-on system. Every complete Mood ring has 3 components visible :

1. 🔩 BASE (steel 316L or titanium) — a structural ring with TWO polished metal rails on top and bottom edges of the band.
2. 🎯 ADDON — a separate decorated band that CLIPS into the central groove between the two rails of the base.
3. ✨ INTERIOR — the inner surface of the ring (visible through the hole). Color must MATCH the base material exterior. Anodized titanium = same color all around. Steel 316L = polished silver steel.

CRITICAL geometry rules :
- The addon fills the ENTIRE central groove between the two rails — no overflow beyond rails, no gaps between addon and rails.
- Addon and rails are FLUSH at the same surface height (no relief / no step / no shadow groove between addon and rail).
- Addon has UNIFORM width along the entire visible length.
- Upper rail width = lower rail width (mirror-symmetric, addon centered vertically on the band).
- Rails are ALWAYS nickel-mirror-polished (clean, flawless, specular highlights) regardless of base material.`
    : `═══════════════════════════════════════════════
STANDALONE ADDON ANATOMY (NO BASE)
═══════════════════════════════════════════════

This is the ADDON ONLY — a single decorated ring band, no base, no flanking rails.

- The band is a clean continuous ring with the decoration as its primary surface.
- No rails on top or bottom — just the decorated band itself, from one outer edge to the other.
- Interior of the ring : polished smooth (silver or material-matching).
- Show the decoration in PRIORITY — gemstones, engraving, texture, pattern must dominate the visual.`;

  // === Section photo style (selon catégorie) ===
  const standUprightInstr = `📐 ANGLE & FRAMING — 🚨 RING STANDING UPRIGHT ON ITS EDGE (NOT lying flat) :
- The ring is STANDING UPRIGHT vertically on its bottom edge, like a wedding band on a jewelry display.
- Camera at near eye-level with a slight downward tilt (~5-15° plunge).
- 3/4 perspective : decorated outer surface visible on the LEFT-FRONT (facing camera), polished inner hole visible on the RIGHT as a soft oval opening.
- The ring fills 80-95% of the frame width, well-centered.
- ⛔ DO NOT lay the ring flat horizontally. ⛔ DO NOT show only the top of the ring.\n`;

  const photoStyle = categorie === "icelea-3d"
    ? `${standUprightInstr}
🎯 BACKGROUND : Pure WHITE seamless studio background (#FFFFFF), no texture.

💡 LIGHTING : CAD-render studio lighting — soft HDRI environment with subtle multi-direction reflections to showcase facets and geometry.

✨ STYLE : Photorealistic CAD render, slightly idealized perfect geometry (like Rhino + KeyShot output), precise edges, no surface imperfections. Premium prototype look.`
    : categorie === "mood-joaillerie"
    ? `${standUprightInstr}
🎯 BACKGROUND : Pure WHITE seamless (#FFFFFF), like Cartier / Van Cleef catalog.

💡 LIGHTING : Premium jewelry lighting — multi-direction soft fills to maximize gemstone fire and brilliance. Stones should sparkle with rainbow refractions.

✨ STYLE : Haute joaillerie photography, magazine cover quality, gemstone brilliance is the hero.`
    : categorie === "technocut"
    ? `${standUprightInstr}
🎯 BACKGROUND : Pure WHITE seamless (#FFFFFF), no texture.

💡 LIGHTING : Clean directional studio light revealing the sharp geometric edges and cut-out shadows. Shadows inside the openwork should be visible to highlight the laser-cut precision.

✨ STYLE : Architectural / industrial design photography — emphasize the precision of cuts, openings, and geometric patterns.`
    : `${standUprightInstr}
🎯 BACKGROUND : Pure WHITE seamless catalog background (#FFFFFF), no texture.

💡 LIGHTING : Soft diffused studio illumination from upper-left at ~45°. Gentle highlights, soft gradients.

✨ STYLE : Real-feel artisan jewelry photography with handmade warmth, fine craftsmanship visible.`;

  const sectionPhoto = `═══════════════════════════════════════════════
PHOTOGRAPHY STYLE
═══════════════════════════════════════════════

${photoStyle}

✨ QUALITY :
- ULTRA HIGH RESOLUTION photoreal output.
- Gemstones (if any) : crystal-clear, brilliant sparkle, prong-setting visible, count exactly per spec or sketch.
- Polished metal : crisp specular reflections, smooth gradients.
- ZERO dust, ZERO fingerprints, ZERO scratches, ZERO trace marks.`;

  // === Section bans ===
  const sectionBans = `═══════════════════════════════════════════════
ABSOLUTE BANS
═══════════════════════════════════════════════

- NO text, NO logo, NO watermark in the image.
- NO hands, NO human, NO mannequin holding the ring.
- NO scene props, NO leaves, NO water, NO fabric — just the ring on pure white.
${withBase ? "- NO ring without addon (always show the COMPLETE Mood ring : base + addon clicked in).\n- NO interior color that doesn't match the base material (anodized base = same color all around)." : "- NO base, NO rails — the addon is standalone, render it as a single decorated band."}
- NO simplification or generic ring design — the output must reflect the sketch + specifications precisely.

Output : ONE photoreal image of the design described above.`;

  return `MOOD COLLECTION RING DESIGN VISUALIZATION — Generate a PHOTOREALISTIC catalog photo of a NEW Mood Collection ring design based on the sketch${sketchPresent ? " image provided" : ""} + the design specifications below. The output must look like a real professional jewelry photograph, indistinguishable from a studio shot of a finished ring.

${sectionCategorie}

═══════════════════════════════════════════════
DESIGN SPECIFICATIONS (must be respected exactly)
═══════════════════════════════════════════════

${sectionBase}

${sectionAddon}

${sectionAnatomie}

${sectionPhoto}

${sectionBans}`;
}

export async function POST(req: Request) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY manquante côté serveur" }, { status: 500 });
  }

  let body: DesignInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const idea = (body.idea || "").trim();
  const sketch = body.sketch || null;
  if (!idea && !sketch) {
    return NextResponse.json({ error: "Donne au moins une idée écrite OU un croquis" }, { status: 400 });
  }

  const format = (body.format && /^\d+:\d+$/.test(body.format)) ? body.format : "1:1";

  // === Mode TRANSFORM email : si Icelea + email coché (full coat) + couleur précise spécifiée
  // → on utilise un canvas template comme source et on demande à Gemini de changer juste la couleur
  // Limité aux formats avec canvas dispo : addon / deux-tiers / medium / mini / base-large/small/xs
  let useEmailTransform = false;
  let emailTransformStructure: string | null = null;
  if (body.categorie === "icelea-3d" && body.icelea?.decorations?.includes("email") && body.icelea.emailCodes?.trim()) {
    const decosT = body.icelea.decorations || [];
    const emailFullCoatT = !decosT.includes("zircons") && !decosT.includes("pvd");
    const fmtT = body.icelea.format || "";
    const isBaseT = fmtT === "base-large" || fmtT === "base-small" || fmtT === "base-xs";
    const isFormatWithCanvas = ["addon", "deux-tiers", "medium", "mini"].includes(fmtT) || isBaseT;
    if (emailFullCoatT && isFormatWithCanvas) {
      emailTransformStructure = isBaseT ? "base" : (body.icelea.emailBord || "avec");
      useEmailTransform = true;
    }
  }

  const prompt = useEmailTransform && emailTransformStructure
    ? buildEmailTransformPrompt(emailTransformStructure, body.icelea!.emailCodes!, body.idea || "", body.icelea?.format || "addon")
    : buildPrompt(body);

  // Construire les parts pour Gemini : croquis + refs finition + ref format + nuanciers émail + prompt
  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

  // Mode TRANSFORM email : canvas en PREMIER (IMAGE 1 — la bague à transformer)
  if (useEmailTransform && emailTransformStructure) {
    const fmtCanvas = body.icelea?.format || "addon";
    const canvas = loadEmailCanvas(emailTransformStructure, fmtCanvas);
    if (canvas) parts.push(canvas);
  }

  if (sketch) {
    const m = sketch.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
  }
  // Icelea : refs finition + format (1 chacune, random parmi le pool disponible)
  let finitionRefAdded = false;
  let formatRefAdded = false;
  if (!useEmailTransform && body.categorie === "icelea-3d" && body.icelea) {
    const decos = body.icelea.decorations || [];
    const aRevetement = decos.includes("email") || decos.includes("pvd") || decos.includes("zircons");
    if (!aRevetement && body.icelea.finitionArgent && body.icelea.finitionArgent !== "autre-fin") {
      const refF = loadFinitionRef(body.icelea.finitionArgent);
      if (refF) { parts.push(refF); finitionRefAdded = true; }
    }
    if (body.icelea.format) {
      const refFmt = loadFormatRef(body.icelea.format);
      if (refFmt) { parts.push(refFmt); formatRefAdded = true; }
    }
  }
  // Icelea + email coché → joindre les nuanciers comme refs visuelles
  let emailBordRefAdded: string | null = null;
  if (!useEmailTransform && body.categorie === "icelea-3d" && body.icelea?.decorations?.includes("email")) {
    // Ref structure email selon format ET toggle utilisateur
    const decosE = body.icelea.decorations || [];
    const emailFullCoatE = !decosE.includes("zircons") && !decosE.includes("pvd");
    const fmtE = body.icelea.format || "";
    const isBase = fmtE === "base-large" || fmtE === "base-small" || fmtE === "base-xs";
    if (emailFullCoatE) {
      // Si format = base → utiliser ref "base" (style 2 bandes émail sur les rails)
      // Sinon utiliser le toggle avec/sans bord
      const bordChoice = isBase ? "base" : (body.icelea.emailBord || "avec");
      const refBord = loadEmailBordRef(bordChoice);
      if (refBord) { parts.push(refBord); emailBordRefAdded = bordChoice; }
    }
    // Nuanciers émail
    const nuanciers = loadEmailNuanciers();
    for (const n of nuanciers) parts.push(n);
  }

  // En mode transform email : joindre les PASTILLES INDIVIDUELLES (couleur isolée, max 8)
  // PLUS PRÉCIS que les nuanciers entiers qui ont du bruit autour de chaque couleur
  if (useEmailTransform && body.icelea?.emailCodes) {
    const pastilles = loadEmailPastilles(body.icelea.emailCodes);
    for (const p of pastilles) parts.push(p);
  }

  // Ajouter un préfixe au prompt pour indiquer les refs visuelles ajoutées
  let refPreamble = "";
  if (finitionRefAdded || formatRefAdded) {
    refPreamble = "\n\n🖼️ VISUAL REFERENCES PROVIDED IN THIS REQUEST (CRITICAL — match the look) :\n";
    if (sketch) refPreamble += "- The FIRST attached image is the USER'S SKETCH/DRAWING of the design intent.\n";
    if (finitionRefAdded) refPreamble += `- One of the attached reference images shows a REAL MOOD RING with the EXACT '${body.icelea?.finitionArgent}' FINISH the user wants. Replicate this texture/surface treatment faithfully (look at how light interacts with the material, the micro-texture, the reflections).\n`;
    if (formatRefAdded) {
      const fmt = body.icelea?.format;
      refPreamble += `- One of the attached reference images shows a REAL MOOD RING in the '${fmt}' FORMAT the user wants. Match the proportions, structure, and silhouette of this format reference EXACTLY. Do not output a different format — if user asked '${fmt}' do not deliver 'medium' or any other format.\n`;
      if (fmt === "addon") {
        refPreamble += `🚨 FORMAT ADDON STANDALONE (7mm width) : the reference shows an addon ALONE (no base, no rails). Reproduce exactly this : a single decorated band ~7mm wide, NO flanking polished rails, NO outer base structure.\n`;
      }
      if (fmt === "open-mood") refPreamble += `🚨 OPEN MOOD (10mm width — the WIDEST format) : the ring has a VISIBLE GAP / SPLIT. The band is BOLD and WIDE (10mm). Show the opening explicitly.\n`;
      if (fmt === "deux-tiers") refPreamble += `🚨 DEUX TIERS (4.6mm width — slim) : the ring is OPEN AT THE BACK (partial ring, only covers ~2/3 of the finger). Band is slim (~4.6mm).\n`;
      if (fmt === "medium") refPreamble += `🚨 MEDIUM (2.3mm width — VERY THIN) : a delicate fine band, NOT a standard width. Width is only 2.3mm — narrow elegant profile.\n`;
      if (fmt === "mini") refPreamble += `🚨 MINI (the thinnest, ~1.5mm) : ULTRA-FINE delicate band, even thinner than medium.\n`;
      if (fmt === "base-large") refPreamble += `🚨 BASE LARGE STANDALONE (13mm) : render the BASE COMPONENT ALONE with EMPTY central groove VISIBLE. ⛔ NO addon clipped inside the groove. ⛔ NOT a complete ring. Just the U-shaped base : 2 rails + empty central channel. Notably wider than base-small/xs.\n`;
      if (fmt === "base-small") refPreamble += `🚨 BASE SMALL STANDALONE (11mm) : render the BASE COMPONENT ALONE with EMPTY central groove VISIBLE. ⛔ NO addon inside. Medium thickness, narrower than base-large.\n`;
      if (fmt === "base-xs") refPreamble += `🚨 BASE XS STANDALONE (9mm) : render the BASE COMPONENT ALONE with EMPTY central groove VISIBLE. ⛔ NO addon inside. Slim elegant, the narrowest base.\n`;
    }
    if (emailBordRefAdded === "avec") refPreamble += `- One of the attached reference images shows the EXACT 'WITH SILVER BORDER' addon structure (Mood classic : an addon with a colored enamel channel between two thin polished silver rails on top and bottom edges of the band). Reproduce this structural framing exactly : a clearly visible polished silver border framing the enamel zone.\n`;
    if (emailBordRefAdded === "sans") refPreamble += `- One of the attached reference images shows the EXACT 'WITHOUT SILVER BORDER' addon structure (full enamel coverage, no visible rails on the exterior — enamel covers edge-to-edge). Reproduce this structural design exactly.\n`;
    if (emailBordRefAdded === "base") refPreamble += `- One of the attached reference images shows the EXACT Mood BASE with enamel structure : the BASE has TWO COLORED ENAMEL STRIPES on its two rails (one enamel band on each side of the band), framing a central groove (typically ceramic or open). NOT a continuous enamel coating — two distinct enamel bands separated by a structural middle zone. Reproduce this exact structural design.\n`;
    refPreamble += "These references show how Mood Collection actually produces these designs in real life — match the photographic style, material rendering, and structural proportions.\n";
  } else if (emailBordRefAdded) {
    // Cas où finition/format pas activés mais bord email l'est
    refPreamble = "\n\n🖼️ VISUAL REFERENCE PROVIDED IN THIS REQUEST (CRITICAL — match the structure) :\n";
    if (emailBordRefAdded === "avec") refPreamble += `- An attached reference image shows the EXACT 'WITH SILVER BORDER' addon structure (enamel between two thin polished silver rails). Reproduce this structural framing exactly.\n`;
    if (emailBordRefAdded === "sans") refPreamble += `- An attached reference image shows the EXACT 'WITHOUT SILVER BORDER' addon structure (full enamel coverage, no visible rails). Reproduce this structural design exactly.\n`;
    if (emailBordRefAdded === "base") refPreamble += `- An attached reference image shows the EXACT Mood BASE-with-enamel structure : TWO colored enamel stripes on the two rails of the base, separated by a central structural zone. Reproduce this exact design.\n`;
  }
  parts.push({ text: prompt + refPreamble });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: format, imageSize: "2K" },
        },
      }),
    });
    const respText = await r.text();
    let respData: { candidates?: Array<{ content?: { parts?: unknown[] }; finishReason?: string }>; promptFeedback?: { blockReason?: string }; error?: { message?: string } };
    try {
      respData = JSON.parse(respText);
    } catch {
      return NextResponse.json({ error: `Réponse Gemini non-JSON (HTTP ${r.status}): ${respText.slice(0, 200)}` }, { status: 502 });
    }
    if (!r.ok) {
      const msg = respData?.error?.message || JSON.stringify(respData).slice(0, 300);
      return NextResponse.json({ error: `Gemini ${r.status}: ${msg}` }, { status: 502 });
    }
    const candidate = respData?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      return NextResponse.json({ error: `Gemini a refusé (finishReason: ${candidate.finishReason}). Reformule l'idée ou change le croquis.` }, { status: 502 });
    }
    if (respData?.promptFeedback?.blockReason) {
      return NextResponse.json({ error: `Image bloquée par les filtres (${respData.promptFeedback.blockReason}).` }, { status: 502 });
    }
    const partsOut = (candidate?.content?.parts || []) as Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
    const imagePart = partsOut.find(p => p.inlineData?.mimeType?.startsWith?.("image/"));
    if (!imagePart?.inlineData?.data) {
      const textPart = partsOut.find(p => p.text);
      const msg = textPart?.text ? `Gemini a répondu par texte au lieu d'image : « ${textPart.text.slice(0, 150)} »` : "Pas d'image en sortie.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    return NextResponse.json({ image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
