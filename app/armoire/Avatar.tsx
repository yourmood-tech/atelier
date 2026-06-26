"use client";

import React from "react";

/* Avatar « mini-moi » — illustré en SVG (style sticker, plat).
   Zéro image, recolorable à l'infini, composable (les couches plates s'empilent).
   Vit dans la chambre et porte une bague mood à la main. */

export type AvatarConfig = {
  skin: string;
  hairColor: string;
  hairStyle: string; // long | bob | ponytail | bun | curly | pixie | straight | bangs
  eyes: string;
  outfit: string;
  glasses: string;   // none | round | square | sun
  freckles: boolean;
  ring: string;
};

export const AVATAR_SKINS = [
  { id: "porcelaine", v: "#f7ddd0" },
  { id: "clair", v: "#f0c9ab" },
  { id: "dore", v: "#e6b07f" },
  { id: "hale", v: "#cf9266" },
  { id: "caramel", v: "#a86b44" },
  { id: "ebene", v: "#7a4a30" },
];

export const AVATAR_HAIR_COLORS = [
  { id: "platine", v: "#e8e0cf" },
  { id: "blond", v: "#d9b066" },
  { id: "chatainclair", v: "#a8794e" },
  { id: "chatain", v: "#6e4327" },
  { id: "brun", v: "#3c2a1d" },
  { id: "noir", v: "#1d1a18" },
  { id: "auburn", v: "#8a3b22" },
  { id: "caramel", v: "#b07b45" },
  { id: "grisbleu", v: "#9fb0b8" },
  { id: "rose", v: "#e7a3c0" },
  { id: "violet", v: "#8a5bb0" },
];

export const AVATAR_HAIR_STYLES = [
  { id: "long", label: "Longs ondulés" },
  { id: "bob", label: "Carré" },
  { id: "ponytail", label: "Queue de cheval" },
  { id: "bun", label: "Chignon" },
  { id: "curly", label: "Bouclés" },
  { id: "pixie", label: "Court pixie" },
  { id: "straight", label: "Longs lisses" },
  { id: "bangs", label: "Frange" },
];

export const AVATAR_EYES = [
  { id: "brun", v: "#5a3b22" },
  { id: "noisette", v: "#8a6a3a" },
  { id: "vert", v: "#4f7a4a" },
  { id: "bleu", v: "#4a78a8" },
  { id: "gris", v: "#8a9098" },
  { id: "ambre", v: "#b07a2a" },
];

export const AVATAR_OUTFITS = [
  { id: "blanc", v: "#f1ece4" },
  { id: "blush", v: "#e7b6c0" },
  { id: "sauge", v: "#cdd9c5" },
  { id: "bleu", v: "#b9c9dc" },
  { id: "beige", v: "#e6c9a8" },
  { id: "lilas", v: "#d7c2e0" },
  { id: "encre", v: "#3a3330" },
];

export const AVATAR_GLASSES = [
  { id: "none", label: "Aucune" },
  { id: "round", label: "Rondes" },
  { id: "square", label: "Carrées" },
  { id: "sun", label: "Solaires" },
];

export const AVATAR_DEFAULT: AvatarConfig = {
  skin: "#f0c9ab",
  hairColor: "#6e4327",
  hairStyle: "long",
  eyes: "#5a3b22",
  outfit: "#e7b6c0",
  glasses: "none",
  freckles: false,
  ring: "#d8b04e",
};

