"use client";

import React, { useEffect, useMemo, useState } from "react";

/* Labyrinthe : aide le personnage à rejoindre sa commode. Flèches du clavier OU boutons à l'écran.
   Quand il arrive sur la commode → onWin(). Simple : labyrinthe "parfait" (toujours une solution). */

const ENCRE = "#3a3330";
const N = 11;
const AVATAR = "/jeux/labyrinthe/avatar.png";
const COMMODE = "/jeux/labyrinthe/commode.png";

type Cell = { N: boolean; E: boolean; S: boolean; W: boolean };
function rng(seed: number) { let s = seed || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

function genMaze(n: number, seed: number): Cell[] {
  const rand = rng(seed);
  const cells: (Cell & { v: boolean })[] = Array.from({ length: n * n }, () => ({ N: true, E: true, S: true, W: true, v: false }));
  const idx = (r: number, c: number) => r * n + c;
  const stack: number[] = [];
  let cur = 0; cells[cur].v = true; let count = 1;
  const opp: Record<string, "N" | "E" | "S" | "W"> = { N: "S", E: "W", S: "N", W: "E" };
  while (count < n * n) {
    const r = Math.floor(cur / n), c = cur % n;
    const nb: [("N" | "E" | "S" | "W"), number][] = [];
    if (r > 0 && !cells[idx(r - 1, c)].v) nb.push(["N", idx(r - 1, c)]);
    if (c < n - 1 && !cells[idx(r, c + 1)].v) nb.push(["E", idx(r, c + 1)]);
    if (r < n - 1 && !cells[idx(r + 1, c)].v) nb.push(["S", idx(r + 1, c)]);
    if (c > 0 && !cells[idx(r, c - 1)].v) nb.push(["W", idx(r, c - 1)]);
    if (nb.length) {
      const [dir, ni] = nb[Math.floor(rand() * nb.length)];
      cells[cur][dir] = false; cells[ni][opp[dir]] = false; cells[ni].v = true; count++;
      stack.push(cur); cur = ni;
    } else { cur = stack.pop()!; }
  }
  return cells.map(({ N, E, S, W }) => ({ N, E, S, W }));
}

// Solveur (BFS) : chemin du départ (0,0) à la sortie (N-1,N-1). Pour le bouton "Voir le chemin"
// — filet de sécurité : si la cliente bloque, le tracé s'affiche (et ça garantit qu'un chemin existe).
function solve(maze: Cell[]): number[] {
  const goal = N * N - 1;
  const prev = new Array(N * N).fill(-1);
  const seen = new Array(N * N).fill(false);
  seen[0] = true; const q = [0];
  while (q.length) {
    const p = q.shift()!; if (p === goal) break;
    const r = Math.floor(p / N), c = p % N, cell = maze[p];
    const nbs: number[] = [];
    if (!cell.N && r > 0) nbs.push(p - N);
    if (!cell.S && r < N - 1) nbs.push(p + N);
    if (!cell.E && c < N - 1) nbs.push(p + 1);
    if (!cell.W && c > 0) nbs.push(p - 1);
    for (const np of nbs) if (!seen[np]) { seen[np] = true; prev[np] = p; q.push(np); }
  }
  if (!seen[goal]) return [];
  const path: number[] = []; let cur = goal;
  while (cur !== -1) { path.push(cur); cur = prev[cur]; }
  return path;
}

export function Maze({ onWin }: { onWin?: () => void }) {
  const [seed, setSeed] = useState(7);
  const maze = useMemo(() => genMaze(N, seed), [seed]);
  const path = useMemo(() => solve(maze), [maze]);
  const pathSet = useMemo(() => new Set(path), [path]);
  const [showPath, setShowPath] = useState(false);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [won, setWon] = useState(false);

  useEffect(() => { setSeed(Math.floor(Math.random() * 1e6) + 1); }, []);
  useEffect(() => { setPos([0, 0]); setWon(false); }, [maze]);

  const move = useMemo(() => (dir: "N" | "E" | "S" | "W") => {
    setPos(([r, c]) => {
      const cell = maze[r * N + c];
      if (cell[dir]) return [r, c];
      let nr = r, nc = c;
      if (dir === "N") nr--; else if (dir === "S") nr++; else if (dir === "E") nc++; else nc--;
      if (nr < 0 || nc < 0 || nr >= N || nc >= N) return [r, c];
      if (nr === N - 1 && nc === N - 1 && !won) { setWon(true); setTimeout(() => onWin?.(), 500); }
      return [nr, nc];
    });
  }, [maze, won, onWin]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp") { e.preventDefault(); move("N"); }
      else if (k === "ArrowDown") { e.preventDefault(); move("S"); }
      else if (k === "ArrowRight") { e.preventDefault(); move("E"); }
      else if (k === "ArrowLeft") { e.preventDefault(); move("W"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [move]);

  function reset() { setSeed(Math.floor(Math.random() * 1e6) + 1); setShowPath(false); }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15 }}>🌀 Labyrinthe</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowPath((s) => !s)} style={pill()}>🧭 {showPath ? "Cacher" : "Voir"} le chemin</button>
          <button onClick={reset} style={pill()}>↺ Nouveau</button>
        </div>
      </div>
      <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", margin: "0 0 8px" }}>Aide le moodie 🧍 à rejoindre sa commode 🟢 (la sortie)</p>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`, maxWidth: 340, margin: "0 auto", aspectRatio: "1/1", background: "#fbf7f2", border: "3px solid #3a3330", borderRadius: 6, overflow: "hidden" }}>
        {maze.map((cell, i) => {
          const r = Math.floor(i / N), c = i % N;
          const isPlayer = pos[0] === r && pos[1] === c;
          const isGoal = r === N - 1 && c === N - 1;
          const onPath = showPath && pathSet.has(i) && !isGoal && !isPlayer;
          const wall = "2px solid #3a3330", none = "2px solid transparent";
          return (
            <div key={i} style={{
              position: "relative", aspectRatio: "1/1", boxSizing: "border-box",
              borderTop: cell.N ? wall : none, borderRight: cell.E ? wall : none,
              borderBottom: cell.S ? wall : none, borderLeft: cell.W ? wall : none,
              background: isGoal ? "rgba(90,161,122,0.22)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {onPath && <span style={{ width: "34%", height: "34%", borderRadius: "50%", background: "#5aa17a", opacity: 0.55 }} />}
              {isGoal && !isPlayer && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={COMMODE} alt="commode" style={{ width: "92%", height: "92%", objectFit: "contain" }} />
                  <span style={{ position: "absolute", top: -2, right: -2, fontSize: 11 }}>🏁</span>
                </>
              )}
              {isPlayer && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={AVATAR} alt="toi" style={{ width: "95%", height: "95%", objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.3))" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* D-pad pour mobile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 56px)", gridTemplateRows: "repeat(3, 56px)", justifyContent: "center", gap: 6, marginTop: 14 }}>
        <span />
        <button onClick={() => move("N")} style={dpad()}>▲</button>
        <span />
        <button onClick={() => move("W")} style={dpad()}>◀</button>
        <span />
        <button onClick={() => move("E")} style={dpad()}>▶</button>
        <span />
        <button onClick={() => move("S")} style={dpad()}>▼</button>
        <span />
      </div>

      {won && <div style={{ background: "#fff4f6", borderRadius: 10, padding: 10, marginTop: 12, fontSize: 14, textAlign: "center" }}>🎉 Arrivée à la commode ! Ta moodaille arrive 🤍</div>}

      <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", marginTop: 10 }}>Flèches du clavier ou boutons ci-dessus 🤍</p>
    </div>
  );
}

function pill(): React.CSSProperties {
  return { border: "1px solid #d9cdbf", borderRadius: 999, padding: "6px 12px", background: "#fff", color: ENCRE, cursor: "pointer", fontSize: 12.5 };
}
function dpad(): React.CSSProperties {
  return { border: "1px solid #d9cdbf", borderRadius: 12, background: "#fff", color: ENCRE, fontSize: 20, cursor: "pointer" };
}
