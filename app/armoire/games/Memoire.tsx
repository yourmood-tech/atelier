"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MEMOIRE_FACES } from "@/lib/armoire-catalog";

/* Jeu de mémoire (paires) avec les icônes mood. Solo (gain) ou à deux (sans gain).
   inline=true → rendu plein (page partageable) ; sinon pop-up dans l'armoire. */

type Card = { id: number; face: string; pairId: number; flipped: boolean; done: boolean };

const EMOJI_POOL = ["🌸", "💍", "🤍", "💎", "✨", "🌺", "🩷", "🫧"];
const isUrl = (s: string) => /^https?:|^data:|^\//.test(s);

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Memoire({
  images = MEMOIRE_FACES,
  onClose,
  onWin,
  pairs = 8,
  inline = false,
  seed = 7,
}: {
  images?: string[];
  onClose?: () => void;
  onWin?: () => void;
  pairs?: number;
  inline?: boolean;
  seed?: number;
}) {
  const [deux, setDeux] = useState(false);

  const initial = useMemo<Card[]>(() => {
    const faces = [...images.slice(0, pairs)];
    for (let i = 0; faces.length < pairs; i++) faces.push(EMOJI_POOL[i % EMOJI_POOL.length]);
    const doubled = faces.flatMap((face, i) => [
      { id: i * 2, face, pairId: i, flipped: false, done: false },
      { id: i * 2 + 1, face, pairId: i, flipped: false, done: false },
    ]);
    return shuffle(doubled, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.join("|"), pairs, seed]);

  const [cards, setCards] = useState<Card[]>(initial);
  const [open, setOpen] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [coups, setCoups] = useState(0);
  const [joueur, setJoueur] = useState(0);
  const [scores, setScores] = useState([0, 0]);

  // mélange différent à chaque ouverture (après hydratation, pas de mismatch SSR)
  useEffect(() => {
    setCards(shuffle(initial, Math.floor(Math.random() * 1e6) + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gagne = cards.length > 0 && cards.every((c) => c.done);

  const wonRef = useRef(false);
  useEffect(() => {
    if (gagne && !wonRef.current && !deux) {
      wonRef.current = true;
      onWin?.();
    }
  }, [gagne, deux, onWin]);

  function reset() {
    setCards(shuffle(initial, Math.floor(Math.random() * 1e6) + 1));
    setOpen([]);
    setBusy(false);
    setCoups(0);
    setJoueur(0);
    setScores([0, 0]);
    wonRef.current = false;
  }

  function clic(idx: number) {
    if (busy) return;
    const c = cards[idx];
    if (c.flipped || c.done) return;
    const next = cards.map((x, i) => (i === idx ? { ...x, flipped: true } : x));
    const nowOpen = [...open, idx];
    setCards(next);
    setOpen(nowOpen);

    if (nowOpen.length === 2) {
      setBusy(true);
      setCoups((n) => n + 1);
      const [a, b] = nowOpen;
      if (next[a].pairId === next[b].pairId) {
        setTimeout(() => {
          setCards((cur) => cur.map((x, i) => (i === a || i === b ? { ...x, done: true } : x)));
          setOpen([]);
          setBusy(false);
          if (deux) setScores((s) => (joueur === 0 ? [s[0] + 1, s[1]] : [s[0], s[1] + 1]));
        }, 500);
      } else {
        setTimeout(() => {
          setCards((cur) => cur.map((x, i) => (i === a || i === b ? { ...x, flipped: false } : x)));
          setOpen([]);
          setBusy(false);
          if (deux) setJoueur((j) => (j === 0 ? 1 : 0));
        }, 800);
      }
    }
  }

  const cols = pairs <= 6 ? 4 : 4;

  const body = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong style={{ fontSize: 16 }}>🧠 Mémoire mood</strong>
        {onClose && <button onClick={onClose} style={closeBtn()}>✕</button>}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12, fontSize: 13 }}>
        <button onClick={() => { setDeux((d) => !d); reset(); }} style={pill(deux)}>
          {deux ? "👯 À deux" : "🙂 Solo"}
        </button>
        {deux ? (
          <>
            <span style={{ fontWeight: joueur === 0 ? 700 : 400 }}>J1 : {scores[0]}</span>
            <span style={{ fontWeight: joueur === 1 ? 700 : 400 }}>J2 : {scores[1]}</span>
            <span style={{ opacity: 0.6 }}>· au tour de J{joueur + 1}</span>
          </>
        ) : (
          <span style={{ opacity: 0.7 }}>Coups : {coups}</span>
        )}
        <button onClick={reset} style={pill(false)}>↺ Rejouer</button>
      </div>

      {gagne && (
        <div style={{ background: "#fff4f6", borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 14 }}>
          🎉 Bravo ! {deux ? (scores[0] === scores[1] ? "Égalité !" : `Joueur ${scores[0] > scores[1] ? 1 : 2} gagne !`) : `Terminé en ${coups} coups.`}
          {!deux && " Ta moodaille arrive 🤍"}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
        {cards.map((c, idx) => {
          const show = c.flipped || c.done;
          return (
            <button key={c.id} onClick={() => clic(idx)} style={cardBtn(show, c.done)}>
              {show ? (
                isUrl(c.face) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.face} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                ) : (
                  <span style={{ fontSize: 30 }}>{c.face}</span>
                )
              ) : (
                <span style={{ fontSize: 22 }}>🤍</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  if (inline) return <div>{body}</div>;

  return (
    <div style={overlay()}>
      <div style={modal()}>{body}</div>
    </div>
  );
}

function overlay(): React.CSSProperties {
  return { position: "fixed", inset: 0, background: "rgba(40,30,20,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 };
}
function modal(): React.CSSProperties {
  return { background: "#fffdfb", borderRadius: 18, padding: 18, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "92vh", overflowY: "auto" };
}
function cardBtn(show: boolean, done: boolean): React.CSSProperties {
  return { aspectRatio: "1/1", borderRadius: 10, border: "1px solid #e6dccd", cursor: "pointer", background: show ? "#fff" : "linear-gradient(135deg, #d8b083, #c2945f)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: done ? 0.55 : 1, overflow: "hidden" };
}
function closeBtn(): React.CSSProperties {
  return { border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#6b4f33" };
}
function pill(active: boolean): React.CSSProperties {
  return { border: "1px solid #d9cdbf", borderRadius: 999, padding: "5px 12px", background: active ? "#3a3330" : "#fff", color: active ? "#fff" : "#3a3330", cursor: "pointer", fontSize: 13 };
}