export function Avatar({ config, style }: { config: AvatarConfig; style?: React.CSSProperties }) {
  const { skin, hairColor, hairStyle, eyes, outfit, glasses, freckles, ring } = config;
  const skinShadow = shade(skin, -18);
  const hairShadow = shade(hairColor, -22);
  const lip = "#c47b6e";

  return (
    <svg viewBox="0 0 200 270" style={{ width: "100%", height: "auto", display: "block", overflow: "visible", ...style }}>
      {/* ---------- CHEVEUX ARRIÈRE ---------- */}
      {hairStyle === "long" && <path d="M58 60 Q44 70 46 150 Q48 196 64 210 L136 210 Q152 196 154 150 Q156 70 142 60 Z" fill={hairColor} />}
      {hairStyle === "straight" && <path d="M60 60 L52 214 L148 214 L140 60 Z" fill={hairColor} />}
      {hairStyle === "bangs" && <path d="M58 60 Q46 80 50 170 L150 170 Q154 80 142 60 Z" fill={hairColor} />}
      {hairStyle === "bob" && <path d="M58 60 Q48 80 52 128 L148 128 Q152 80 142 60 Z" fill={hairColor} />}
      {hairStyle === "curly" && (
        <g fill={hairColor}>
          <circle cx="58" cy="70" r="18" /><circle cx="50" cy="100" r="17" /><circle cx="52" cy="130" r="16" />
          <circle cx="142" cy="70" r="18" /><circle cx="150" cy="100" r="17" /><circle cx="148" cy="130" r="16" />
          <circle cx="100" cy="48" r="20" />
        </g>
      )}
      {hairStyle === "ponytail" && <path d="M150 70 Q176 100 168 150 Q164 176 150 178 Q160 140 146 98 Z" fill={hairColor} />}

      {/* ---------- CORPS / TENUE ---------- */}
      <path d="M70 150 L130 150 Q150 160 158 270 L42 270 Q50 160 70 150 Z" fill={outfit} />
      <path d="M70 150 L130 150 Q132 168 100 172 Q68 168 70 150 Z" fill={shade(outfit, -12)} />

      {/* bras droit levé + main avec bagues près de la joue */}
      <path d="M132 158 Q156 150 150 110" stroke={skin} strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx="149" cy="104" r="10" fill={skin} />
      <circle cx="146" cy="112" r="3" fill={ring} stroke={shade(ring, -28)} strokeWidth="0.8" />
      <circle cx="153" cy="110" r="2.6" fill={shade(ring, 18)} stroke={shade(ring, -28)} strokeWidth="0.8" />

      {/* cou */}
      <rect x="88" y="124" width="24" height="22" rx="9" fill={skinShadow} />

      {/* ---------- TÊTE ---------- */}
      <ellipse cx="100" cy="90" rx="42" ry="46" fill={skin} />
      <circle cx="60" cy="94" r="7" fill={skin} />
      <circle cx="140" cy="94" r="7" fill={skin} />

      {/* sourcils */}
      <path d="M74 76 Q84 71 94 76" stroke={hairShadow} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M106 76 Q116 71 126 76" stroke={hairShadow} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* yeux */}
      <ellipse cx="84" cy="90" rx="6.5" ry="8" fill="#fff" />
      <ellipse cx="116" cy="90" rx="6.5" ry="8" fill="#fff" />
      <circle cx="84" cy="91" r="4.2" fill={eyes} />
      <circle cx="116" cy="91" r="4.2" fill={eyes} />
      <circle cx="84" cy="91" r="2" fill="#2a201b" />
      <circle cx="116" cy="91" r="2" fill="#2a201b" />
      <circle cx="85.6" cy="89" r="1" fill="#fff" />
      <circle cx="117.6" cy="89" r="1" fill="#fff" />

      {/* nez + joues + bouche */}
      <path d="M99 96 Q97 103 102 104" stroke={skinShadow} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="76" cy="103" r="5" fill="#f0a9a0" opacity="0.45" />
      <circle cx="124" cy="103" r="5" fill="#f0a9a0" opacity="0.45" />
      <path d="M90 112 Q100 120 110 112 Q100 116 90 112 Z" fill={lip} />

      {freckles && (
        <g fill={skinShadow} opacity="0.55">
          <circle cx="80" cy="104" r="0.9" /><circle cx="86" cy="107" r="0.9" /><circle cx="74" cy="108" r="0.9" />
          <circle cx="120" cy="104" r="0.9" /><circle cx="114" cy="107" r="0.9" /><circle cx="126" cy="108" r="0.9" />
        </g>
      )}

      {/* ---------- CHEVEUX AVANT ---------- */}
      {hairStyle === "long" && <path d="M58 84 Q56 50 100 48 Q144 50 142 84 Q132 60 100 62 Q68 60 58 84 Z" fill={hairColor} />}
      {hairStyle === "straight" && <path d="M58 82 Q58 48 100 48 Q142 48 142 82 Q132 58 100 60 Q68 58 58 82 Z" fill={hairColor} />}
      {hairStyle === "bob" && <path d="M58 84 Q56 50 100 50 Q144 50 142 84 Q132 60 100 60 Q68 60 58 84 Z" fill={hairColor} />}
      {hairStyle === "bangs" && <path d="M58 86 Q58 50 100 50 Q142 50 142 86 Q120 74 100 76 Q80 74 58 86 Z" fill={hairColor} />}
      {hairStyle === "curly" && <path d="M60 80 Q58 48 100 46 Q142 48 140 80 Q126 60 100 60 Q74 60 60 80 Z" fill={hairColor} />}
      {hairStyle === "ponytail" && (
        <>
          <path d="M62 78 Q64 50 100 50 Q136 50 138 78 Q120 62 100 63 Q80 62 62 78 Z" fill={hairColor} />
          <ellipse cx="100" cy="50" rx="40" ry="14" fill={hairColor} />
        </>
      )}
      {hairStyle === "bun" && (
        <>
          <circle cx="100" cy="40" r="13" fill={hairColor} />
          <path d="M62 80 Q64 52 100 52 Q136 52 138 80 Q120 64 100 65 Q80 64 62 80 Z" fill={hairColor} />
        </>
      )}
      {hairStyle === "pixie" && <path d="M58 88 Q54 48 100 48 Q146 48 142 88 Q140 64 118 60 Q126 74 108 70 Q112 60 96 62 Q80 60 58 88 Z" fill={hairColor} />}

      {/* ---------- LUNETTES ---------- */}
      {glasses !== "none" && (
        <g stroke={glasses === "sun" ? "#2a2622" : "#5a4a3a"} strokeWidth="2.4" fill={glasses === "sun" ? "#2a2622" : "none"} fillOpacity={glasses === "sun" ? 0.8 : 0}>
          {glasses === "round" && (<><circle cx="84" cy="91" r="11" /><circle cx="116" cy="91" r="11" /><path d="M95 91 H105" /></>)}
          {(glasses === "square" || glasses === "sun") && (<><rect x="72" y="82" width="24" height="18" rx="4" /><rect x="104" y="82" width="24" height="18" rx="4" /><path d="M96 88 H104" /></>)}
          <path d="M72 86 L62 84" /><path d="M128 86 L138 84" />
        </g>
      )}
    </svg>
  );
}

function shade(hex: string, amt: number): string {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
