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

            {/* MON ARMOIRE — meuble dessiné à tiroirs */}
            <div style={{ marginTop: 24 }}>
              <h2 style={{ ...h2(), textAlign: "center" }}>Mon armoire</h2>
              <p style={{ opacity: 0.6, marginTop: 0, fontSize: 13, textAlign: "center" }}>
                Touche un tiroir pour l&apos;ouvrir 👇
              </p>
              {data.tiroirs.length === 0 ? (
                <p style={{ opacity: 0.7, textAlign: "center" }}>
                  Ta collection arrive — elle se remplira à ta prochaine pépite.
                </p>
              ) : (
                <Cabinet tiroirs={data.tiroirs} open={open} setOpen={setOpen} />
              )}
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

function Cabinet({
  tiroirs,
  open,
  setOpen,
}: {
  tiroirs: Tiroir[];
  open: Record<string, boolean>;
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <div style={{ maxWidth: 760, margin: "10px auto 0" }}>
      {/* corniche du meuble */}
      <div
        style={{
          height: 26,
          background: "linear-gradient(180deg, #8a6038, #76502f)",
          borderRadius: "16px 16px 4px 4px",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.18)",
          margin: "0 -6px",
        }}
      />
      {/* corps du meuble */}
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
          />
        ))}
      </div>
      {/* pieds */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 24px" }}>
        <span style={foot()} />
        <span style={foot()} />
      </div>
    </div>
  );
}

function Drawer({ tiroir, isOpen, onToggle }: { tiroir: Tiroir; isOpen: boolean; onToggle: () => void }) {
  return (
    <div>
      {/* façade du tiroir */}
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
        {/* étiquette */}
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

      {/* intérieur du tiroir ouvert */}
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
              <div key={i} style={{ textAlign: "center" }}>
                <div style={pieceBox()}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 24 }}>💍</span>
                  )}
                </div>
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4, lineHeight: 1.25 }}>{shorten(p.title)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function knob(): React.CSSProperties {
  return {
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "radial-gradient(circle at 35% 30%, #f3dca0, #a9802f)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
    flexShrink: 0,
  };
}
function foot(): React.CSSProperties {
  return {
    width: 26,
    height: 14,
    background: "linear-gradient(180deg, #6f4d2c, #573a1f)",
    borderRadius: "0 0 8px 8px",
  };
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
