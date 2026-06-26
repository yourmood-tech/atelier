"use client";

import { useState, useEffect, useMemo } from "react";

/* Mon Armoire Mood — espace client (V1)
   Connexion par email → armoire (vraies commandes) → mini moodboard → jeu de vignettes.
   La perso (couleurs) et le "mood du jour" quotidien sont gardés en local sur l'appareil
   pour la V1 (pas encore de compte serveur). Tout le reste vient des vraies commandes. */

type Piece = { title: string; image: string | null; date: string; quantity: number };
type Tiroir = { key: string; label: string; emoji: string; pieces: Piece[] };
type Vignette = { id: string; nom: string; emoji: string };
type Palier = { seuil: number; recompense: string };
type Data = {
  found: boolean;
  prenom: string;
  stats: { commandes: number; pieces: number; totalDepense: number; devise: string };
  tiroirs: Tiroir[];
  jeu: {
    album: { nom: string; emoji: string; vignettes: Vignette[] };
    vignettesAchat: number;
    palier: {
      depense: number;
      devise: string;
      prochain: Palier | null;
      recompensesDebloquees: string[];
    };
  };
};

const COULEURS = [
  { key: "bleu", label: "Bleu", hex: "#9ec7e6" },
  { key: "argent", label: "Argent", hex: "#c8ccd2" },
  { key: "or", label: "Or", hex: "#e3c08a" },
  { key: "nude", label: "Nude", hex: "#e6cdbf" },
  { key: "rubis", label: "Rubis", hex: "#b23a55" },
  { key: "nacre", label: "Nacre", hex: "#f2ece6" },
  { key: "noir", label: "Noir", hex: "#2b2b2b" },
  { key: "rose", label: "Rose", hex: "#e8b6c4" },
];

const IVOIRE = "#fbf7f2";
const ENCRE = "#3a3330";

