// Génère 6 moodailles placeholder (SVG) + le manifest. À REMPLACER par les vraies
// images d'Amila (même format manifest : {id, nom, img, rarete}).
import fs from "node:fs";
import path from "node:path";

const OUT = "/Users/amila/YourRender/atelier/public/moodailles";
fs.mkdirSync(OUT, { recursive: true });

const SET = [
  { id: "rose", nom: "Cœur rose", rarete: "commune", c1: "#f6c0d0", c2: "#e98aa9", motif: "♥" },
  { id: "or", nom: "Soleil d'or", rarete: "commune", c1: "#f6e3a8", c2: "#d8b04e", motif: "✸" },
  { id: "saphir", nom: "Saphir", rarete: "rare", c1: "#bcd2ec", c2: "#5b86c4", motif: "◆" },
  { id: "emeraude", nom: "Émeraude", rarete: "rare", c1: "#bfe3c8", c2: "#5fae79", motif: "❖" },
  { id: "amethyste", nom: "Améthyste", rarete: "epique", c1: "#dcc8ee", c2: "#9a6fc4", motif: "✦" },
  { id: "perle", nom: "Perle nacrée", rarete: "epique", c1: "#f3eee8", c2: "#cdbfae", motif: "○" },
];

function svg({ c1, c2, motif }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="g" cx="38%" cy="32%" r="75%">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="50" fill="url(#g)" stroke="#fff" stroke-width="4"/>
  <circle cx="60" cy="60" r="50" fill="none" stroke="${c2}" stroke-width="1.5" opacity="0.5"/>
  <text x="60" y="74" font-size="44" text-anchor="middle" fill="#fff" opacity="0.92" font-family="Arial">${motif}</text>
  <circle cx="44" cy="40" r="5" fill="#fff" opacity="0.6"/>
</svg>`;
}

const manifest = { moodailles: [] };
for (const m of SET) {
  fs.writeFileSync(path.join(OUT, `${m.id}.svg`), svg(m));
  manifest.moodailles.push({ id: m.id, nom: m.nom, img: `/moodailles/${m.id}.svg`, rarete: m.rarete });
}
fs.writeFileSync(path.join(OUT, "moodailles.json"), JSON.stringify(manifest, null, 2));
console.log(`${SET.length} moodailles placeholder + manifest écrits dans ${OUT}`);
