"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* Sudoku 9x9 (facile/moyen). Sélectionne une case puis un chiffre. Gagné quand la grille
   est pleine et valide (chaque ligne / colonne / carré contient 1 à 9). */

const ENCRE = "#3a3330";
const TROUS = 44; // cases à remplir (facile/moyen)

function rng(seed: number) { let s = seed || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

function makeSolved(seed: number): number[][] {
  const rand = rng(seed);
  // base valide
  let g: number[][] = [];
  for (let r = 0; r < 9; r++) { g.push([]); for (let c = 0; c < 9; c++) g[r].push(((3 * (r % 3) + Math.floor(r / 3) + c) % 9) + 1); }
  // permutation des chiffres
  const perm = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 8; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  g = g.map((row) => row.map((v) => perm[v - 1]));
  // mélange lignes dans bandes, colonnes dans piles, et bandes/piles
  const shuffleBand = (arr: number[]) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const rowOrder: number[] = [];
  shuffleBand([0, 1, 2]).forEach((b) => shuffleBand([0, 1, 2]).forEach((r) => rowOrder.push(b * 3 + r)));
  const colOrder: number[] = [];
  shuffleBand([0, 1, 2]).forEach((b) => shuffleBand([0, 1, 2]).forEach((c) => colOrder.push(b * 3 + c)));
  return rowOrder.map((r) => colOrder.map((c) => g[r][c]));
}

function dig(solved: number[][], holes: number, seed: number): number[][] {
  const rand = rng(seed + 999);
  const grid = solved.map((r) => [...r]);
  const cells = Array.from({ length: 81 }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  for (let k = 0; k < holes; k++) { const idx = cells[k]; grid[Math.floor(idx / 9)][idx % 9] = 0; }
  return grid;
}

function isValid(g: number[][]): boolean {
  for (let i = 0; i < 9; i++) {
    const row = new Set<number>(), col = new Set<number>();
    for (let j = 0; j < 9; j++) {
      if (!g[i][j] || row.has(g[i][j])) return false; row.add(g[i][j]);
      if (!g[j][i] || col.has(g[j][i])) return false; col.add(g[j][i]);
    }
  }
  for (let br = 0; br < 9; br += 3) for (let bc = 0; bc < 9; bc += 3) {
    const box = new Set<number>();
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) { if (!g[r][c] || box.has(g[r][c])) return false; box.add(g[r][c]); }
  }
  return true;
}

export function Sudoku({ onWin }: { onWin?: () => void }) {
  const [seed, setSeed] = useState(7);
  const { puzzle, givens } = useMemo(() => {
    const solved = makeSolved(seed);
    const p = dig(solved, TROUS, seed);
    const g = p.map((row) => row.map((v) => v !== 0));
    return { puzzle: p, givens: g };
  }, [seed]);

  const [grid, setGrid] = useState<number[][]>(puzzle.map((r) => [...r]));
  const [sel, setSel] = useState<[number, number] | null>(null);
  const wonRef = useRef(false);

  useEffect(() => { setSeed(Math.floor(Math.random() * 1e6) + 1); }, []);
  useEffect(() => { setGrid(puzzle.map((r) => [...r])); setSel(null); wonRef.current = false; }, [puzzle]);

  const plein = grid.every((r) => r.every((v) => v !== 0));
  const gagne = plein && isValid(grid);

  useEffect(() => {
    if (gagne && !wonRef.current) { wonRef.current = true; setTimeout(() => onWin?.(), 500); }
  }, [gagne, onWin]);

  function poser(n: number) {
    if (!sel) return;
    const [r, c] = sel;
    if (givens[r][c]) return;
    setGrid((g) => g.map((row, i) => row.map((v, j) => (i === r && j === c ? n : v))));
  }

  // conflit visuel : même chiffre déjà présent sur ligne/col/carré
  function conflit(r: number, c: number): boolean {
    const v = grid[r][c]; if (!v) return false;
    for (let k = 0; k < 9; k++) { if (k !== c && grid[r][k] === v) return true; if (k !== r && grid[k][c] === v) return true; }
    const br = r - (r % 3), bc = c - (c % 3);
    for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) if ((i !== r || j !== c) && grid[i][j] === v) return true;
    return false;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 15 }}>🔢 Sudoku mood</strong>
        <button onClick={() => setSeed(Math.floor(Math.random() * 1e6) + 1)} style={pill()}>↺ Nouvelle grille</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 0, border: "2px solid #3a3330", borderRadius: 6, overflow: "hidden", maxWidth: 360, margin: "0 auto" }}>
        {grid.map((row, r) =>
          row.map((v, c) => {
            const given = givens[r][c];
            const selected = sel && sel[0] === r && sel[1] === c;
            const bad = !given && conflit(r, c);
            return (
              <button
                key={`${r},${c}`}
                onClick={() => setSel([r, c])}
                style={{
                  aspectRatio: "1/1", padding: 0, cursor: "pointer",
                  border: "0.5px solid #d9cdbf",
                  borderRight: c % 3 === 2 && c !== 8 ? "2px solid #b5a48c" : undefined,
                  borderBottom: r % 3 === 2 && r !== 8 ? "2px solid #b5a48c" : undefined,
                  background: selected ? "#efe2d2" : "#fff",
                  color: bad ? "#c1666b" : given ? "#3a3330" : "#7a6cc4",
                  fontWeight: given ? 700 : 500,
                  fontSize: "clamp(12px, 4vw, 18px)",
                }}
              >
                {v || ""}
              </button>
            );
          })
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 4, maxWidth: 360, margin: "12px auto 0" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => poser(n)} disabled={!sel} style={{ aspectRatio: "1/1", borderRadius: 8, border: "1px solid #e3d9cd", background: sel ? "#fff" : "#f5f0e9", color: ENCRE, fontSize: 16, fontWeight: 600, cursor: sel ? "pointer" : "default" }}>{n}</button>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <button onClick={() => poser(0)} disabled={!sel} style={pill()}>⌫ Effacer</button>
      </div>

      {gagne && <div style={{ background: "#fff4f6", borderRadius: 10, padding: 10, marginTop: 10, fontSize: 14, textAlign: "center" }}>🎉 Grille résolue ! Ta moodaille arrive 🤍</div>}

      <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", marginTop: 10 }}>Touche une case puis un chiffre 🤍</p>
    </div>
  );
}

function pill(): React.CSSProperties {
  return { border: "1px solid #d9cdbf", borderRadius: 999, padding: "6px 12px", background: "#fff", color: ENCRE, cursor: "pointer", fontSize: 12.5 };
}
