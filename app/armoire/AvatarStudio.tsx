"use client";

import React from "react";
import {
  Avatar,
  type AvatarConfig,
  AVATAR_SKINS,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_STYLES,
  AVATAR_EYES,
  AVATAR_OUTFITS,
  AVATAR_GLASSES,
} from "./Avatar";

const ENCRE = "#3a3330";

export function AvatarStudio({
  config,
  onChange,
  avatarOn,
  onToggleRoom,
}: {
  config: AvatarConfig;
  onChange: (c: AvatarConfig) => void;
  avatarOn: boolean;
  onToggleRoom: (on: boolean) => void;
}) {
  const set = (patch: Partial<AvatarConfig>) => onChange({ ...config, ...patch });

  return (
    <div style={{ background: "#fffdfb", border: "1px solid #efe7dd", borderRadius: 20, padding: 22, marginTop: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px" }}>🧍 Mon avatar</h2>
      <p style={{ opacity: 0.75, marginTop: 0, fontSize: 14, lineHeight: 1.6 }}>
        Crée ta « mini-moi » 🤍 Choisis ton style, elle vivra dans ta chambre et portera tes bagues mood.
      </p>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* APERÇU */}
        <div style={{ flexShrink: 0, width: 200, maxWidth: "40vw", margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(180deg,#f7f0e6,#efe6d6)", borderRadius: 16, padding: 12 }}>
            <Avatar config={config} />
          </div>
          <button
            onClick={() => onToggleRoom(!avatarOn)}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "11px 14px",
              borderRadius: 999,
              border: "none",
              background: avatarOn ? "#3a8a4a" : ENCRE,
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {avatarOn ? "✓ Dans ma chambre" : "Mettre dans ma chambre"}
          </button>
        </div>

        {/* RÉGLAGES */}
        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="Teint">
            {AVATAR_SKINS.map((s) => (
              <Swatch key={s.id} color={s.v} active={config.skin === s.v} onClick={() => set({ skin: s.v })} />
            ))}
          </Row>

          <Row label="Coiffure">
            {AVATAR_HAIR_STYLES.map((h) => (
              <Chip key={h.id} active={config.hairStyle === h.id} onClick={() => set({ hairStyle: h.id })}>
                {h.label}
              </Chip>
            ))}
          </Row>

          <Row label="Couleur cheveux">
            {AVATAR_HAIR_COLORS.map((c) => (
              <Swatch key={c.id} color={c.v} active={config.hairColor === c.v} onClick={() => set({ hairColor: c.v })} />
            ))}
          </Row>

          <Row label="Yeux">
            {AVATAR_EYES.map((e) => (
              <Swatch key={e.id} color={e.v} active={config.eyes === e.v} onClick={() => set({ eyes: e.v })} />
            ))}
          </Row>

          <Row label="Tenue">
            {AVATAR_OUTFITS.map((o) => (
              <Swatch key={o.id} color={o.v} active={config.outfit === o.v} onClick={() => set({ outfit: o.v })} />
            ))}
          </Row>

          <Row label="Lunettes">
            {AVATAR_GLASSES.map((g) => (
              <Chip key={g.id} active={config.glasses === g.id} onClick={() => set({ glasses: g.id })}>
                {g.label}
              </Chip>
            ))}
          </Row>

          <Row label="Taches de rousseur">
            <Chip active={!config.freckles} onClick={() => set({ freckles: false })}>Non</Chip>
            <Chip active={config.freckles} onClick={() => set({ freckles: true })}>Oui</Chip>
          </Row>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{children}</div>
    </div>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: color,
        border: active ? "2.5px solid #3a3330" : "1px solid #d9cdbf",
        cursor: "pointer",
        padding: 0,
      }}
    />
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 13px",
        borderRadius: 999,
        border: active ? "none" : "1px solid #e0d6ca",
        background: active ? ENCRE : "#fff",
        color: active ? "#fff" : ENCRE,
        fontSize: 13,
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}
