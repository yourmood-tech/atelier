"use client";

import React, { useEffect, useRef, useState } from "react";

/* Taquin (cases qui glissent) pour reformer une image mood. 3x3 = facile.
   Gagné quand chaque pièce est à sa place → onWin(). */

const ENCRE = "#3a3330";
const N = 3;
const IMG = "/jeux/taquin/boite.png";
const EMPTY = N * N - 1; // la dernière pièce est le trou

function solved(): number[] { return Array.from({ length: N * N }, (_, i) => i); }
function adj(a: number, b: number): boolean {
  const ra = Math.floor(a / N), ca = a % N, rb = Math.floor(b / N), cb = b % N;
  return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
}

export function Taquin({ onWin }: { onWin?: () => void }) {
  // board[pos] = id de pièce (EMPTY = trou). État résolu au départ (SSR ok), mélangé au montage.
  const [board, setBoard] = useState<number[]>(solved());
  const [coups, setCoups] = useState(0);
  const [started, setStarted] = useState(false);
  const wonRef = useRef(false);

  function shuffle() {
    const b = solved();
    let empty = EMPTY;
    let prev = -1;
    for (let i = 0; i < 200; i++) {
      const voisins: number[] = [];
      for (let p = 0; p < N * N; p++) if (adj(p, empty) && p !== prev) voisins.push(p);
      const pick = voisins[Math.floor(Math.random() * voisins.length)];
      [b[empty], b[pick]] = [b[pick], b[empty]];
      prev = empty;
      empty = pick;
    }
    setBoard(b);
    setCoups(0);
    setStarted(true);
    wonRef.current = false;
  }

  useEffect(() => { shuffle(); }, []);

  const gagne = started && board.every((v, i) => v === i);
  useEffect(() => {
    if (gagne && !wonRef.current) { wonRef.current = true; setTimeout(() => onWin?.(), 500); }
  }, [gagne, onWin]);

  function clic(pos: number) {
    const empty = board.indexOf(EMPTY);
    if (!adj(pos, empty)) return;
    setBoard((b) => { const n = [...b]; [n[empty], n[pos]] = [n[pos], n[empty]]; return n; });
    setCoups((c) => c + 1);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 15 }}>🧩 Taquin mood</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Coups : {coups}</span>
          <button onClick={shuffle} style={pill()}>↺ Mélanger</button>
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 320, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 3, aspectRatio: "1/1" }}>
          {board.map((piece, pos) => {
            const isEmpty = piece === EMPTY && !gagne;
            const row = Math.floor(piece / N), col = piece % N;
            return (
              <button
                key={pos}
                onClick={() => clic(pos)}
                style={{
                  aspectRatio: "1/1", border: "none", padding: 0, borderRadius: 6, cursor: "pointer", overflow: "hidden",
                  background: isEmpty ? "#f0e9df" : `url(${IMG})`,
                  backgroundSize: `${N * 100}% ${N * 100}%`,
                  backgroundPosition: `${(col / (N - 1)) * 100}% ${(row / (N - 1)) * 100}%`,
                  outline: "1px solid #e6dccd",
                  visibility: isEmpty ? "hidden" : "visible",
                }}
              />
            );
          })}
        </div>
        {/* aperçu de l'image cible */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 10, opacity: 0.7 }}>
          <span style={{ fontSize: 11 }}>But :</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMG} alt="modèle" style={{ width: 44, height: 44, borderRadius: 6, border: "1px solid #e6dccd" }} />
        </div>
      </div>

      {gagne && <div style={{ background: "#fff4f6", borderRadius: 10, padding: 10, marginTop: 12, fontSize: 14, textAlign: "center" }}>🎉 Image reformée en {coups} coups ! Ta moodaille arrive 🤍</div>}

      <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", marginTop: 10 }}>Touche une case à côté du trou pour la faire glisser 🤍</p>
    </div>
  );
}

function pill(): React.CSSProperties {
  return { border: "1px solid #d9cdbf", borderRadius: 999, padding: "6px 12px", background: "#fff", color: ENCRE, cursor: "pointer", fontSize: 12.5 };
}
