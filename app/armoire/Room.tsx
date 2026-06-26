"use client";

import React from "react";
import { DECO, ARMOIRE_PALETTES } from "@/lib/armoire-catalog";
import { Cabinet, type Tiroir } from "./Cabinet";
import { DecoArt } from "./DecoArt";

/* La pièce : la VRAIE armoire centrale (à tiroirs), recolorée, dans un décor
   qui se garnit au fil des commandes (mur, sol, plantes, cadres, objets). */

export type Active = { mur?: string; sol?: string; armoire?: string };

function val(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  return DECO.find((x) => x.id === id)?.valeur ?? fallback;
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
  const placed = DECO.filter((d) => set.has(d.id));
  const plantes = placed.filter((d) => d.type === "plante");
  const cadres = placed.filter((d) => d.type === "cadre");
  const has = (id: string) => set.has(id);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        background: mur,
        border: "1px solid #e6dccd",
        padding: "26px 16px 0",
      }}
    >
      {/* décor mural */}
      <div style={{ position: "absolute", top: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 20, zIndex: 2 }}>
        {cadres.map((c, i) => (
          <DecoArt key={i} kind="cadre" size={84} />
        ))}
        {has("miroir") && <DecoArt kind="miroir" size={84} />}
      </div>
      {has("lampe") && (
        <div style={{ position: "absolute", top: 6, left: 14, zIndex: 2 }}>
          <DecoArt kind="lampe" size={86} />
        </div>
      )}

      {/* sol */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 70, background: sol, zIndex: 0 }} />
      {/* tapis */}
      {has("tapis") && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 280,
            height: 40,
            borderRadius: "50%",
            background: "rgba(150,110,70,0.28)",
            zIndex: 0,
          }}
        />
      )}

      {/* plantes au sol */}
      {plantes[0] && (
        <div style={{ position: "absolute", bottom: 8, left: 6, zIndex: 3 }}>
          <DecoArt kind={plantes[0].valeur} size={120} />
        </div>
      )}
      {plantes[1] && (
        <div style={{ position: "absolute", bottom: 8, right: 6, zIndex: 3 }}>
          <DecoArt kind={plantes[1].valeur} size={120} />
        </div>
      )}

      {/* LA VRAIE ARMOIRE, recolorée */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 360, margin: "0 auto", paddingBottom: 24 }}>
        <Cabinet
          tiroirs={tiroirs}
          open={open}
          setOpen={setOpen}
          palette={palette}
          editable={editable}
          onMove={onMove}
          onPhoto={onPhoto}
        />
        {/* bougie posée dessus */}
        {has("bougie") && (
          <div style={{ position: "absolute", top: -6, right: 70, zIndex: 4 }}>
            <DecoArt kind="bougie" size={46} />
          </div>
        )}
      </div>

      {/* 3e plante devant si débloquée */}
      {plantes[2] && (
        <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(90px)", zIndex: 4 }}>
          <DecoArt kind={plantes[2].valeur} size={84} />
        </div>
      )}

      {unlocked.length === 0 && (
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 5 }}>
          <span style={{ fontSize: 13, opacity: 0.7, background: "rgba(255,255,255,0.7)", padding: "4px 12px", borderRadius: 999 }}>
            Débloque des objets pour décorer la pièce de ton armoire 🤍
          </span>
        </div>
      )}
    </div>
  );
}
