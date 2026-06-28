"use client";

import React, { useRef, useState } from "react";
import { SEPT_DIFFS } from "@/lib/armoire-catalog";

/* Jeu des 7 différences mood. La cliente clique les écarts entre les 2 images.
   Tout est côté écran ; le gain de moodaille est déclenché par onWin() quand les 7 sont trouvées. */

const ASPECT = 747 / 1000; // ratio hauteur/largeur de l'image
const IMG_A = "/jeux/7diff/a.png";
const IMG_B = "/jeux/7diff/b.png";
const ENCRE = "#3a3330";

export function SeptDifferences({ onWin, onReset }: { onWin?: () => void; onReset?: () => void }) {
  const [found, setFound] = useState<string[]>([]);
  const [miss, setMiss] = useState<{ x: number; y: number; k: number } | null>(null);
  const wonRef = useRef(false);
  const missK = useRef(0);

  const total = SEPT_DIFFS.length;

  function click(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    // cherche une différence non encore trouvée dans le rayon
    const hit = SEPT_DIFFS.find((d) => {
      if (found.includes(d.id)) return false;
      const dx = fx - d.x;
      const dy = (fy - d.y) * ASPECT;
      return Math.sqrt(dx * dx + dy * dy) <= d.r;
    });
    if (hit) {
      const next = [...found, hit.id];
      setFound(next);
      if (next.length === total && !wonRef.current) {
        wonRef.current = true;
        setTimeout(() => onWin?.(), 600);
      }
    } else {
      missK.current += 1;
      setMiss({ x: fx, y: fy, k: missK.current });
      setTimeout(() => setMiss((m) => (m && m.k === missK.current ? null : m)), 600);
    }
  }

  function reset() {
    setFound([]);
    setMiss(null);
    wonRef.current = false;
    onReset?.();
  }

  function Board({ src }: { src: string }) {
    return (
      <div
        onClick={click}
        style={{ position: "relative", width: "100%", aspectRatio: "1000 / 747", borderRadius: 14, overflow: "hidden", border: "1px solid #e6dccd", cursor: "crosshair", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", userSelect: "none" }} />
        {SEPT_DIFFS.filter((d) => found.includes(d.id)).map((d) => (
          <span key={d.id} style={mark(d.x, d.y, d.r)} />
        ))}
        {miss && <span style={missMark(miss.x, miss.y)}>✕</span>}
      </div>
    );
  }

  const win = found.length === total;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontSize: 15 }}>🔍 Trouve les 7 différences</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: win ? "#3c8c5a" : ENCRE }}>{found.length} / {total}</span>
          <button onClick={reset} style={pill(false)}>↺</button>
        </div>
      </div>

      {/* barre de progression */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {SEPT_DIFFS.map((d) => (
          <span key={d.id} style={{ flex: 1, height: 6, borderRadius: 3, background: found.includes(d.id) ? "#9ccfb0" : "#ece3d6" }} />
        ))}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={lab()}>Image 1</div>
          <Board src={IMG_A} />
        </div>
        <div>
          <div style={lab()}>Image 2</div>
          <Board src={IMG_B} />
        </div>
      </div>

      <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", marginTop: 10 }}>
        Clique sur les différences, sur l&apos;une ou l&apos;autre image 🤍
      </p>
    </div>
  );
}

function mark(x: number, y: number, r: number): React.CSSProperties {
  return {
    position: "absolute",
    left: `${(x - r) * 100}%`,
    top: `${(y - r / ASPECT) * 100}%`,
    width: `${r * 2 * 100}%`,
    aspectRatio: "1 / 1",
    border: "3px solid #4caf7d",
    borderRadius: "50%",
    boxShadow: "0 0 0 3px rgba(76,175,125,0.25)",
    pointerEvents: "none",
  };
}
function missMark(x: number, y: number): React.CSSProperties {
  return {
    position: "absolute",
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    transform: "translate(-50%,-50%)",
    color: "#e06666",
    fontSize: 22,
    fontWeight: 700,
    pointerEvents: "none",
    textShadow: "0 1px 3px rgba(0,0,0,0.4)",
  };
}
function lab(): React.CSSProperties {
  return { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5, marginBottom: 4, color: ENCRE };
}
function pill(active: boolean): React.CSSProperties {
  return { border: "1px solid #d9cdbf", borderRadius: 999, padding: "5px 11px", background: active ? "#3a3330" : "#fff", color: active ? "#fff" : "#3a3330", cursor: "pointer", fontSize: 12.5 };
}
