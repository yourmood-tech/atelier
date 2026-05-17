import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-pro-image-preview";

export const maxDuration = 60;

type DesignInput = {
  sketch?: string | null;        // data URL image (optional)
  idea?: string | null;          // texte description libre
  largeur?: string | null;       // XS | S | L
  matiereBase?: string | null;   // acier-316L | titane-naturel | titane-noir | titane-bleu | titane-rose | titane-dore
  typeAddon?: string | null;     // lisse | pave-diamants | grave | pierre-centrale | libre
  matiereAddon?: string | null;  // acier | argent-925 | or-jaune-18k | or-rose-18k | or-blanc-18k | ceramique-noire | tantale | alu-couleur
  finitionAddon?: string | null; // poli-miroir | brosse | satine | martele
  format?: string | null;        // 1:1 | 3:2 | 4:5 | 9:16
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
  const largeur = input.largeur ? LARGEUR_LABELS[input.largeur] || input.largeur : "S medium (11mm width)";
  const base = input.matiereBase ? MATIERE_BASE_LABELS[input.matiereBase] || input.matiereBase : "polished 316L surgical steel";
  const addonType = input.typeAddon ? TYPE_ADDON_LABELS[input.typeAddon] || input.typeAddon : "smooth flat band addon";
  const addonMat = input.matiereAddon ? MATIERE_ADDON_LABELS[input.matiereAddon] || input.matiereAddon : "316L surgical steel";
  const finition = input.finitionAddon ? FINITION_LABELS[input.finitionAddon] || input.finitionAddon : "high-polish mirror finish";
  const idea = (input.idea && input.idea.trim()) || "(no extra description — follow the sketch + selectors strictly)";
  const sketchPresent = !!(input.sketch && input.sketch.trim());

  return `MOOD COLLECTION RING DESIGN VISUALIZATION — Generate a PHOTOREALISTIC catalog photo of a NEW Mood Collection ring design based on the sketch${sketchPresent ? " image provided" : ""} + the design specifications below. The output must look like a real professional jewelry photograph, indistinguishable from a studio shot of a finished ring.

═══════════════════════════════════════════════
DESIGN SPECIFICATIONS (must be respected exactly)
═══════════════════════════════════════════════

📐 RING WIDTH : ${largeur}.

🔩 BASE MATERIAL (the outer rails + interior of the ring) : ${base}.
The Mood base is the structural part of the ring. It has TWO polished metal rails (top and bottom edges of the band), and a central groove between them where the addon clips in.

💎 ADDON (the decorated central band that clips between the two rails) :
- Type: ${addonType}
- Material: ${addonMat}
- Finish: ${finition}

🎨 DESIGN IDEA (artist's intent — interpret faithfully) :
${idea}

${sketchPresent ? "🖼️ SKETCH REFERENCE (IMAGE 1) : The user provided a sketch / drawing of the intended design. Interpret it FAITHFULLY — respect the proportions, motifs, decorations, gemstone positions, and overall style of the sketch. The sketch is the PRIMARY visual reference for the addon decoration." : ""}

═══════════════════════════════════════════════
MOOD COLLECTION RING ANATOMY (NON-NEGOTIABLE)
═══════════════════════════════════════════════

The Mood ring is a patented INTERCHANGEABLE clip-on system. Every Mood ring has 3 components visible :

1. 🔩 BASE (steel 316L or titanium) — a structural ring with TWO polished metal rails on top and bottom edges of the band.
2. 🎯 ADDON — a separate decorated band that CLIPS into the central groove between the two rails of the base.
3. ✨ INTERIOR — the inner surface of the ring (visible through the hole). Color must MATCH the base material exterior. Anodized titanium = same color all around. Steel 316L = polished silver steel.

CRITICAL geometry rules :
- The addon fills the ENTIRE central groove between the two rails — no overflow beyond rails, no gaps between addon and rails.
- Addon and rails are FLUSH at the same surface height (no relief / no step / no shadow groove between addon and rail).
- Addon has UNIFORM width along the entire visible length.
- Upper rail width = lower rail width (mirror-symmetric, addon centered vertically on the band).
- Rails are ALWAYS nickel-mirror-polished (clean, flawless, specular highlights) regardless of base material.

═══════════════════════════════════════════════
PHOTOGRAPHY STYLE (Mood signature catalog shot)
═══════════════════════════════════════════════

📐 ANGLE & FRAMING :
- Camera at near eye-level with a slight downward tilt (~10-15° plunge).
- Ring laid flat horizontally on the (invisible) surface.
- Slight 3/4 perspective : the decorated outer band-surface visible on TOP (with slight foreshortening), the polished inner hole visible as a horizontal OVAL on the right side, a hint of the side profile visible at the front.
- The ring fills 80-95% of the frame width, well-centered.

🎯 BACKGROUND :
- Pure WHITE seamless catalog background (#FFFFFF), no texture, no gradient, no shadow on the surface.
- The ring's own 3D self-shadow (modeling the band's volume) is allowed and adds realism.

💡 LIGHTING :
- Soft diffused studio illumination from upper-left at ~45°.
- Gentle highlights on polished surfaces, soft gradient on curves.
- NO harsh hotspots, NO ringlight flat lighting, NO color casts. Clean even product light revealing every design detail.

✨ QUALITY :
- ULTRA HIGH RESOLUTION photoreal output.
- Gemstones (if any) : crystal-clear, brilliant sparkle, prong-setting visible, count exactly per spec or sketch.
- Polished metal : crisp specular reflections, smooth gradients, MIRROR-CLEAN nickel finish on rails.
- ZERO dust, ZERO fingerprints, ZERO scratches, ZERO trace marks.

═══════════════════════════════════════════════
ABSOLUTE BANS
═══════════════════════════════════════════════

- NO text, NO logo, NO watermark in the image.
- NO hands, NO human, NO mannequin holding the ring.
- NO scene props, NO leaves, NO water, NO fabric — just the ring on pure white.
- NO ring without addon (always show the COMPLETE Mood ring : base + addon clicked in).
- NO interior color that doesn't match the base material (anodized base = same color all around).
- NO simplification or generic ring design — the output must reflect the sketch + specifications precisely.

Output : ONE photoreal jewelry catalog image of the Mood ring design described above.`;
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
