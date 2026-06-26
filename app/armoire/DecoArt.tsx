"use client";

import React from "react";

/* Illustrations vectorielles des éléments déco (plantes, cadre, objets) —
   plus réalistes que des emojis, sans image externe ni coût. */

export function DecoArt({ kind, size = 120 }: { kind: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 100 100" } as const;
  switch (kind) {
    case "monstera":
      return (
        <svg {...common}>
          <path d="M46 96 L54 96 L57 64 L43 64 Z" fill="#c8743e" />
          <rect x="40" y="60" width="20" height="8" rx="2" fill="#b9652f" />
          <g stroke="#3f7d4f" strokeWidth="2" fill="#5aa06a">
            <path d="M50 64 C50 44 36 40 30 26 C44 30 50 40 50 50 C50 40 60 30 72 26 C66 42 50 46 50 64 Z" />
            <path d="M50 60 C40 50 26 52 18 46 C30 44 42 48 50 56 Z" />
            <path d="M50 58 C60 48 74 50 82 44 C70 42 58 46 50 54 Z" />
          </g>
          <g fill="#3f7d4f" opacity="0.6">
            <circle cx="44" cy="40" r="1.6" /><circle cx="56" cy="40" r="1.6" /><circle cx="38" cy="50" r="1.4" />
          </g>
        </svg>
      );
    case "olivier":
      return (
        <svg {...common}>
          <path d="M46 96 L54 96 L57 66 L43 66 Z" fill="#d9d2c4" />
          <rect x="41" y="62" width="18" height="7" rx="2" fill="#c9c0ae" />
          <line x1="50" y1="64" x2="50" y2="24" stroke="#7c6a4e" strokeWidth="3" />
          <g fill="#88a76f">
            <ellipse cx="40" cy="34" rx="6" ry="3" transform="rotate(-25 40 34)" />
            <ellipse cx="60" cy="34" rx="6" ry="3" transform="rotate(25 60 34)" />
            <ellipse cx="38" cy="46" rx="6" ry="3" transform="rotate(-20 38 46)" />
            <ellipse cx="62" cy="46" rx="6" ry="3" transform="rotate(20 62 46)" />
            <ellipse cx="50" cy="26" rx="6" ry="3" />
            <ellipse cx="44" cy="54" rx="5" ry="2.6" transform="rotate(-15 44 54)" />
            <ellipse cx="56" cy="54" rx="5" ry="2.6" transform="rotate(15 56 54)" />
          </g>
          <g fill="#5d6b46"><circle cx="42" cy="40" r="2" /><circle cx="58" cy="44" r="2" /><circle cx="50" cy="32" r="2" /></g>
        </svg>
      );
    case "pampa":
      return (
        <svg {...common}>
          <path d="M44 96 L56 96 L58 70 L42 70 Z" fill="#cdbfa6" />
          <g stroke="#caa46a" strokeWidth="2">
            <line x1="50" y1="70" x2="50" y2="20" /><line x1="50" y1="66" x2="36" y2="26" /><line x1="50" y1="66" x2="64" y2="26" />
          </g>
          <g fill="#e7d3ad">
            <ellipse cx="50" cy="20" rx="6" ry="14" /><ellipse cx="36" cy="26" rx="5" ry="12" transform="rotate(-18 36 26)" />
            <ellipse cx="64" cy="26" rx="5" ry="12" transform="rotate(18 64 26)" />
          </g>
        </svg>
      );
    case "hibiscus":
      return (
        <svg {...common}>
          <path d="M44 96 L56 96 L59 66 L41 66 Z" fill="#c8743e" />
          <rect x="39" y="62" width="22" height="7" rx="2" fill="#b9652f" />
          <path d="M50 64 C42 54 30 56 26 48 C40 48 46 52 50 58 C54 52 60 48 74 48 C70 56 58 54 50 64 Z" fill="#5aa06a" />
          <g>
            <g transform="translate(38,44)"><Flower /></g>
            <g transform="translate(60,40) scale(0.8)"><Flower /></g>
            <g transform="translate(50,52) scale(0.7)"><Flower /></g>
          </g>
        </svg>
      );
    case "succulente":
      return (
        <svg {...common}>
          <path d="M40 96 L60 96 L62 72 L38 72 Z" fill="#d8b58a" />
          <rect x="36" y="66" width="28" height="9" rx="2" fill="#caa476" />
          <g fill="#7fae7a" stroke="#5d8a59" strokeWidth="1">
            <ellipse cx="50" cy="52" rx="6" ry="14" /><ellipse cx="50" cy="52" rx="14" ry="6" />
            <ellipse cx="40" cy="46" rx="5" ry="10" transform="rotate(-40 40 46)" />
            <ellipse cx="60" cy="46" rx="5" ry="10" transform="rotate(40 60 46)" />
            <ellipse cx="42" cy="58" rx="5" ry="10" transform="rotate(-130 42 58)" />
            <ellipse cx="58" cy="58" rx="5" ry="10" transform="rotate(130 58 58)" />
          </g>
        </svg>
      );
    case "cadre":
      return (
        <svg {...common}>
          <rect x="22" y="18" width="56" height="64" rx="3" fill="#caa46a" />
          <rect x="28" y="24" width="44" height="52" rx="2" fill="#fbf6ee" />
          <path d="M28 70 L44 50 L54 62 L64 46 L72 60 L72 76 L28 76 Z" fill="#cfe0d6" />
          <circle cx="40" cy="38" r="5" fill="#f0d9a0" />
        </svg>
      );
    case "miroir":
      return (
        <svg {...common}>
          <ellipse cx="50" cy="50" rx="26" ry="34" fill="#e7c98f" />
          <ellipse cx="50" cy="50" rx="21" ry="29" fill="#dfeaf0" />
          <path d="M40 30 C50 36 54 50 50 70" stroke="#fff" strokeWidth="3" fill="none" opacity="0.7" />
        </svg>
      );
    case "lampe":
      return (
        <svg {...common}>
          <rect x="46" y="40" width="8" height="42" fill="#9c8b6e" />
          <rect x="36" y="78" width="28" height="6" rx="2" fill="#7c6a4e" />
          <path d="M34 40 L66 40 L60 18 L40 18 Z" fill="#f0e2b8" />
          <ellipse cx="50" cy="40" rx="16" ry="3" fill="#e7d29a" />
        </svg>
      );
    case "bougie":
      return (
        <svg {...common}>
          <rect x="40" y="46" width="20" height="38" rx="3" fill="#f2e6d2" />
          <rect x="48" y="36" width="4" height="10" fill="#d9c39a" />
          <path d="M50 24 C54 30 54 36 50 38 C46 36 46 30 50 24 Z" fill="#f4b740" />
          <path d="M50 28 C52 32 52 35 50 37 C48 35 48 32 50 28 Z" fill="#f47b20" />
        </svg>
      );
    default:
      return null;
  }
}

function Flower() {
  return (
    <g>
      <g fill="#c0364d">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-7" rx="4.5" ry="7" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle cx="0" cy="0" r="2.6" fill="#f0c64a" />
    </g>
  );
}
