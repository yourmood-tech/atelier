"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MOTS_CACHES } from "@/lib/armoire-catalog";

/* Mots cachés. On clique la 1re lettre puis la dernière ; si la ligne forme un mot → trouvé.
   Quand tous les mots sont trouvés → onWin(). */

const ENCRE = "#3a3330";
const SIZE = 12;
const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function rng(seed: number) { let s = seed || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

function buildGrid(words: string[], size: number, seed: number) {
  const rand = rng(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: string[] = [];
  for (const word of [...words].sort((a, b) => b.length - a.length)) {
    let ok = false;
    for (let attempt = 0; attempt < 500 && !ok; attempt++) {
      const [dr, dc] = DIRS[Math.floor(rand() * DIRS.length)];
      const w = rand() < 0.45 ? [...word].reverse().join("") : word;
      const len = w.length;
      const rmin = dr < 0 ? len - 1 : 0;
      const rmax = dr > 0 ? size - len : size - 1;
      const cmin = dc < 0 ? len - 1 : 0;
      const cmax = dc > 0 ? size - len : size - 1;
      if (rmax < rmin || cmax < cmin) continue;
      const r0 = rmin + Math.floor(rand() * (rmax - rmin + 1));
      const c0 = cmin + Math.floor(rand() * (cmax - cmin + 1));
      let fit = true;
      for (let i = 0; i < len; i++) { const cur = grid[r0 + dr * i][c0 + dc * i]; if (cur && cur !== w[i]) { fit = false; break; } }
      if (!fit) continue;
      for (let i = 0; i < len; i++) grid[r0 + dr * i][c0 + dc * i] = w[i];
      placed.push(word);
      ok = true;
    }
  }
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!grid[r][c]) grid[r][c] = AZ[Math.floor(rand() * 26)];
  return grid;
}

function lineCells(a: [number, number], b: [number, number]): [number, number][] | null {
  const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]);
  const adr = Math.abs(b[0] - a[0]), adc = Math.abs(b[1] - a[1]);
  if (!(adr === 0 || adc === 0 || adr === adc)) return null;
  const len = Math.max(adr, adc) + 1;
  const cells: [number, number][] = [];
  for (let i = 0; i < len; i++) cells.push([a[0] + dr * i, a[1] + dc * i]);
  return cells;
}

export function Mots({ onWin }: { onWin?: () => void }) {
  const words = MOTS_CACHES;
  const [seed, setSeed] = useState(7);
  const grid = useMemo(() => buildGrid(words, SIZE, seed), [words, seed]);

  const [first, setFirst] = useState<[number, number] | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const wonRef = useRef(false);

  // grille différente à chaque ouverture (après hydratation)
  useEffect(() => { setSeed(Math.floor(Math.random() * 1e6) + 1); }, []);

  useEffect(() => {
    if (foundWords.length === words.length && !wonRef.current) {
      wonRef.current = true;
      setTimeout(() => onWin?.(), 500);
    }
  }, [foundWords, words.length, onWin]);

  function clickCell(r: number, c: number) {
    if (!first) { setFirst([r, c]); return; }
    if (first[0] === r && first[1] === c) { setFirst(null); return; }
    const cells = lineCells(first, [r, c]);
    if (!cells) { setFirst([r, c]); return; }
    const letters = cells.map(([rr, cc]) => grid[rr][cc]).join("");
    const rev = [...letters].reverse().join("");
    const hit = words.find((w) => !foundWords.includes(w) && (w === letters || w === rev));
    if (hit) {
      setFoundWords((p) => [...p, hit]);
      setFoundCells((p) => { const n = new Set(p); cells.forEach(([rr, cc]) => n.add(`${rr},${cc}`)); return n; });
      setFlash("ok");
    } else {
      setFlash("no");
    }
    setFirst(null);
    setTimeout(() => setFlash(null), 500);
  }

  function reset() {
    setSeed(Math.floor(Math.random() * 1e6) + 1);
    setFirst(null);
    setFoundWords([]);
    setFoundCells(new Set());
    wonRef.current = false;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 15 }}>🔤 Mots cachés</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{foundWords.length} / {words.length}</span>
          <button onClick={reset} style={pill()}>↺</button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {words.map((w) => (
          <span key={w} style={{ fontSize: 12, padding: "3px 9px", borderRadius: 999, background: foundWords.includes(w) ? "#dcefe2" : "#f1eae1", color: foundWords.includes(w) ? "#3c8c5a" : ENCRE, textDecoration: foundWords.includes(w) ? "line-through" : "none" }}>{w}</span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 2, border: flash === "no" ? "2px solid #e0a0a0" : "2px solid transparent", borderRadius: 8, padding: 2, transition: "border .2s" }}>
        {grid.map((row, r) =>
          row.map((ch, c) => {
            const key = `${r},${c}`;
            const isFound = foundCells.has(key);
            const isFirst = first && first[0] === r && first[1] === c;
            return (
              <button
                key={key}
                onClick={() => clickCell(r, c)}
                style={{
                  aspectRatio: "1/1", border: "none", borderRadius: 4, cursor: "pointer", padding: 0,
                  fontSize: "clamp(9px, 2.4vw, 15px)", fontWeight: 600,
                  background: isFirst ? "#3a3330" : isFound ? "#bfe6cf" : "#fff",
                  color: isFirst ? "#fff" : ENCRE,
                  outline: "1px solid #efe7dd",
                }}
              >
                {ch}
              </button>
            );
          })
        )}
      </div>

      <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", marginTop: 10 }}>
        Clique la 1re lettre, puis la dernière 🤍 (horizontal, vertical, diagonale)
      </p>
    </div>
  );
}

function pill(): React.CSSProperties {
  return { border: "1px solid #d9cdbf", borderRadius: 999, padding: "5px 11px", background: "#fff", color: ENCRE, cursor: "pointer", fontSize: 12.5 };
}
