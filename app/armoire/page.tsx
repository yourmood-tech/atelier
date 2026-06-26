"use client";

import { useState } from "react";
import { Room } from "./Room";
import { DECO, ARMOIRE_PALETTES, isStaffEmail } from "@/lib/armoire-catalog";

/* Mon Armoire Mood — espace client (V1)
   Connexion : email + numéro de commande (preuve de propriété → on ne peut pas
   ouvrir l'armoire d'une autre). Armoire = des PORTES par catégorie qu'on ouvre,
   bagues en grille à l'intérieur. Le "mood du jour" est gardé en local (V1). */

type Piece = { pid: number; title: string; image: string | null; date: string; quantity: number };
type Tiroir = { key: string; label: string; emoji: string; pieces: Piece[] };
type Choice = { key: string; label: string };
type Unlocks = { games: string[]; deco: string[] };
type Data = {
  prenom: string;
  stats: { commandes: number; pieces: number; totalDepense: number; devise: string };
  tiroirs: Tiroir[];
  choices: Choice[];
  entitlements: { gamesBudget: number; decoBudget: number; commandesQualifiantes: number };
  unlocks: Unlocks;
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
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"armoire" | "regles" | "guide">("armoire");
  const [active, setActive] = useState<{ mur?: string; sol?: string; armoire?: string }>({});
  const [layout, setLayout] = useState<Record<string, { left: number; top: number; w: number }>>({});
  const [placed, setPlaced] = useState<string[]>([]);

  function togglePlaced(id: string) {
    setPlaced((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(`armoire:placed:${email.trim().toLowerCase()}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function applyDeco(type: "mur" | "sol" | "armoire", id: string) {
    const next = { ...active, [type]: id };
    setActive(next);
    try {
      localStorage.setItem(`armoire:deco:${email.trim().toLowerCase()}`, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function onLayout(id: string, pos: { left: number; top: number; w: number }) {
    setLayout((prev) => {
      const next = { ...prev, [id]: pos };
      try {
        localStorage.setItem(`armoire:layout:${email.trim().toLowerCase()}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function ouvrir(e: React.FormEvent) {
    e.preventDefault();
    const staff = isStaffEmail(email);
    if (!/\S+@\S+\.\S+/.test(email) || (!staff && !commande.replace(/\D/g, ""))) return;
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
      try {
        setActive(JSON.parse(localStorage.getItem(`armoire:deco:${email.trim().toLowerCase()}`) || "{}"));
        setLayout(JSON.parse(localStorage.getItem(`armoire:layout:${email.trim().toLowerCase()}`) || "{}"));
        setPlaced(JSON.parse(localStorage.getItem(`armoire:placed:${email.trim().toLowerCase()}`) || "[]"));
      } catch {
        /* ignore */
      }
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

  // Personnalisation : déplacer / photo perso → on sauvegarde puis on rafraîchit l'armoire.
  async function persist(key: string, patch: { tiroir?: string; image?: string }) {
    try {
      await fetch("/api/armoire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber: commande, key, ...patch }),
      });
      const res = await fetch("/api/armoire/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber: commande }),
      });
      const json = await res.json();
      if (res.ok && json.verified) setData(json);
    } catch {
      /* ignore */
    }
  }

  // Débloquer (ou retirer) un jeu / un objet déco, dans la limite du budget.
  async function unlock(kind: "game" | "deco", id: string, action: "unlock" | "remove" = "unlock") {
    if (!data) return;
    try {
      const res = await fetch("/api/armoire/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber: commande, kind, id, action }),
      });
      const json = await res.json();
      if (res.ok && json.unlocks) setData({ ...data, unlocks: json.unlocks });
      else if (res.status === 409) alert("Fais une commande pour débloquer un objet 🤍");
    } catch {
      /* ignore */
    }
  }

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
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
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
            {isStaffEmail(email) && (
              <p style={{ fontSize: 12, color: "#3a8a4a", marginTop: -4, marginBottom: 12 }}>
                Accès staff illimité — tu peux laisser le numéro de commande vide 🤍
              </p>
            )}
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
                <Stat n={data.entitlements.decoBudget} label="à débloquer" />
              </div>
            </div>

            {/* ONGLETS */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "18px 0 4px", flexWrap: "wrap" }}>
              <button style={tabBtn(tab === "armoire")} onClick={() => setTab("armoire")}>🪟 Mon armoire</button>
              <button style={tabBtn(tab === "regles")} onClick={() => setTab("regles")}>🎁 Gagner des objets</button>
              <button style={tabBtn(tab === "guide")} onClick={() => setTab("guide")}>✨ Mode d&apos;emploi</button>
            </div>

            {tab === "regles" && <Regles budget={data.entitlements.decoBudget} debloques={data.unlocks.deco.length} />}
            {tab === "guide" && <Guide />}

            {/* ONGLET ARMOIRE : la chambre. Tous les objets sont visibles, cadenassés,
                et le client choisit lesquels débloquer (budget gagné à chaque commande). */}
            {tab === "armoire" && (
            <div style={{ marginTop: 14 }}>
              <p style={{ opacity: 0.6, marginTop: 0, fontSize: 13, textAlign: "center" }}>
                Touche un tiroir pour l&apos;ouvrir · glisse un bijou pour le ranger · clique un objet 🔒 pour le débloquer ✨
              </p>
              {data.tiroirs.length === 0 ? (
                <p style={{ opacity: 0.7, textAlign: "center" }}>Ta collection arrive — elle se remplira à ta prochaine pépite.</p>
              ) : (
                <>
                  <p style={{ textAlign: "center", fontSize: 13, opacity: 0.75, margin: "0 0 8px" }}>
                    Objets &amp; couleurs débloqués : <b>{data.unlocks.deco.length}/{data.entitlements.decoBudget}</b>
                    {data.entitlements.decoBudget === 0 && " — passe une commande pour en débloquer 🤍"}
                  </p>
                  <ColorBar
                    active={active}
                    unlocked={data.unlocks.deco}
                    budgetLeft={data.unlocks.deco.length < data.entitlements.decoBudget}
                    onApply={applyDeco}
                    onUnlock={(id) => unlock("deco", id)}
                  />
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Room
                        tiroirs={data.tiroirs}
                        open={open}
                        setOpen={setOpen}
                        unlocked={data.unlocks.deco}
                        placed={placed}
                        active={active}
                        editable
                        onMove={(key, tiroir) => persist(key, { tiroir })}
                        onPhoto={(key, image) => persist(key, { image })}
                        layout={layout}
                        onLayout={onLayout}
                      />
                    </div>
                    <ObjectsTray
                      unlocked={data.unlocks.deco}
                      placed={placed}
                      budgetLeft={data.unlocks.deco.length < data.entitlements.decoBudget}
                      onToggle={togglePlaced}
                      onUnlock={(id) => unlock("deco", id)}
                    />
                  </div>
                </>
              )}
            </div>
            )}

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

function Regles({ budget, debloques }: { budget: number; debloques: number }) {
  return (
    <div style={card()}>
      <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 12px" }}>🎁 Comment gagner des objets</h2>
      <p style={{ lineHeight: 1.7, marginTop: 0 }}>
        Ta chambre se décore avec des objets que tu <b>débloques grâce à tes commandes</b>. Tout le monde commence
        avec une chambre vide — et chaque commande t&apos;offre de nouveaux objets à poser. 🤍
      </p>
      <div style={{ background: "#f6f1ea", borderRadius: 14, padding: 16, margin: "14px 0" }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>La règle est simple :</div>
        <div style={{ lineHeight: 1.9 }}>
          🛍️ <b>1 objet débloqué par tranche de 100.-</b> sur une commande.
        </div>
        <ul style={{ lineHeight: 1.8, margin: "8px 0 0", paddingLeft: 22 }}>
          <li>une commande de <b>0 à 100.-</b> → <b>1 objet</b></li>
          <li>une commande de <b>300.-</b> → <b>3 objets</b></li>
          <li>une commande de <b>1000.-</b> → <b>10 objets</b></li>
        </ul>
      </div>
      <p style={{ lineHeight: 1.7 }}>
        <b>C&apos;est toi qui choisis</b> quels objets (ou quelles couleurs de mur, sol, armoire) tu débloques avec
        ton budget. Les objets pas encore débloqués restent visibles avec un cadenas 🔒.
      </p>
      <p style={{ lineHeight: 1.7, fontSize: 14, opacity: 0.85 }}>
        En ce moment tu as débloqué <b>{debloques}</b> objet(s) sur <b>{budget}</b> disponibles.
        {budget === 0 && " Passe une première commande pour commencer à décorer 🤍"}
      </p>
    </div>
  );
}

function Guide() {
  const etapes = [
    { e: "🔓", t: "Débloquer", d: "Dans la barre de droite, clique sur un objet avec un cadenas 🔒 pour le débloquer (si tu as du budget)." },
    { e: "➕", t: "Poser dans la chambre", d: "Reclique sur l'objet débloqué : il apparaît dans ta chambre. Reclique encore pour le retirer." },
    { e: "✥", t: "Déplacer", d: "Pose ton doigt (ou la souris) sur l'objet et glisse-le où tu veux dans la pièce." },
    { e: "⤡", t: "Agrandir / réduire", d: "Quand un objet est sélectionné, attrape le petit rond en bas à droite et étire pour changer sa taille." },
    { e: "🎨", t: "Changer les couleurs", d: "Au-dessus de la chambre, les pastilles changent la couleur de l'armoire, du mur et du sol." },
    { e: "📷", t: "Photo perso", d: "Sur un tiroir ouvert, le bouton appareil photo te laisse ajouter ta propre photo." },
  ];
  return (
    <div style={card()}>
      <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 6px" }}>✨ Mode d&apos;emploi</h2>
      <p style={{ lineHeight: 1.7, marginTop: 0, opacity: 0.85 }}>
        Décorer ta chambre, c&apos;est tout doux. Voilà comment faire :
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {etapes.map((s) => (
          <div key={s.t} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#f6f1ea", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 22, lineHeight: "26px", flexShrink: 0 }}>{s.e}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.t}</div>
              <div style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ lineHeight: 1.6, fontSize: 13, opacity: 0.7, marginTop: 14 }}>
        Tout est sauvegardé automatiquement — tu retrouveras ta chambre comme tu l&apos;as laissée 🤍
      </p>
    </div>
  );
}

function tabBtn(active: boolean): React.CSSProperties {
  return { padding: "10px 16px", borderRadius: 999, border: active ? "none" : "1px solid #e0d6ca", background: active ? ENCRE : "#fff", color: active ? "#fff" : ENCRE, fontSize: 14, cursor: "pointer", fontWeight: active ? 600 : 400 };
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 500 }}>{n}</div>
      <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function card(): React.CSSProperties {
  return { background: "#fffdfb", border: "1px solid #efe7dd", borderRadius: 20, padding: 22, marginTop: 16, boxShadow: "0 6px 24px rgba(120,100,80,0.05)" };
}
function narrowCard(): React.CSSProperties {
  return { ...card(), maxWidth: 460, marginLeft: "auto", marginRight: "auto" };
}
function ObjectsTray({
  unlocked,
  placed,
  budgetLeft,
  onToggle,
  onUnlock,
}: {
  unlocked: string[];
  placed: string[];
  budgetLeft: boolean;
  onToggle: (id: string) => void;
  onUnlock: (id: string) => void;
}) {
  const set = new Set(unlocked);
  const placedSet = new Set(placed);
  // TOUS les objets sont visibles ; ceux qui ne sont pas débloqués apparaissent cadenassés.
  const objets = DECO.filter((d) => d.img);
  if (!objets.length) return null;

  // Regroupe par ambiance pour garder la barre lisible.
  const ambiance = (id: string) =>
    id.startsWith("acc-bleu-") ? "Bleu" : id.startsWith("acc-noir-") ? "Noir" : id.startsWith("acc-riviera-") ? "Riviera" : id.startsWith("acc-surf-") ? "Surf" : "Chaud";
  const ordre = ["Chaud", "Bleu", "Noir", "Riviera", "Surf"];
  const groupes = ordre
    .map((nom) => ({ nom, items: objets.filter((d) => ambiance(d.id) === nom) }))
    .filter((g) => g.items.length);

  return (
    <div
      style={{
        width: 96,
        flexShrink: 0,
        maxHeight: 460,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 8,
        background: "#fffdfb",
        border: "1px solid #efe7dd",
        borderRadius: 14,
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center" }}>Mes objets</div>
      {groupes.map((g) => (
        <div key={g.nom} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.5, textAlign: "center", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {g.nom}
          </div>
          {g.items.map((d) => {
            const locked = !set.has(d.id);
            const on = placedSet.has(d.id);
            return (
              <button
                key={d.id}
                onClick={() => (locked ? onUnlock(d.id) : onToggle(d.id))}
                title={locked ? (budgetLeft ? "Débloquer : " : "Passe une commande pour débloquer : ") + d.nom : (on ? "Retirer : " : "Poser : ") + d.nom}
                style={{
                  border: on ? "2px solid #3a3330" : "1px solid #e3d9cd",
                  borderRadius: 10,
                  background: on ? "#f3ece2" : "#fff",
                  cursor: "pointer",
                  padding: 4,
                  position: "relative",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.img} alt={d.nom} style={{ width: "100%", height: 56, objectFit: "contain", display: "block", opacity: locked ? 0.4 : 1, filter: locked ? "grayscale(0.5)" : "none" }} />
                {locked && (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔒</span>
                )}
                {!locked && on && (
                  <span style={{ position: "absolute", top: 2, right: 2, fontSize: 11, background: "#3a3330", color: "#fff", borderRadius: 999, width: 16, height: 16, lineHeight: "16px" }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ColorBar({
  active,
  unlocked,
  budgetLeft,
  onApply,
  onUnlock,
}: {
  active: { mur?: string; sol?: string; armoire?: string };
  unlocked: string[];
  budgetLeft: boolean;
  onApply: (type: "mur" | "sol" | "armoire", id: string) => void;
  onUnlock: (id: string) => void;
}) {
  const set = new Set(unlocked);
  const rows: { type: "mur" | "sol" | "armoire"; label: string }[] = [
    { type: "armoire", label: "Armoire" },
    { type: "mur", label: "Mur" },
    { type: "sol", label: "Sol" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", margin: "2px 0 12px" }}>
      {rows.map((row) => {
        const opts = DECO.filter((d) => d.type === row.type);
        if (!opts.length) return null;
        return (
          <div key={row.type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.6 }}>{row.label}</span>
            {opts.map((o) => {
              const bg = row.type === "armoire" ? ARMOIRE_PALETTES[o.valeur]?.bodyBottom ?? "#ccc" : o.valeur;
              const locked = !set.has(o.id);
              const isActive = active[row.type] === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => (locked ? onUnlock(o.id) : onApply(row.type, o.id))}
                  title={locked ? (budgetLeft ? "Débloquer : " : "Passe une commande pour débloquer : ") + o.nom : o.nom}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: isActive ? "2px solid #3a3330" : "1px solid #d9cdbf",
                    background: bg,
                    backgroundSize: "cover",
                    cursor: "pointer",
                    padding: 0,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {locked && <span style={{ fontSize: 12, filter: "drop-shadow(0 0 1px rgba(255,255,255,0.9))" }}>🔒</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function input(): React.CSSProperties {
  return { width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 12, border: "1px solid #e3d9cd", fontSize: 15, marginBottom: 12, background: "#fff", color: ENCRE };
}
function btn(): React.CSSProperties {
  return { width: "100%", padding: "14px 16px", borderRadius: 999, border: "none", background: ENCRE, color: "#fff", fontSize: 15, cursor: "pointer", letterSpacing: 0.5 };
}
function btnLight(): React.CSSProperties {
  return { padding: "12px 22px", borderRadius: 999, border: "1px solid #d9cdbf", background: "transparent", color: ENCRE, fontSize: 14, cursor: "pointer" };
}
