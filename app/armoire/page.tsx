"use client";

import { useState, useEffect, useMemo } from "react";

/* Mon Armoire Mood — espace client (V1)
   Connexion : email + numéro de commande (preuve de propriété → on ne peut pas
   ouvrir l'armoire d'une autre). Armoire = des PORTES par catégorie qu'on ouvre,
   bagues en grille à l'intérieur. Le "mood du jour" est gardé en local (V1). */

type Piece = { title: string; image: string | null; date: string; quantity: number };
type Tiroir = { key: string; label: string; emoji: string; pieces: Piece[] };
type Vignette = { id: string; nom: string; emoji: string };
type Palier = { seuil: number; recompense: string };
type Data = {
  prenom: string;
  stats: { commandes: number; pieces: number; totalDepense: number; devise: string };
  tiroirs: Tiroir[];
  jeu: {
    album: { nom: string; emoji: string; vignettes: Vignette[] };
    vignettesAchat: number;
    palier: { depense: number; devise: string; prochain: Palier | null; recompensesDebloquees: string[] };
  };
};

const IVOIRE = "#fbf7f2";
const ENCRE = "#3a3330";
const BOIS = "#e9ddcb"; // ton "porte" chaleureux

export default function ArmoirePage() {
  const [status, setStatus] = useState<"connexion" | "chargement" | "espace" | "introuvable" | "refus" | "erreur">(
    "connexion"
  );
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [commande, setCommande] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [moodDuJour, setMoodDuJour] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const emailKey = email.trim().toLowerCase();
  const today = () => new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!emailKey) return;
    try {
      const md = JSON.parse(localStorage.getItem(`armoire:mooddujour:${emailKey}`) || "{}");
      setMoodDuJour(typeof md.count === "number" ? md.count : 0);
    } catch {
      /* ignore */
    }
  }, [emailKey]);

  const moodDuJourFait = useMemo(() => {
    if (!emailKey) return false;
    try {
      const raw = JSON.parse(localStorage.getItem(`armoire:mooddujour:${emailKey}`) || "{}");
      return raw.last === today();
    } catch {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailKey, moodDuJour]);

  function faitMoodDuJour() {
    try {
      const raw = JSON.parse(localStorage.getItem(`armoire:mooddujour:${emailKey}`) || "{}");
      if (raw.last === today()) return;
      const count = (typeof raw.count === "number" ? raw.count : 0) + 1;
      localStorage.setItem(`armoire:mooddujour:${emailKey}`, JSON.stringify({ count, last: today() }));
      setMoodDuJour(count);
    } catch {
      /* ignore */
    }
  }

  async function ouvrir(e: React.FormEvent) {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email) || !commande.replace(/\D/g, "")) return;
    setStatus("chargement");
    try {
      const res = await fetch("/api/armoire/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber: commande }),
      });
      const json = await res.json();
      if (!res.ok) return setStatus("erreur");
      if (!json.found) return setStatus("introuvable");
      if (!json.verified) return setStatus("refus");
      setData(json);
      setStatus("espace");
    } catch {
      setStatus("erreur");
    }
  }

  function deconnexion() {
    setData(null);
    setStatus("connexion");
    setPrenom("");
    setEmail("");
    setCommande("");
    setOpen({});
  }

  const totalVignettes = (data?.jeu.vignettesAchat ?? 0) + moodDuJour;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at 50% 0%, #ffffff, ${IVOIRE})`,
        color: ENCRE,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        padding: "0 18px 64px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ textAlign: "center", padding: "40px 0 8px" }}>
          <div style={{ fontSize: 13, letterSpacing: 4, textTransform: "uppercase", opacity: 0.55 }}>mood</div>
          <h1 style={{ fontSize: 30, fontWeight: 300, margin: "6px 0 0", letterSpacing: 1 }}>
            Mon armoire <span style={{ fontWeight: 500 }}>mood</span> 🤍
          </h1>
        </header>

        {status === "connexion" && (
          <form onSubmit={ouvrir} style={narrowCard()}>
            <p style={{ opacity: 0.7, lineHeight: 1.6, marginTop: 0 }}>
              Pour ouvrir TON armoire en toute sécurité, entre ton email et un numéro de commande
              (il est sur chaque email de confirmation, ex. #392523).
            </p>
            <input style={input()} placeholder="Ton prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            <input style={input()} placeholder="Ton email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input style={input()} placeholder="Un numéro de commande (ex. 392523)" value={commande} onChange={(e) => setCommande(e.target.value)} />
            <button type="submit" style={btn()}>Ouvrir mon armoire</button>
          </form>
        )}

        {status === "chargement" && <div style={narrowCard()}>On ouvre ton armoire… ✨</div>}

        {status === "introuvable" && (
          <div style={narrowCard()}>
            <p style={{ lineHeight: 1.6 }}>
              On ne retrouve pas encore de commande à cet email 🤍 Vérifie l&apos;adresse, ou reviens après ta première pépite.
            </p>
            <button style={btnLight()} onClick={() => setStatus("connexion")}>Réessayer</button>
          </div>
        )}

        {status === "refus" && (
          <div style={narrowCard()}>
            <p style={{ lineHeight: 1.6 }}>
              Ce numéro de commande ne correspond pas à cet email 🔒 Pour ta sécurité, on n&apos;ouvre l&apos;armoire
              qu&apos;avec les deux. Reprends un numéro sur un de tes emails de confirmation.
            </p>
            <button style={btnLight()} onClick={() => setStatus("connexion")}>Réessayer</button>
          </div>
        )}

        {status === "erreur" && (
          <div style={narrowCard()}>
            <p>Petit souci de notre côté 🥲 Réessaie dans un instant.</p>
            <button style={btnLight()} onClick={() => setStatus("connexion")}>Retour</button>
          </div>
        )}

        {status === "espace" && data && (
          <>
            <div style={{ ...card(), textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 400 }}>Bonjour {data.prenom || prenom} 🤍</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 18 }}>
                <Stat n={data.stats.commandes} label="commandes" />
                <Stat n={data.stats.pieces} label="pièces" />
                <Stat n={totalVignettes} label="vignettes" />
              </div>
            </div>

            {/* ARMOIRE À PORTES */}
            <div style={card()}>
              <h2 style={h2()}>Mon armoire</h2>
              <p style={{ opacity: 0.65, marginTop: 0, fontSize: 13 }}>Touche une porte pour l&apos;ouvrir 👇</p>
              {data.tiroirs.length === 0 && (
                <p style={{ opacity: 0.7 }}>Ta collection arrive — elle se remplira à ta prochaine pépite.</p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
                {data.tiroirs.map((t) => (
                  <Porte
                    key={t.key}
                    tiroir={t}
                    isOpen={!!open[t.key]}
                    onToggle={() => setOpen((o) => ({ ...o, [t.key]: !o[t.key] }))}
                  />
                ))}
              </div>
            </div>

            {/* MOOD DU JOUR */}
            <div style={card()}>
              <h2 style={h2()}>Ton mood du jour ☀️</h2>
              <p style={{ opacity: 0.7, marginTop: 0, lineHeight: 1.6 }}>
                Un petit geste chaque jour = une vignette de plus.
              </p>
              <button style={moodDuJourFait ? btnDone() : btn()} disabled={moodDuJourFait} onClick={faitMoodDuJour}>
                {moodDuJourFait ? "Mood du jour fait ✓ — à demain 🤍" : "Faire mon mood du jour (+1 vignette)"}
              </button>
            </div>

            {/* COLLECTION */}
            <div style={card()}>
              <h2 style={h2()}>{data.jeu.album.emoji} {data.jeu.album.nom}</h2>
              <p style={{ opacity: 0.7, marginTop: 0 }}>
                {Math.min(totalVignettes, data.jeu.album.vignettes.length)} / {data.jeu.album.vignettes.length} vignettes
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                {data.jeu.album.vignettes.map((v, i) => {
                  const unlocked = i < totalVignettes;
                  return (
                    <div key={v.id} style={vignetteCell(unlocked)}>
                      <div style={{ fontSize: 30, filter: unlocked ? "none" : "grayscale(1)" }}>{unlocked ? v.emoji : "🔒"}</div>
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.75 }}>{unlocked ? v.nom : "à gagner"}</div>
                    </div>
                  );
                })}
              </div>
              {totalVignettes >= data.jeu.album.vignettes.length && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fff4f6", fontSize: 14 }}>
                  🎉 Album complété ! Tu débloques une pépite Hibiscus en avant-première.
                </div>
              )}
            </div>

            {/* RECOMPENSES */}
            <div style={card()}>
              <h2 style={h2()}>Mes récompenses</h2>
              {data.jeu.palier.recompensesDebloquees.map((r, i) => (
                <div key={i} style={{ fontSize: 14, marginBottom: 6 }}>✅ {r}</div>
              ))}
              {data.jeu.palier.prochain ? (
                <>
                  <div style={{ fontSize: 14, marginTop: 8, opacity: 0.8 }}>
                    Prochain palier à {data.jeu.palier.prochain.seuil} {data.jeu.palier.devise} — {data.jeu.palier.prochain.recompense}
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "#eee3d8", marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, Math.round((data.jeu.palier.depense / data.jeu.palier.prochain.seuil) * 100))}%`, background: ENCRE }} />
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
                    {data.jeu.palier.depense} / {data.jeu.palier.prochain.seuil} {data.jeu.palier.devise}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, marginTop: 8 }}>Tu as débloqué tous les paliers de la saison 👑</div>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button style={btnLight()} onClick={deconnexion}>Me déconnecter</button>
            </div>
          </>
        )}

        <footer style={{ textAlign: "center", fontSize: 11, opacity: 0.4, marginTop: 30 }}>
          Mon Armoire Mood · prototype V1
        </footer>
      </div>
    </main>
  );
}

function Porte({ tiroir, isOpen, onToggle }: { tiroir: Tiroir; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #e6dccd", background: "#fff" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          border: "none",
          cursor: "pointer",
          padding: "18px 12px",
          background: isOpen ? "#fff" : `linear-gradient(135deg, ${BOIS}, #f3ead9)`,
          transition: "background 0.3s",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 30 }}>{isOpen ? "🔓" : tiroir.emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: ENCRE }}>{tiroir.label}</span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>
          {tiroir.pieces.length} {tiroir.pieces.length > 1 ? "pièces" : "pièce"} · {isOpen ? "fermer" : "ouvrir ✨"}
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: 12, background: "#fffdfb", borderTop: "1px solid #efe7dd" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
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
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, lineHeight: 1.25 }}>{shorten(p.title)}</div>
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

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 500 }}>{n}</div>
      <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function h2(): React.CSSProperties {
  return { fontSize: 17, fontWeight: 500, margin: "0 0 10px", letterSpacing: 0.3 };
}
function card(): React.CSSProperties {
  return { background: "#fffdfb", border: "1px solid #efe7dd", borderRadius: 20, padding: 22, marginTop: 16, boxShadow: "0 6px 24px rgba(120,100,80,0.05)" };
}
function narrowCard(): React.CSSProperties {
  return { ...card(), maxWidth: 460, marginLeft: "auto", marginRight: "auto" };
}
function pieceBox(): React.CSSProperties {
  return { aspectRatio: "1 / 1", borderRadius: 12, background: "#fff", border: "1px solid #efe7dd", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" };
}
function vignetteCell(unlocked: boolean): React.CSSProperties {
  return { aspectRatio: "1 / 1", borderRadius: 14, border: "1px dashed #e0d6ca", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: unlocked ? "#fff" : "#f4eee7", opacity: unlocked ? 1 : 0.55 };
}
function input(): React.CSSProperties {
  return { width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 12, border: "1px solid #e3d9cd", fontSize: 15, marginBottom: 12, background: "#fff", color: ENCRE };
}
function btn(): React.CSSProperties {
  return { width: "100%", padding: "14px 16px", borderRadius: 999, border: "none", background: ENCRE, color: "#fff", fontSize: 15, cursor: "pointer", letterSpacing: 0.5 };
}
function btnDone(): React.CSSProperties {
  return { ...btn(), background: "#cdbfae", cursor: "default" };
}
function btnLight(): React.CSSProperties {
  return { padding: "12px 22px", borderRadius: 999, border: "1px solid #d9cdbf", background: "transparent", color: ENCRE, fontSize: 14, cursor: "pointer" };
}
