"use client";

import React from "react";
import { DECO } from "@/lib/armoire-catalog";

/* La pièce : la commode mood dans un décor qui se garnit au fil des commandes.
   Mur / sol / couleur de commode = choix unique (active). Plantes / cadres / objets
   débloqués = posés automatiquement dans la pièce. */

export type Active = { mur?: string; sol?: string; armoire?: string };

function valueOf(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  const d = DECO.find((x) => x.id === id);
  return d?.valeur ?? fallback;
}

export function Room({ unlocked, active }: { unlocked: string[]; active: Active }) {
  const mur = valueOf(active.mur, "#f6efe6");
  const sol = valueOf(active.sol, "#e4cfa8");
  const armoire = valueOf(active.armoire, "#8f6440");

  const set = new Set(unlocked);
  const placed = DECO.filter((d) => set.has(d.id));
  const plantes = placed.filter((d) => d.type === "plante");
  const cadres = placed.filter((d) => d.type === "cadre");
  const objets = placed.filter((d) => d.type === "objet");

  return (
    <div
      style={{
        position: "relative",
        height: 380,
        borderRadius: 16,
        overflow: "hidden",
        background: mur,
        border: "1px solid #e6dccd",
        boxShadow: "inset 0 0 40px rgba(120,90,50,0.06)",
      }}
    >
      {/* cadres au mur */}
      <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
        {cadres.map((c, i) => (
          <span key={i} style={{ fontSize: 40 }}>{c.valeur}</span>
        ))}
      </div>

      {/* miroir (objet) au mur, à droite */}
      {objets.some((o) => o.id === "miroir") && (
        <span style={{ position: "absolute", top: 60, right: 22, fontSize: 40 }}>🪞</span>
      )}
      {/* lampe suspendue */}
      {objets.some((o) => o.id === "lampe") && (
        <span style={{ position: "absolute", top: 8, left: 26, fontSize: 34 }}>💡</span>
      )}

      {/* sol */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", background: sol }} />

      {/* tapis */}
      {objets.some((o) => o.id === "tapis") && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 240,
            height: 46,
            borderRadius: "50%",
            background: "rgba(150,110,70,0.35)",
            filter: "blur(1px)",
          }}
        />
      )}

      {/* LA COMMODE */}
      <div
        style={{
          position: "absolute",
          bottom: "26%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 180,
        }}
      >
        <Commode color={armoire} />
      </div>

      {/* plantes au sol, de part et d'autre */}
      {plantes[0] && <span style={{ position: "absolute", bottom: "24%", left: 24, fontSize: 52 }}>{plantes[0].valeur}</span>}
      {plantes[1] && <span style={{ position: "absolute", bottom: "24%", right: 24, fontSize: 52 }}>{plantes[1].valeur}</span>}
      {plantes[2] && (
        <span style={{ position: "absolute", bottom: "23%", left: "50%", transform: "translateX(60px)", fontSize: 40 }}>
          {plantes[2].valeur}
        </span>
      )}

      {/* bougie posée sur la commode */}
      {objets.some((o) => o.id === "bougie") && (
        <span style={{ position: "absolute", bottom: "52%", left: "50%", transform: "translateX(46px)", fontSize: 22 }}>🕯️</span>
      )}

      {unlocked.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 18 }}>
          <span style={{ fontSize: 13, opacity: 0.55, background: "rgba(255,255,255,0.6)", padding: "4px 10px", borderRadius: 999 }}>
            Débloque des objets pour décorer ta pièce 🤍
          </span>
        </div>
      )}
    </div>
  );
}

function Commode({ color }: { color: string }) {
  const dark = "rgba(0,0,0,0.18)";
  return (
    <div style={{ borderRadius: "6px 6px 4px 4px", overflow: "hidden", boxShadow: "0 10px 20px rgba(80,55,30,0.25)" }}>
      <div style={{ height: 8, background: color, filter: "brightness(0.9)" }} />
      {[0, 1, 2].map((r) => (
        <div
          key={r}
          style={{
            background: color,
            borderTop: `1px solid ${dark}`,
            padding: "10px 12px",
            display: "flex",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <span style={knob()} />
          <span style={knob()} />
        </div>
      ))}
      {/* pieds */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 16px" }}>
        <span style={{ width: 14, height: 10, background: color, filter: "brightness(0.7)", borderRadius: "0 0 6px 6px" }} />
        <span style={{ width: 14, height: 10, background: color, filter: "brightness(0.7)", borderRadius: "0 0 6px 6px" }} />
      </div>
    </div>
  );
}

function knob(): React.CSSProperties {
  return { width: 12, height: 12, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #f3dca0, #a9802f)", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" };
}
