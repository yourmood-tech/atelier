"use client";

import React, { useRef, useState } from "react";

/* Meuble "armoire" dessiné, partagé entre la page cliente et la page admin.
   editable=true (page cliente) → chaque bijou a un menu "déplacer" + "photo perso". */

export type Piece = { pid: number; title: string; image: string | null; date: string; quantity: number };
export type Tiroir = { key: string; label: string; emoji: string; pieces: Piece[] };
export type Choice = { key: string; label: string };

function keyOf(p: Piece): string {
  return p.pid ? String(p.pid) : "t:" + p.title;
}

function fileToSmallDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = fr.result as string;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export function Cabinet({
  tiroirs,
  open,
  setOpen,
  editable = false,
  onMove,
  onPhoto,
}: {
  tiroirs: Tiroir[];
  open: Record<string, boolean>;
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  editable?: boolean;
  onMove?: (key: string, tiroirKey: string) => void;
  onPhoto?: (key: string, dataUrl: string) => void;
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
            editable={editable}
            onMove={onMove}
            onPhoto={onPhoto}
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

function Drawer({
  tiroir,
  isOpen,
  onToggle,
  editable,
  onMove,
  onPhoto,
}: {
  tiroir: Tiroir;
  isOpen: boolean;
  onToggle: () => void;
  editable: boolean;
  onMove?: (key: string, tiroirKey: string) => void;
  onPhoto?: (key: string, dataUrl: string) => void;
}) {
  const [dropHover, setDropHover] = useState(false);
  return (
    <div
      onDragOver={editable ? (e) => { e.preventDefault(); setDropHover(true); } : undefined}
      onDragLeave={editable ? () => setDropHover(false) : undefined}
      onDrop={
        editable
          ? (e) => {
              e.preventDefault();
              const k = e.dataTransfer.getData("text/plain");
              if (k) onMove?.(k, tiroir.key);
              setDropHover(false);
            }
          : undefined
      }
      style={{ borderRadius: 12, outline: dropHover ? "3px dashed #6b4f33" : "none", outlineOffset: 3, transition: "outline 0.1s" }}
    >
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
              <PieceCell key={i} piece={p} editable={editable} onPhoto={onPhoto} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PieceCell({
  piece,
  editable,
  onPhoto,
}: {
  piece: Piece;
  editable: boolean;
  onPhoto?: (key: string, dataUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const k = keyOf(piece);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await fileToSmallDataUrl(f);
      onPhoto?.(k, url);
    } catch {
      /* ignore */
    }
  }

  return (
    <div style={{ position: "relative", textAlign: "center" }}>
      <div
        draggable={editable}
        onDragStart={editable ? (e) => e.dataTransfer.setData("text/plain", k) : undefined}
        style={{ ...pieceBox(), position: "relative", cursor: editable ? "grab" : "default" }}
        title={editable ? "Glisse-moi sur un tiroir pour me ranger" : undefined}
      >
        {piece.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={piece.image} alt={piece.title} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
        ) : (
          <span style={{ fontSize: 24 }}>💍</span>
        )}

        {editable && (
          <button onClick={() => fileRef.current?.click()} style={camBtn()} aria-label="changer la photo">
            📷
          </button>
        )}
        {editable && !piece.image && (
          <button onClick={() => fileRef.current?.click()} style={plusOverlay()}>
            ＋ photo
          </button>
        )}
      </div>

      <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4, lineHeight: 1.25 }}>{shorten(piece.title)}</div>

      {editable && <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />}
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
function camBtn(): React.CSSProperties {
  return { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", fontSize: 12, lineHeight: "20px", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" };
}
function plusOverlay(): React.CSSProperties {
  return { position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", border: "none", background: "rgba(107,79,51,0.85)", color: "#fff", fontSize: 11, padding: "3px 8px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap" };
}
