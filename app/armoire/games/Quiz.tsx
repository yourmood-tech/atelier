"use client";

import React, { useRef, useState } from "react";
import { QUIZ_QUESTIONS } from "@/lib/armoire-catalog";

/* Quiz mood. Questions à choix (il faut la bonne réponse pour avancer) + 1 question libre (pour le fun).
   À la fin → onWin() déclenche la moodaille. Pas de pénalité : on réessaie jusqu'à trouver. */

const ENCRE = "#3a3330";

export function Quiz({ onWin }: { onWin?: () => void }) {
  const questions = QUIZ_QUESTIONS;
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [libre, setLibre] = useState("");
  const wonRef = useRef(false);

  const q = questions[step];
  const last = step === questions.length - 1;

  function avancer() {
    if (last) {
      if (!wonRef.current) {
        wonRef.current = true;
        setTimeout(() => onWin?.(), 500);
      }
      setStep((s) => s + 1); // passe à l'écran "fini"
    } else {
      setStep((s) => s + 1);
      setWrong(null);
      setLibre("");
    }
  }

  function repondre(i: number) {
    if (i === q.bonne) {
      setWrong(null);
      avancer();
    } else {
      setWrong(i);
      setTimeout(() => setWrong((w) => (w === i ? null : w)), 700);
    }
  }

  const fini = step >= questions.length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 15 }}>❓ Quiz mood</strong>
        <span style={{ fontSize: 13, opacity: 0.7 }}>{Math.min(step + 1, questions.length)} / {questions.length}</span>
      </div>

      {/* progression */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {questions.map((_, i) => (
          <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < step || fini ? "#9ccfb0" : "#ece3d6" }} />
        ))}
      </div>

      {!fini ? (
        <div>
          <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.5, marginBottom: 16 }}>{q.q}</div>

          {q.libre ? (
            <>
              <input
                value={libre}
                onChange={(e) => setLibre(e.target.value)}
                placeholder="Ton mood du jour…"
                style={{ width: "100%", boxSizing: "border-box", padding: "13px 15px", borderRadius: 12, border: "1px solid #e3d9cd", fontSize: 15, marginBottom: 12, background: "#fff", color: ENCRE }}
              />
              <button onClick={avancer} disabled={!libre.trim()} style={{ ...primary(), opacity: libre.trim() ? 1 : 0.5 }}>
                Valider 🤍
              </button>
            </>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {q.choix?.map((c, i) => (
                <button key={i} onClick={() => repondre(i)} style={choice(wrong === i)}>
                  {c}
                </button>
              ))}
              {wrong !== null && <div style={{ fontSize: 13, color: "#c1666b", textAlign: "center" }}>Presque… réessaie 🤍</div>}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <p style={{ fontSize: 15, lineHeight: 1.6 }}>Bravo, quiz réussi ! Ta moodaille arrive 🤍</p>
        </div>
      )}
    </div>
  );
}

function primary(): React.CSSProperties {
  return { width: "100%", padding: "13px", borderRadius: 999, border: "none", background: ENCRE, color: "#fff", fontSize: 15, cursor: "pointer" };
}
function choice(isWrong: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: `1px solid ${isWrong ? "#e0a0a0" : "#e3d9cd"}`,
    background: isWrong ? "#fbedeb" : "#fff",
    color: ENCRE,
    fontSize: 15,
    cursor: "pointer",
    textAlign: "left",
    transition: "transform .1s",
    transform: isWrong ? "translateX(-3px)" : "none",
  };
}
