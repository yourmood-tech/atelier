"use client";

import React, { useEffect, useState } from "react";

const ENCRE = "#3a3330";

type Opt = { id: string; label: string };
type Entry = { age?: string; teint: string; coiffure: string; couleur: string; file: string };
type Manifest = { ages?: Opt[]; teints: Opt[]; coiffures: Opt[]; couleurs: Opt[]; avatars: Entry[] };
export type AvatarPick = { age: string; teint: string; coiffure: string; couleur: string };

export function AvatarStudio({
  pick,
  onPick,
  avatarOn,
  onToggleRoom,
}: {
  pick: AvatarPick | null;
  onPick: (pick: AvatarPick, image: string | null) => void;
  avatarOn: boolean;
  onToggleRoom: (on: boolean) => void;
}) {
  const [man, setMan] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/avatars/avatars.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Manifest | null) => setMan(m))
      .catch(() => setMan(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={card()}>On prépare les avatars… ✨</div>;
  if (!man || !man.avatars.length) {
    return (
      <div style={card()}>
        <h2 style={h2()}>🧍 Mon avatar</h2>
        <p style={{ opacity: 0.75, lineHeight: 1.6 }}>
          Les avatars sont en cours de préparation 🤍 Reviens dans un petit moment, tu pourras créer ta « mini-moi ».
        </p>
      </div>
    );
  }

  const ages: Opt[] = man.ages?.length ? man.ages : [{ id: "jeune", label: "Jeune" }];
  const cur: AvatarPick = pick
    ? { age: pick.age ?? ages[0].id, teint: pick.teint, coiffure: pick.coiffure, couleur: pick.couleur }
    : { age: ages[0].id, teint: man.teints[0].id, coiffure: man.coiffures[0].id, couleur: man.couleurs[0].id };
  const fileFor = (p: AvatarPick) => man.avatars.find((a) => (a.age ?? "jeune") === p.age && a.teint === p.teint && a.coiffure === p.coiffure && a.couleur === p.couleur)?.file ?? null;
  const has = (p: AvatarPick) => !!fileFor(p);
  const choose = (patch: Partial<AvatarPick>) => {
    const next = { ...cur, ...patch };
    onPick(next, fileFor(next));
  };
  const img = fileFor(cur);

  return (
    <div style={card()}>
      <h2 style={h2()}>🧍 Mon avatar</h2>
      <p style={{ opacity: 0.75, marginTop: 0, fontSize: 14, lineHeight: 1.6 }}>
        Compose ta « mini-moi » 🤍 Choisis ton teint, ta coiffure et ta couleur de cheveux — elle vivra dans ta chambre.
      </p>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* APERÇU */}
        <div style={{ width: 220, maxWidth: "44vw", margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(180deg,#f7f0e6,#efe6d6)", borderRadius: 16, padding: 10, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {img ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={img} alt="Mon avatar" style={{ width: "100%", borderRadius: 12, display: "block" }} />
            ) : (
              <span style={{ fontSize: 13, opacity: 0.6, textAlign: "center", padding: 16 }}>Cette combinaison arrive bientôt 🤍<br />choisis-en une autre</span>
            )}
          </div>
          <button
            onClick={() => onToggleRoom(!avatarOn)}
            disabled={!img}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "11px 14px",
              borderRadius: 999,
              border: "none",
              background: !img ? "#d8cdbf" : avatarOn ? "#3a8a4a" : ENCRE,
              color: "#fff",
              fontSize: 14,
              cursor: img ? "pointer" : "default",
            }}
          >
            {avatarOn ? "✓ Dans ma chambre" : "Mettre dans ma chambre"}
          </button>
        </div>

        {/* CHOIX */}
        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 16 }}>
          {ages.length > 1 && (
            <Picker label="Âge" options={ages} value={cur.age} onPick={(id) => choose({ age: id })} avail={(id) => has({ ...cur, age: id })} />
          )}
          <Picker label="Teint" options={man.teints} value={cur.teint} onPick={(id) => choose({ teint: id })} avail={(id) => has({ ...cur, teint: id })} />
          <Picker label="Coiffure" options={man.coiffures} value={cur.coiffure} onPick={(id) => choose({ coiffure: id })} avail={(id) => has({ ...cur, coiffure: id })} />
          <Picker label="Couleur de cheveux" options={man.couleurs} value={cur.couleur} onPick={(id) => choose({ couleur: id })} avail={(id) => has({ ...cur, couleur: id })} />
        </div>
      </div>
    </div>
  );
}

function Picker({ label, options, value, onPick, avail }: { label: string; options: Opt[]; value: string; onPick: (id: string) => void; avail: (id: string) => boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {options.map((o) => {
          const ok = avail(o.id);
          const active = value === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              title={ok ? o.label : `${o.label} — bientôt`}
              style={{
                padding: "7px 13px",
                borderRadius: 999,
                border: active ? "none" : "1px solid #e0d6ca",
                background: active ? ENCRE : "#fff",
                color: active ? "#fff" : ENCRE,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: active ? 600 : 400,
                opacity: ok ? 1 : 0.45,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function card(): React.CSSProperties {
  return { background: "#fffdfb", border: "1px solid #efe7dd", borderRadius: 20, padding: 22, marginTop: 16 };
}
function h2(): React.CSSProperties {
  return { fontSize: 18, fontWeight: 500, margin: "0 0 4px" };
}
