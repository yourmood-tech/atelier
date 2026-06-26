"use client";

import React from "react";
import { DECO, ARMOIRE_PALETTES } from "@/lib/armoire-catalog";
import { Cabinet, type Tiroir } from "./Cabinet";

/* La pièce : la VRAIE armoire centrale (à tiroirs), recolorée, dans un décor
   photoréaliste qui se garnit au fil des commandes (accessoires en images). */

export type Active = { mur?: string; sol?: string; armoire?: string };

function val(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  return DECO.find((x) => x.id === id)?.valeur ?? fallback;
}

// Emplacements des accessoires dans la pièce.
function slotStyle(slot: string | undefined): React.CSSProperties {
  switch (slot) {
    case "sol-gauche":
      return { position: "absolute", left: "1%", bottom: 0, width: "26%", zIndex: 3 };
    case "sol-droite":
      return { position: "absolute", right: "1%", bottom: 0, width: "26%", zIndex: 3 };
    case "table-gauche":
      return { position: "absolute", left: "3%", bottom: "4%", width: "20%", zIndex: 3 };
    case "mur-haut":
      return { position: "absolute", left: "50%", top: "2%", transform: "translateX(-50%)", width: "46%", zIndex: 2 };
    case "mur-droite":
      return { position: "absolute", right: "2%", top: "16%", width: "22%", zIndex: 2 };
    case "etagere":
      return { position: "absolute", right: "2%", top: "2%", width: "22%", zIndex: 2 };
    case "sol-centre-droite":
      return { position: "absolute", right: "20%", bottom: 0, width: "16%", zIndex: 4 };
    default:
      return { position: "absolute", left: "2%", bottom: 0, width: "22%", zIndex: 3 };
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
}: {
  tiroirs: Tiroir[];
  open: Record<string, boolean>;
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  unlocked: string[];
  active: Active;
  editable?: boolean;
  onMove?: (key: string, tiroirKey: string) => void;
  onPhoto?: (key: string, dataUrl: string) => void;
}) {
  const mur = val(active.mur, "linear-gradient(180deg,#f7f0e6,#efe6d6)");
  const sol = val(active.sol, "repeating-linear-gradient(90deg,#e6cfa6,#e6cfa6 20px,#dcc298 20px,#dcc298 21px)");
  const paletteKey = active.armoire ? val(active.armoire, "noyer") : "noyer";
  const palette = ARMOIRE_PALETTES[paletteKey] ?? ARMOIRE_PALETTES.noyer;

  const set = new Set(unlocked);
  // accessoires photoréalistes débloqués (image + emplacement)
  const accessoires = DECO.filter((d) => d.img && set.has(d.id));

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        background: mur,
        border: "1px solid #e6dccd",
        padding: "26px 16px 0",
        minHeight: 420,
      }}
    >
      {/* sol */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, background: sol, zIndex: 0 }} />

      {/* accessoires posés derrière l'armoire (mur, étagère) */}
      {accessoires
        .filter((a) => a.slot === "mur-haut" || a.slot === "mur-droite" || a.slot === "etagere")
        .map((a) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={a.id} src={a.img} alt={a.nom} style={slotStyle(a.slot)} />
        ))}

      {/* LA VRAIE ARMOIRE, recolorée — large et massive */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", paddingBottom: 28 }}>
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

      {/* accessoires posés au sol (devant) */}
      {accessoires
        .filter((a) => !(a.slot === "mur-haut" || a.slot === "mur-droite" || a.slot === "etagere"))
        .map((a) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={a.id} src={a.img} alt={a.nom} style={slotStyle(a.slot)} />
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
