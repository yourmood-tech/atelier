"use client";

import React from "react";

/* Avatar « mini-moi » — illustration vectorielle élégante (style éditorial, adulte).
   Zéro image, recolorable à l'infini. Dégradés de peau/cheveux, yeux en amande,
   lèvres dessinées. Vit dans la chambre et porte une bague mood. */

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
  { id: "porcelaine", v: "#f6dccf" },
  { id: "clair", v: "#efc8aa" },
  { id: "dore", v: "#e3ad7d" },
  { id: "hale", v: "#cd9064" },
  { id: "caramel", v: "#a86b44" },
  { id: "ebene", v: "#7a4a30" },
];

export const AVATAR_HAIR_COLORS = [
  { id: "platine", v: "#e3d9c4" },
  { id: "blond", v: "#cda35a" },
  { id: "chatainclair", v: "#a8794e" },
  { id: "chatain", v: "#6e4327" },
  { id: "brun", v: "#3c2a1d" },
  { id: "noir", v: "#221d1a" },
  { id: "auburn", v: "#8a3b22" },
  { id: "caramel", v: "#b07b45" },
  { id: "grisbleu", v: "#9fb0b8" },
  { id: "rose", v: "#e29ebb" },
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
  skin: "#efc8aa",
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
  const uid = React.useId().replace(/[:]/g, "");
  const skinLight = shade(skin, 16);
  const skinShadow = shade(skin, -20);
  const hairLight = shade(hairColor, 34);
  const hairShadow = shade(hairColor, -26);
  const lipUp = "#b9776c";
  const lipLow = "#cf8d80";
  const lash = "#3a2a26";

  const FACE = "M100 46 C76 46 60 64 60 94 C60 124 78 150 100 152 C122 150 140 124 140 94 C140 64 124 46 100 46 Z";

  return (
    <svg viewBox="0 0 200 285" style={{ width: "100%", height: "auto", display: "block", overflow: "visible", ...style }}>
      <defs>
        <radialGradient id={`sk${uid}`} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={skinLight} />
          <stop offset="72%" stopColor={skin} />
          <stop offset="100%" stopColor={skinShadow} />
        </radialGradient>
        <linearGradient id={`ha${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hairLight} />
          <stop offset="55%" stopColor={hairColor} />
          <stop offset="100%" stopColor={hairShadow} />
        </linearGradient>
        <linearGradient id={`ou${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(outfit, 10)} />
          <stop offset="100%" stopColor={shade(outfit, -14)} />
        </linearGradient>
      </defs>

      {/* ---------- CHEVEUX ARRIÈRE ---------- */}
      {hairStyle === "long" && <path d="M60 66 C42 78 44 168 60 214 C70 240 130 240 140 214 C156 168 158 78 140 66 Z" fill={`url(#ha${uid})`} />}
      {hairStyle === "straight" && <path d="M62 64 C54 120 56 200 64 224 L136 224 C144 200 146 120 138 64 Z" fill={`url(#ha${uid})`} />}
      {hairStyle === "bangs" && <path d="M60 64 C46 92 50 170 58 188 L142 188 C150 170 154 92 140 64 Z" fill={`url(#ha${uid})`} />}
      {hairStyle === "bob" && <path d="M60 64 C50 92 54 138 60 150 L140 150 C146 138 150 92 140 64 Z" fill={`url(#ha${uid})`} />}
      {hairStyle === "curly" && (
        <g fill={`url(#ha${uid})`}>
          <circle cx="58" cy="74" r="17" /><circle cx="50" cy="104" r="16" /><circle cx="54" cy="134" r="15" /><circle cx="64" cy="158" r="14" />
          <circle cx="142" cy="74" r="17" /><circle cx="150" cy="104" r="16" /><circle cx="146" cy="134" r="15" /><circle cx="136" cy="158" r="14" />
          <circle cx="100" cy="50" r="19" />
        </g>
      )}
      {hairStyle === "ponytail" && <path d="M138 70 C172 96 168 160 150 188 C146 196 140 196 140 188 C150 150 140 104 130 84 Z" fill={`url(#ha${uid})`} />}

      {/* ---------- CORPS / TENUE ---------- */}
      <path d="M74 158 C70 156 66 158 64 164 C56 188 50 240 48 285 L152 285 C150 240 144 188 136 164 C134 158 130 156 126 158 C120 172 80 172 74 158 Z" fill={`url(#ou${uid})`} />
      <path d="M78 156 C84 170 116 170 122 156 C124 170 116 178 100 179 C84 178 76 170 78 156 Z" fill={shade(outfit, -16)} opacity="0.7" />

      {/* bras droit levé, main fine + bagues près de la joue */}
      <path d="M128 162 C152 156 150 120 146 104" stroke={skin} strokeWidth="11" fill="none" strokeLinecap="round" />
      <ellipse cx="145" cy="99" rx="8" ry="9" fill={skinLight} />
      <circle cx="142" cy="106" r="2.7" fill={ring} stroke={shade(ring, -28)} strokeWidth="0.7" />
      <circle cx="148" cy="104" r="2.3" fill={shade(ring, 20)} stroke={shade(ring, -28)} strokeWidth="0.7" />

      {/* cou élancé + ombre */}
      <path d="M90 138 L90 160 C90 168 110 168 110 160 L110 138 Z" fill={skin} />
      <path d="M90 138 C90 150 110 150 110 138 C110 146 90 146 90 138 Z" fill={skinShadow} opacity="0.55" />

      {/* ---------- VISAGE ---------- */}
      <path d={FACE} fill={`url(#sk${uid})`} />
      <ellipse cx="60" cy="98" rx="6" ry="8" fill={skin} />
      <ellipse cx="140" cy="98" rx="6" ry="8" fill={skin} />

      {/* joues (blush discret) */}
      <ellipse cx="76" cy="110" rx="8" ry="5" fill="#e89a90" opacity="0.28" />
      <ellipse cx="124" cy="110" rx="8" ry="5" fill="#e89a90" opacity="0.28" />

      {/* sourcils fins et arqués */}
      <path d="M74 84 Q84 79 94 83" stroke={hairShadow} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M106 83 Q116 79 126 84" stroke={hairShadow} strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* yeux en amande */}
      {[84, 116].map((cx, i) => (
        <g key={i}>
          <path d={`M${cx - 9} 95 Q${cx} 88 ${cx + 9} 95 Q${cx} 100 ${cx - 9} 95 Z`} fill="#fdfbf9" />
          <circle cx={cx} cy={94.5} r="4.4" fill={eyes} />
          <circle cx={cx} cy={94.5} r="2" fill="#241c18" />
          <circle cx={cx + 1.5} cy={92.8} r="1" fill="#fff" />
          {/* trait de cil supérieur + cils externes */}
          <path d={`M${cx - 9} 95 Q${cx} 88 ${cx + 9} 95`} stroke={lash} strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d={`M${cx + 8} 93 q3 -1 4 -3`} stroke={lash} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* nez subtil */}
      <path d="M99 98 C97 106 96 110 100 112" stroke={skinShadow} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="97" cy="112" rx="1.4" ry="1" fill={skinShadow} opacity="0.5" />
      <ellipse cx="103" cy="112" rx="1.4" ry="1" fill={skinShadow} opacity="0.5" />

      {/* lèvres dessinées */}
      <path d="M90 121 Q95 117 100 119 Q105 117 110 121 Q100 123 90 121 Z" fill={lipUp} />
      <path d="M90 121 Q100 130 110 121 Q100 125 90 121 Z" fill={lipLow} />
      <path d="M90 121 Q100 123 110 121" stroke={shade(lipUp, -18)} strokeWidth="0.8" fill="none" />

      {freckles && (
        <g fill={skinShadow} opacity="0.5">
          <circle cx="80" cy="108" r="0.9" /><circle cx="86" cy="111" r="0.9" /><circle cx="74" cy="112" r="0.8" />
          <circle cx="120" cy="108" r="0.9" /><circle cx="114" cy="111" r="0.9" /><circle cx="126" cy="112" r="0.8" />
          <circle cx="100" cy="113" r="0.8" />
        </g>
      )}

      {/* ---------- CHEVEUX AVANT + mèches lumineuses ---------- */}
      <g>
        {hairStyle === "long" && <path d="M58 92 C56 52 100 44 100 44 C100 44 144 52 142 92 C132 64 100 60 100 60 C100 60 68 64 58 92 Z" fill={`url(#ha${uid})`} />}
        {hairStyle === "straight" && <path d="M58 92 C58 50 100 46 100 46 C100 46 142 50 142 92 C130 62 100 60 100 60 C100 60 70 62 58 92 Z" fill={`url(#ha${uid})`} />}
        {hairStyle === "bob" && <path d="M58 94 C56 52 100 46 100 46 C100 46 144 52 142 94 C132 62 100 60 100 60 C100 60 68 62 58 94 Z" fill={`url(#ha${uid})`} />}
        {hairStyle === "bangs" && <path d="M58 96 C58 52 100 46 100 46 C100 46 142 52 142 96 C120 80 100 82 100 82 C100 82 80 80 58 96 Z" fill={`url(#ha${uid})`} />}
        {hairStyle === "curly" && <path d="M60 88 C58 50 100 44 100 44 C100 44 142 50 140 88 C126 64 100 62 100 62 C100 62 74 64 60 88 Z" fill={`url(#ha${uid})`} />}
        {hairStyle === "ponytail" && (
          <>
            <ellipse cx="100" cy="52" rx="42" ry="15" fill={`url(#ha${uid})`} />
            <path d="M62 86 C64 54 100 50 100 50 C100 50 136 54 138 86 C120 66 100 64 100 64 C100 64 80 66 62 86 Z" fill={`url(#ha${uid})`} />
          </>
        )}
        {hairStyle === "bun" && (
          <>
            <circle cx="100" cy="40" r="13" fill={`url(#ha${uid})`} />
            <circle cx="100" cy="40" r="13" fill="none" stroke={hairShadow} strokeWidth="1.2" opacity="0.5" />
            <path d="M62 86 C64 56 100 52 100 52 C100 52 136 56 138 86 C120 68 100 66 100 66 C100 66 80 68 62 86 Z" fill={`url(#ha${uid})`} />
          </>
        )}
        {hairStyle === "pixie" && <path d="M58 96 C54 50 100 46 100 46 C146 46 142 96 142 96 C140 68 118 64 118 64 C124 76 108 72 108 72 C112 62 96 64 96 64 C80 62 58 96 58 96 Z" fill={`url(#ha${uid})`} />}
        {/* mèches lumineuses */}
        {hairStyle !== "bun" && hairStyle !== "pixie" && (
          <g stroke={hairLight} strokeWidth="1.6" fill="none" opacity="0.6" strokeLinecap="round">
            <path d="M72 64 C66 100 66 150 74 188" />
            <path d="M128 64 C134 100 134 150 126 188" />
          </g>
        )}
      </g>

      {/* ---------- LUNETTES ---------- */}
      {glasses !== "none" && (
        <g stroke={glasses === "sun" ? "#2a2622" : "#5a4a3a"} strokeWidth="2.2" fill={glasses === "sun" ? "#2a2622" : "none"} fillOpacity={glasses === "sun" ? 0.78 : 0}>
          {glasses === "round" && (<><circle cx="84" cy="95" r="11" /><circle cx="116" cy="95" r="11" /><path d="M95 95 H105" /></>)}
          {(glasses === "square" || glasses === "sun") && (<><rect x="72" y="86" width="24" height="17" rx="4" /><rect x="104" y="86" width="24" height="17" rx="4" /><path d="M96 91 H104" /></>)}
          <path d="M73 90 L62 88" /><path d="M127 90 L138 88" />
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
