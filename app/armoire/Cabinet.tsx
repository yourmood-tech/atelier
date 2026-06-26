"use client";

import React from "react";

/* Meuble "armoire" dessiné, partagé entre la page cliente et la page admin. */

export type Piece = { title: string; image: string | null; date: string; quantity: number };
export type Tiroir = { key: string; label: string; emoji: string; pieces: Piece[] };

export function Cabinet({
  tiroirs,
  open,
  setOpen,
}: {
  tiroirs: Tiroir[];
  open: Record<string, boolean>;
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <div style={{ maxWidth: 760, margin: "10px auto 0" }}>
      <div
        style={{
          height: 26,
          background: "linear-gradient(180deg, #8a6038, #76502f)",
          borderRadius: "16px 16px 4px 4px",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.18)",
          margin: "0 -6px",
        }}
      />
      <div
        style={{
          background: "linear-gradient(180deg, #a3744a, #8f6440)",
          border: "6px solid #6f4d2c",
          borderTop: "none",
          borderRadius: "4px 4px 10px 10px",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "0 18px 40px rgba(90,60,30,0.28)",
        }}
      >
        {tiroirs.map((t) => (
          <Drawer
            key={t.key}
            tiroir={t}
            isOpen={!!open[t.key]}
            onToggle={() => setOpen((o) => ({ ...o, [t.key]: !o[t.key] }))}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 24px" }}>
        <span style={foot()} />
        <span style={foot()} />
      </div>
    </div>
  );
}

function Drawer({ tiroir, isOpen, onToggle }: { tiroir: Tiroir; isOpen: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          cursor: "pointer",
          border: "2px solid #875f38",
          borderRadius: 10,
          padding: "16px 18px",
          background: "linear-gradient(180deg, #d8b083, #c2945f)",
          boxShadow: isOpen
            ? "inset 0 3px 10px rgba(90,60,30,0.35)"
            : "inset 0 2px 0 rgba(255,255,255,0.35), 0 4px 8px rgba(90,60,30,0.18)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          transition: "all 0.2s",
        }}
      >
        <span style={knob()} />
        <span
          style={{
            flex: 1,
            background: "#fbf3e2",
            border: "1px solid #e4d4b6",
            borderRadius: 5,
            padding: "6px 12px",
            color: "#6b4f33",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 0.3,
            transform: "rotate(-0.6deg)",
            boxShadow: "0 1px 3px rgba(90,60,30,0.18)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            {tiroir.emoji} {tiroir.label}
          </span>
          <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 13 }}>
            {tiroir.pieces.length} · {isOpen ? "fermer" : "ouvrir"}
          </span>
        </span>
        <span style={knob()} />
      </button>

      {isOpen && (
        <div
          style={{
            background: "linear-gradient(180deg, #f6efe0, #efe5d2)",
            border: "2px solid #875f38",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            margin: "0 6px",
            padding: 14,
            boxShadow: "inset 0 6px 14px rgba(120,90,50,0.18)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
            {tiroir.pieces.map((p, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={pieceBox()}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 24 }}>💍</span>
                  )}
                </div>
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4, lineHeight: 1.25 }}>{shorten(p.title)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function shorten(t: string): string {
  return t.length > 42 ? t.slice(0, 40) + "…" : t;
}
function pieceBox(): React.CSSProperties {
  return { aspectRatio: "1 / 1", borderRadius: 12, background: "#fff", border: "1px solid #efe7dd", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" };
}
function knob(): React.CSSProperties {
  return { width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #f3dca0, #a9802f)", boxShadow: "0 1px 2px rgba(0,0,0,0.3)", flexShrink: 0 };
}
function foot(): React.CSSProperties {
  return { width: 26, height: 14, background: "linear-gradient(180deg, #6f4d2c, #573a1f)", borderRadius: "0 0 8px 8px" };
}
