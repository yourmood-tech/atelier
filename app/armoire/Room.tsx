"use client";

import React, { useRef } from "react";
import { DECO, ARMOIRE_PALETTES } from "@/lib/armoire-catalog";
import { Cabinet, type Tiroir } from "./Cabinet";

/* La pièce : la VRAIE armoire centrale (à tiroirs), recolorée, dans un décor
   photoréaliste. Chaque accessoire est DÉPLAÇABLE et AGRANDISSABLE (sauvegardé). */

export type Active = { mur?: string; sol?: string; armoire?: string };
export type Layout = Record<string, { left: number; top: number; w: number }>; // % du cadre

function val(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  return DECO.find((x) => x.id === id)?.valeur ?? fallback;
}

// Emplacement par défaut d'un accessoire selon son slot (centre en %, largeur en %).
function defaultPos(slot: string | undefined): { left: number; top: number; w: number } {
  switch (slot) {
    case "sol-gauche": return { left: 11, top: 60, w: 22 };
    case "sol-droite": return { left: 89, top: 60, w: 22 };
    case "table-gauche": return { left: 12, top: 76, w: 18 };
    case "mur-haut": return { left: 50, top: 12, w: 44 };
    case "mur-droite": return { left: 87, top: 36, w: 20 };
    case "etagere": return { left: 87, top: 12, w: 20 };
    case "sol-centre-droite": return { left: 70, top: 80, w: 14 };
    default: return { left: 14, top: 72, w: 16 };
  }
}

export function Room({
  tiroirs,
  open,
  setOpen,
  unlocked,
  active,
  editable = false,
  onMove,
  onPhoto,
  layout = {},
  onLayout,
}: {
  tiroirs: Tiroir[];
  open: Record<string, boolean>;
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  unlocked: string[];
  active: Active;
  editable?: boolean;
  onMove?: (key: string, tiroirKey: string) => void;
  onPhoto?: (key: string, dataUrl: string) => void;
  layout?: Layout;
  onLayout?: (id: string, pos: { left: number; top: number; w: number }) => void;
}) {
  const mur = val(active.mur, "linear-gradient(180deg,#f7f0e6,#efe6d6)");
  const sol = val(active.sol, "repeating-linear-gradient(90deg,#e6cfa6,#e6cfa6 20px,#dcc298 20px,#dcc298 21px)");
  const paletteKey = active.armoire ? val(active.armoire, "noyer") : "noyer";
  const palette = ARMOIRE_PALETTES[paletteKey] ?? ARMOIRE_PALETTES.noyer;
  const boxRef = useRef<HTMLDivElement>(null);

  const set = new Set(unlocked);
  const accessoires = DECO.filter((d) => d.img && set.has(d.id));

  return (
    <div
      ref={boxRef}
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        background: mur,
        border: "1px solid #e6dccd",
        paddingTop: 70, // espace mur pour les posters au-dessus de la commode
        minHeight: 460,
      }}
    >
      {/* sol */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, background: sol, zIndex: 0 }} />

      {/* LA VRAIE ARMOIRE, recolorée — large et basse */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "0 12px 28px" }}>
        <Cabinet
          tiroirs={tiroirs}
          open={open}
          setOpen={setOpen}
          palette={palette}
          editable={editable}
          onMove={onMove}
          onPhoto={onPhoto}
        />
      </div>

      {/* ACCESSOIRES déplaçables + agrandissables */}
      {accessoires.map((a) => (
        <AccessoryItem
          key={a.id}
          id={a.id}
          src={a.img!}
          alt={a.nom}
          pos={layout[a.id] ?? defaultPos(a.slot)}
          editable={editable}
          boxRef={boxRef}
          onLayout={onLayout}
        />
      ))}

      {accessoires.length === 0 && (
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 5 }}>
          <span style={{ fontSize: 13, opacity: 0.7, background: "rgba(255,255,255,0.7)", padding: "4px 12px", borderRadius: 999 }}>
            Débloque des accessoires pour décorer la pièce de ton armoire 🤍
          </span>
        </div>
      )}
    </div>
  );
}

function AccessoryItem({
  id,
  src,
  alt,
  pos,
  editable,
  boxRef,
  onLayout,
}: {
  id: string;
  src: string;
  alt: string;
  pos: { left: number; top: number; w: number };
  editable: boolean;
  boxRef: React.RefObject<HTMLDivElement | null>;
  onLayout?: (id: string, pos: { left: number; top: number; w: number }) => void;
}) {
  const dragging = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (!editable) return;
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!editable || !dragging.current || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const left = Math.min(98, Math.max(2, ((e.clientX - r.left) / r.width) * 100));
    const top = Math.min(98, Math.max(2, ((e.clientY - r.top) / r.height) * 100));
    onLayout?.(id, { ...pos, left, top });
  }
  function onPointerUp() {
    dragging.current = false;
  }
  function resize(delta: number) {
    onLayout?.(id, { ...pos, w: Math.min(70, Math.max(6, pos.w + delta)) });
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: `${pos.w}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 3,
        touchAction: "none",
        cursor: editable ? "move" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} style={{ width: "100%", height: "auto", display: "block", pointerEvents: "none", userSelect: "none" }} />
      {editable && (
        <div style={{ position: "absolute", top: -10, right: -10, display: "flex", gap: 4 }}>
          <button onClick={() => resize(+3)} style={rzBtn()} aria-label="agrandir">＋</button>
          <button onClick={() => resize(-3)} style={rzBtn()} aria-label="réduire">－</button>
        </div>
      )}
    </div>
  );
}

function rzBtn(): React.CSSProperties {
  return { width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.95)", color: "#6b4f33", fontSize: 14, lineHeight: "22px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", padding: 0 };
}