export default function ArmoirePage() {
  const [status, setStatus] = useState<"connexion" | "chargement" | "moodboard" | "espace" | "introuvable" | "erreur">(
    "connexion"
  );
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [couleurs, setCouleurs] = useState<string[]>([]);
  const [moodDuJour, setMoodDuJour] = useState(0);

  const emailKey = email.trim().toLowerCase();

  // Recharge la perso locale quand on connaît l'email
  useEffect(() => {
    if (!emailKey) return;
    try {
      const c = JSON.parse(localStorage.getItem(`armoire:couleurs:${emailKey}`) || "[]");
      if (Array.isArray(c)) setCouleurs(c);
      const md = JSON.parse(localStorage.getItem(`armoire:mooddujour:${emailKey}`) || "{}");
      setMoodDuJour(typeof md.count === "number" ? md.count : 0);
    } catch {
      /* ignore */
    }
  }, [emailKey]);

  const today = () => new Date().toISOString().slice(0, 10);

  function faitMoodDuJour() {
    try {
      const raw = JSON.parse(localStorage.getItem(`armoire:mooddujour:${emailKey}`) || "{}");
      if (raw.last === today()) return; // déjà fait aujourd'hui
      const count = (typeof raw.count === "number" ? raw.count : 0) + 1;
      localStorage.setItem(`armoire:mooddujour:${emailKey}`, JSON.stringify({ count, last: today() }));
      setMoodDuJour(count);
    } catch {
      /* ignore */
    }
  }
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

  async function ouvrir(e: React.FormEvent) {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) return;
    setStatus("chargement");
    try {
      const res = await fetch("/api/armoire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, prenom }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("erreur");
        return;
      }
      if (!json.found) {
        setStatus("introuvable");
        return;
      }
      setData(json);
      const dejaPlanche = (() => {
        try {
          return (JSON.parse(localStorage.getItem(`armoire:couleurs:${emailKey}`) || "[]") as string[]).length > 0;
        } catch {
          return false;
        }
      })();
      setStatus(dejaPlanche ? "espace" : "moodboard");
    } catch {
      setStatus("erreur");
    }
  }

  function validerPlanche() {
    localStorage.setItem(`armoire:couleurs:${emailKey}`, JSON.stringify(couleurs));
    setStatus("espace");
  }

  function deconnexion() {
    setData(null);
    setStatus("connexion");
    setPrenom("");
    setEmail("");
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
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <header style={{ textAlign: "center", padding: "40px 0 8px" }}>
          <div style={{ fontSize: 13, letterSpacing: 4, textTransform: "uppercase", opacity: 0.55 }}>mood</div>
          <h1 style={{ fontSize: 30, fontWeight: 300, margin: "6px 0 0", letterSpacing: 1 }}>
            Mon armoire <span style={{ fontWeight: 500 }}>mood</span> 🤍
          </h1>
        </header>

        {/* CONNEXION */}
        {status === "connexion" && (
          <form onSubmit={ouvrir} style={card()}>
            <p style={{ opacity: 0.7, lineHeight: 1.6, marginTop: 0 }}>
              Entre ton prénom et ton email — on t&apos;ouvre ton espace, là où toute ta collection mood est rangée.
            </p>
            <input
              style={input()}
              placeholder="Ton prénom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
            />
            <input
              style={input()}
              placeholder="Ton email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" style={btn()}>
              Ouvrir mon armoire
            </button>
          </form>
        )}

        {status === "chargement" && <div style={card()}>On ouvre ton armoire… ✨</div>}

        {status === "introuvable" && (
          <div style={card()}>
            <p style={{ lineHeight: 1.6 }}>
              On ne retrouve pas encore de commande à cet email 🤍 Vérifie l&apos;adresse, ou reviens après ta première
              pépite — ton armoire se remplira toute seule.
            </p>
            <button style={btnLight()} onClick={() => setStatus("connexion")}>
              Réessayer
            </button>
          </div>
        )}

        {status === "erreur" && (
          <div style={card()}>
            <p>Petit souci de notre côté 🥲 Réessaie dans un instant.</p>
            <button style={btnLight()} onClick={() => setStatus("connexion")}>
              Retour
            </button>
          </div>
        )}

        {/* MOODBOARD */}
        {status === "moodboard" && (
          <div style={card()}>
            <h2 style={h2()}>Ta planche mood 🎨</h2>
            <p style={{ opacity: 0.7, lineHeight: 1.6, marginTop: 0 }}>
              Choisis tes couleurs préférées — on te suggérera tes pépites dans ces tons.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "8px 0 20px" }}>
              {COULEURS.map((c) => {
                const on = couleurs.includes(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() =>
                      setCouleurs((prev) => (on ? prev.filter((x) => x !== c.key) : [...prev, c.key]))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px 8px 8px",
                      borderRadius: 999,
                      border: on ? `2px solid ${ENCRE}` : "2px solid #e7ded5",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: c.hex,
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                      }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
            <button style={btn()} disabled={couleurs.length === 0} onClick={validerPlanche}>
              Valider ma planche
            </button>
          </div>
        )}

        {/* ESPACE */}
        {status === "espace" && data && (
          <>
            <div style={{ ...card(), textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 400 }}>Bonjour {data.prenom || prenom} 🤍</div>
              {couleurs.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
                  {couleurs.map((k) => {
                    const c = COULEURS.find((x) => x.key === k);
                    return (
                      <span
                        key={k}
                        title={c?.label}
                        style={{ width: 18, height: 18, borderRadius: "50%", background: c?.hex }}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 18 }}>
                <Stat n={data.stats.commandes} label="commandes" />
                <Stat n={data.stats.pieces} label="pièces" />
                <Stat n={totalVignettes} label="vignettes" />
              </div>
            </div>

            {/* MOOD DU JOUR */}
            <div style={card()}>
              <h2 style={h2()}>Ton mood du jour ☀️</h2>
              <p style={{ opacity: 0.7, marginTop: 0, lineHeight: 1.6 }}>
                Un petit geste chaque jour = une vignette de plus pour ta collection.
              </p>
              <button style={moodDuJourFait ? btnDone() : btn()} disabled={moodDuJourFait} onClick={faitMoodDuJour}>
                {moodDuJourFait ? "Mood du jour fait ✓ — à demain 🤍" : "Faire mon mood du jour (+1 vignette)"}
              </button>
            </div>

            {/* ARMOIRE */}
            <div style={card()}>
              <h2 style={h2()}>Mon armoire</h2>
              {data.tiroirs.length === 0 && (
                <p style={{ opacity: 0.7 }}>Ta collection arrive — elle se remplira à ta prochaine pépite.</p>
              )}
              {data.tiroirs.map((t) => (
                <div key={t.key} style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>
                    {t.emoji} {t.label}{" "}
                    <span style={{ opacity: 0.45, fontWeight: 400 }}>· {t.pieces.length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {t.pieces.map((p, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div
                          style={{
                            aspectRatio: "1 / 1",
                            borderRadius: 14,
                            background: "#fff",
                            border: "1px solid #efe7dd",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: 26 }}>💍</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 5, lineHeight: 1.3 }}>{p.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* COLLECTION (JEU) */}
            <div style={card()}>
              <h2 style={h2()}>
                {data.jeu.album.emoji} {data.jeu.album.nom}
              </h2>
              <p style={{ opacity: 0.7, marginTop: 0 }}>
                {Math.min(totalVignettes, data.jeu.album.vignettes.length)} / {data.jeu.album.vignettes.length} vignettes
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {data.jeu.album.vignettes.map((v, i) => {
                  const unlocked = i < totalVignettes;
                  return (
                    <div
                      key={v.id}
                      style={{
                        aspectRatio: "1 / 1",
                        borderRadius: 14,
                        border: "1px dashed #e0d6ca",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: unlocked ? "#fff" : "#f4eee7",
                        opacity: unlocked ? 1 : 0.55,
                      }}
                    >
                      <div style={{ fontSize: 30, filter: unlocked ? "none" : "grayscale(1)" }}>
                        {unlocked ? v.emoji : "🔒"}
                      </div>
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
                <div key={i} style={{ fontSize: 14, marginBottom: 6 }}>
                  ✅ {r}
                </div>
              ))}
              {data.jeu.palier.prochain ? (
                <>
                  <div style={{ fontSize: 14, marginTop: 8, opacity: 0.8 }}>
                    Prochain palier à {data.jeu.palier.prochain.seuil} {data.jeu.palier.devise} —{" "}
                    {data.jeu.palier.prochain.recompense}
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "#eee3d8", marginTop: 8, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.round((data.jeu.palier.depense / data.jeu.palier.prochain.seuil) * 100))}%`,
                        background: ENCRE,
                      }}
                    />
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
              <button style={btnLight()} onClick={deconnexion}>
                Me déconnecter
              </button>
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
  return {
    background: "#fffdfb",
    border: "1px solid #efe7dd",
    borderRadius: 20,
    padding: 22,
    marginTop: 16,
    boxShadow: "0 6px 24px rgba(120,100,80,0.05)",
  };
}
function input(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid #e3d9cd",
    fontSize: 15,
    marginBottom: 12,
    background: "#fff",
    color: ENCRE,
  };
}
function btn(): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 999,
    border: "none",
    background: ENCRE,
    color: "#fff",
    fontSize: 15,
    cursor: "pointer",
    letterSpacing: 0.5,
  };
}
function btnDone(): React.CSSProperties {
  return { ...btn(), background: "#cdbfae", cursor: "default" };
}
function btnLight(): React.CSSProperties {
  return {
    padding: "12px 22px",
    borderRadius: 999,
    border: "1px solid #d9cdbf",
    background: "transparent",
    color: ENCRE,
    fontSize: 14,
    cursor: "pointer",
  };
}
