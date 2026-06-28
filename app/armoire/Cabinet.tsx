"use client";

import React, { useRef, useState } from "react";
import { ARMOIRE_PALETTES, type ArmoirePalette } from "@/lib/armoire-catalog";

/* Meuble "armoire" dessiné, partagé entre la page cliente et la page admin.
   editable=true (page cliente) → chaque bijou a un menu "déplacer" + "photo perso".
   palette → recolore la VRAIE armoire (déco). */

export type Piece = { pid: number; title: string; image: string | null; date: string; quantity: number; card?: string; avantage?: string; code?: string; rarete?: string };
export type Tiroir = { key: string; label: string; emoji: string; pieces: Piece[] };
export type Choice = { key: string; label: string };

const DEFAULT_PALETTE = ARMOIRE_PALETTES.noyer;

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
  palette = DEFAULT_PALETTE,
}: {
  tiroirs: Tiroir[];
  open: Record<string, boolean>;
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  editable?: boolean;
  onMove?: (key: string, tiroirKey: string) => void;
  onPhoto?: (key: string, dataUrl: string) => void;
  palette?: ArmoirePalette;
}) {
  const p = palette;
  const [zoom, setZoom] = useState<Piece | null>(null);
  return (
    <div style={{ maxWidth: 760, margin: "10px auto 0" }}>
      <div
        style={{
          height: 34,
          background: `linear-gradient(180deg, ${p.cornice}, ${p.frame})`,
          borderRadius: "22px 22px 6px 6px",
          boxShadow: "inset 0 3px 0 rgba(255,255,255,0.22), 0 4px 10px rgba(90,60,30,0.2)",
          margin: "0 -12px",
        }}
      />
      <div
        style={{
          background: `linear-gradient(180deg, ${p.bodyTop}, ${p.bodyBottom})`,
          border: `9px solid ${p.frame}`,
          borderTop: "none",
          borderRadius: "6px 6px 14px 14px",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          boxShadow: "0 22px 48px rgba(90,60,30,0.3)",
        }}
      >
        {tiroirs.map((t) => (
          <Drawer
            key={t.key}
            tiroir={t}
            isOpen={!!open[t.key]}
            onToggle={() => setOpen((o) => ({ ...o, [t.key]: !o[t.key] }))}
            editable={editable && t.key !== "moodailles"}
            onMove={onMove}
            onPhoto={onPhoto}
            onZoom={setZoom}
            palette={p}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 24px" }}>
        <span style={foot(p.frame)} />
        <span style={foot(p.frame)} />
      </div>

      {/* Zoom carte moodaille — la cliente clique l'icône, la carte s'affiche en grand pour bien la lire */}
      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(40,30,20,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fffdfb", borderRadius: 18, padding: 16, maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setZoom(null)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: "#6b4f33" }}>✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.card || zoom.image || ""} alt={zoom.title} style={{ width: "100%", borderRadius: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }} />
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>{zoom.title}</div>
            {zoom.avantage && <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>{zoom.avantage}</div>}
            {zoom.code && <div style={{ fontSize: 13, marginTop: 10, letterSpacing: 1, background: "#f6f1ea", borderRadius: 8, padding: "8px 10px", fontWeight: 600 }}>Code : {zoom.code}</div>}
            {zoom.rarete && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8, textTransform: "uppercase", letterSpacing: 1 }}>{zoom.rarete}</div>}
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 10 }}>⚠️ Carte personnelle — ne partage pas ton code 🤍</div>
          </div>
        </div>
      )}
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
  onZoom,
  palette,
}: {
  tiroir: Tiroir;
  isOpen: boolean;
  onToggle: () => void;
  editable: boolean;
  onMove?: (key: string, tiroirKey: string) => void;
  onPhoto?: (key: string, dataUrl: string) => void;
  onZoom?: (piece: Piece) => void;
  palette: ArmoirePalette;
}) {
  const [dropHover, setDropHover] = useState(false);
  const p = palette;
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
          border: `2px solid ${p.faceBorder}`,
          borderRadius: 12,
          padding: "10px 18px",
          background: `linear-gradient(180deg, ${p.faceTop}, ${p.faceBottom})`,
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
            color: p.label === "#f2ece2" ? "#6b4f33" : p.label,
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
              <PieceCell key={i} piece={p} editable={editable} onPhoto={onPhoto} onZoom={onZoom} />
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
  onZoom,
}: {
  piece: Piece;
  editable: boolean;
  onPhoto?: (key: string, dataUrl: string) => void;
  onZoom?: (piece: Piece) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const k = keyOf(piece);
  const isMoodaille = Boolean(piece.card);

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
        onClick={isMoodaille ? () => onZoom?.(piece) : undefined}
        style={{ ...pieceBox(), position: "relative", cursor: isMoodaille ? "zoom-in" : editable ? "grab" : "default" }}
        title={isMoodaille ? "Clique pour voir ta carte en grand" : editable ? "Glisse-moi sur un tiroir pour me ranger" : undefined}
      >
        {piece.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={piece.image} alt={piece.title} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
        ) : (
          <span style={{ fontSize: 24 }}>💍</span>
        )}
        {isMoodaille && (
          <span style={{ position: "absolute", bottom: 3, right: 3, fontSize: 11, background: "rgba(255,255,255,0.9)", borderRadius: 999, padding: "1px 6px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>🔍</span>
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
  return { width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #f3dca0, #a9802f)", boxShadow: "0 1px 2px rgba(0,0,0,0.3)", flexShrink: 0 };
}
function foot(color: string): React.CSSProperties {
  return { width: 26, height: 14, background: color, filter: "brightness(0.85)", borderRadius: "0 0 8px 8px" };
}
function camBtn(): React.CSSProperties {
  return { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", fontSize: 12, lineHeight: "20px", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" };
}
function plusOverlay(): React.CSSProperties {
  return { position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", border: "none", background: "rgba(107,79,51,0.85)", color: "#fff", fontSize: 11, padding: "3px 8px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap" };
}
