import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

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

function buildPrompt(input: DesignInput): string {
  const categorie = input.categorie || "bijouterie-mood";
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
  const photoStyle = categorie === "icelea-3d"
    ? `📐 ANGLE & FRAMING — Clean 3D CAD render preview :
- Camera at near eye-level with a slight downward tilt (~10-15° plunge).
- Ring laid flat horizontally.
- Slight 3/4 perspective showing the top decoration + inner oval on the right.
- The ring fills 80-95% of the frame width, well-centered.

🎯 BACKGROUND : Pure WHITE seamless studio background (#FFFFFF), no texture.

💡 LIGHTING : CAD-render studio lighting — soft HDRI environment with subtle multi-direction reflections to showcase facets and geometry.

✨ STYLE : Photorealistic CAD render, slightly idealized perfect geometry (like Rhino + KeyShot output), precise edges, no surface imperfections. Premium prototype look.`
    : categorie === "mood-joaillerie"
    ? `📐 ANGLE & FRAMING — Luxury jewelry editorial :
- Camera at near eye-level with a slight downward tilt (~10-15° plunge).
- Slight 3/4 perspective revealing the top decoration + inner oval.
- The ring fills 80-95% of the frame width.

🎯 BACKGROUND : Pure WHITE seamless (#FFFFFF), like Cartier / Van Cleef catalog.

💡 LIGHTING : Premium jewelry lighting — multi-direction soft fills to maximize gemstone fire and brilliance. Stones should sparkle with rainbow refractions.

✨ STYLE : Haute joaillerie photography, magazine cover quality, gemstone brilliance is the hero.`
    : categorie === "technocut"
    ? `📐 ANGLE & FRAMING — Architectural product shot :
- Camera at near eye-level with a slight downward tilt (~10-15° plunge).
- Slight 3/4 perspective revealing the cut-out geometry and openwork.
- The ring fills 80-95% of the frame width.

🎯 BACKGROUND : Pure WHITE seamless (#FFFFFF), no texture.

💡 LIGHTING : Clean directional studio light revealing the sharp geometric edges and cut-out shadows. Shadows inside the openwork should be visible to highlight the laser-cut precision.

✨ STYLE : Architectural / industrial design photography — emphasize the precision of cuts, openings, and geometric patterns.`
    : `📐 ANGLE & FRAMING — Mood signature catalog shot :
- Camera at near eye-level with a slight downward tilt (~10-15° plunge).
- Ring laid flat horizontally.
- Slight 3/4 perspective : decorated outer band visible on TOP, polished inner hole as horizontal OVAL on the right side.
- The ring fills 80-95% of the frame width, well-centered.

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
  const prompt = buildPrompt(body);

  // Construire les parts pour Gemini : croquis (si fourni) en premier, puis prompt
  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];
  if (sketch) {
    const m = sketch.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
  }
  parts.push({ text: prompt });

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
