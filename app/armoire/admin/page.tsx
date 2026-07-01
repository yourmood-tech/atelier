"use client";

import { useEffect, useState } from "react";
import { Cabinet } from "../Cabinet";

/* Mon Armoire Mood — vue ADMIN (équipe Mood).
   Protégée par la connexion Google @yourmood.net (middleware + contrôle serveur).
   Liste des comptes clientes (celles qui ont fait leur commood en tête) → clic pour voir l'univers. */

type Piece = { pid: number; title: string; image: string | null; date: string; quantity: number };
type Tiroir = { key: string; label: string; emoji: string; pieces: Piece[] };
type Data = {
  found: boolean;
  prenom: string;
  stats: { commandes: number; pieces: number; totalDepense: number; devise: string };
  tiroirs: Tiroir[];
  orderNames: string[];
  entitlements: { gamesBudget: number; decoBudget: number; commandesQualifiantes: number };
  unlocks: { games: string[]; deco: string[] };
};
type Cliente = {
  email: string; prenom: string; commandes: number; visites: number; derniere: string | null;
  personnalise: boolean; objets: number; moodailles: number; aFait: boolean;
};

const ENCRE = "#3a3330";

export default function ArmoireAdminPage() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [liste, setListe] = useState<Cliente[]>([]);
  const [listeState, setListeState] = useState<"loading" | "ok" | "error">("loading");
  const [aFaitCount, setAFaitCount] = useState(0);

  useEffect(() => {
    fetch("/api/armoire/admin/list")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { setListe(j.clientes ?? []); setAFaitCount(j.aFait ?? 0); setListeState("ok"); })
      .catch(() => setListeState("error"));
  }, []);

  async function ouvrir(em: string) {
    if (!/\S+@\S+\.\S+/.test(em)) return;
    setEmail(em);
    setState("loading");
    setData(null);
    setOpen({});
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const res = await fetch("/api/armoire/admin", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em }),
      });
      const json = await res.json();
      if (!res.ok) return setState("error");
      if (!json.found) return setState("empty");
      setData(json);
      setState("idle");
    } catch { setState("error"); }
  }

  const fait = liste.filter((c) => c.aFait);
  const ouverts = liste.filter((c) => !c.aFait);

  return (
    <main style={{ minHeight: "100vh", background: "#faf7f3", color: ENCRE, fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: "0 18px 64px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <header style={{ padding: "32px 0 8px" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", opacity: 0.5 }}>mood · admin</div>
          <h1 style={{ fontSize: 26, fontWeight: 400, margin: "4px 0 0" }}>Les commood des clientes</h1>
          <p style={{ opacity: 0.6, fontSize: 13 }}>
            {listeState === "ok"
              ? `${liste.length} cliente(s) ont une commood vivante · ${aFaitCount} ont fait la leur. Clique pour voir son univers.`
              : "Chargement des comptes…"}
          </p>
        </header>

        {/* recherche libre (ouvrir n'importe quelle cliente) */}
        <form onSubmit={(e) => { e.preventDefault(); ouvrir(email); }} style={{ display: "flex", gap: 10, margin: "12px 0 22px" }}>
          <input style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #e3d9cd", fontSize: 15, background: "#fff", color: ENCRE }}
            placeholder="Ouvrir une cliente par email…" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" style={btnDark()}>Ouvrir</button>
        </form>

        {/* UNIVERS d'une cliente sélectionnée */}
        {state === "loading" && <div style={box()}>Ouverture…</div>}
        {state === "empty" && <div style={box()}>Aucune cliente trouvée pour cet email.</div>}
        {state === "error" && <div style={box()}>Erreur (ou accès non autorisé — connecte-toi en @yourmood.net).</div>}
        {data && (
          <div style={{ marginBottom: 30 }}>
            <button onClick={() => { setData(null); setState("idle"); }} style={btnLight()}>← Retour à la liste</button>
            <div style={{ ...box(), marginTop: 12 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "baseline" }}>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{data.prenom || email}</div>
                <span>{data.stats.commandes} commandes</span>
                <span>{data.stats.pieces} pièces</span>
                <span>{data.stats.totalDepense} {data.stats.devise}</span>
              </div>
              {(data.unlocks.deco.length > 0) && (
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 8 }}>Objets débloqués : {data.unlocks.deco.length}</div>
              )}
            </div>
            <Cabinet tiroirs={data.tiroirs} open={open} setOpen={setOpen} />
          </div>
        )}

        {/* LISTE des comptes */}
        {!data && listeState === "error" && <div style={box()}>Impossible de charger la liste (connecte-toi en @yourmood.net).</div>}
        {!data && listeState === "ok" && liste.length === 0 && <div style={box()}>Personne n&apos;a encore touché à sa commood.</div>}
        {!data && fait.length > 0 && (
          <>
            <SectionTitle>🌟 Ont fait leur commood ({fait.length})</SectionTitle>
            {fait.map((c) => <Row key={c.email} c={c} onClick={() => ouvrir(c.email)} highlight />)}
          </>
        )}
        {!data && ouverts.length > 0 && (
          <>
            <SectionTitle>👀 Ont ouvert leur commood ({ouverts.length})</SectionTitle>
            {ouverts.map((c) => <Row key={c.email} c={c} onClick={() => ouvrir(c.email)} />)}
          </>
        )}
      </div>
    </main>
  );
}

function Row({ c, onClick, highlight }: { c: Cliente; onClick: () => void; highlight?: boolean }) {
  const badges: string[] = [];
  if (c.personnalise) badges.push("🎨 personnalisé");
  if (c.objets > 0) badges.push(`🔓 ${c.objets} objet${c.objets > 1 ? "s" : ""}`);
  if (c.moodailles > 0) badges.push(`🏅 ${c.moodailles} moodaille${c.moodailles > 1 ? "s" : ""}`);
  if (c.visites > 0) badges.push(`👁 ${c.visites} visite${c.visites > 1 ? "s" : ""}`);
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", cursor: "pointer",
      background: highlight ? "#fff" : "#fbf9f6", border: highlight ? "1px solid #e8dcc9" : "1px solid #efe7dd",
      borderRadius: 14, padding: "14px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between",
      alignItems: "center", gap: 12, color: ENCRE,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{c.prenom || c.email}</div>
        <div style={{ fontSize: 12, opacity: 0.55, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
        <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 5, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {badges.map((b, i) => <span key={i}>{b}</span>)}
          {c.derniere && <span style={{ opacity: 0.5 }}>· {new Date(c.derniere).toLocaleDateString("fr-CH")}</span>}
        </div>
      </div>
      <span style={{ fontSize: 20, opacity: 0.4 }}>›</span>
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 600, margin: "18px 0 10px", opacity: 0.85 }}>{children}</div>;
}
function box(): React.CSSProperties { return { background: "#fff", border: "1px solid #efe7dd", borderRadius: 16, padding: 18, marginBottom: 14 }; }
function btnDark(): React.CSSProperties { return { padding: "12px 22px", borderRadius: 10, border: "none", background: ENCRE, color: "#fff", fontSize: 14, cursor: "pointer" }; }
function btnLight(): React.CSSProperties { return { padding: "9px 16px", borderRadius: 10, border: "1px solid #e3d9cd", background: "#fff", color: ENCRE, fontSize: 13, cursor: "pointer" }; }
