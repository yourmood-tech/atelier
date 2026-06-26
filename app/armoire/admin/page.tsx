"use client";

import { useState } from "react";
import { Cabinet } from "../Cabinet";

/* Mon Armoire Mood — vue ADMIN (équipe Mood).
   Protégée par la connexion Google @yourmood.net (middleware + contrôle serveur).
   Recherche n'importe quel client par email → voit toute son armoire. */

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

const ENCRE = "#3a3330";

export default function ArmoireAdminPage() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function chercher(e: React.FormEvent) {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) return;
    setState("loading");
    setData(null);
    try {
      const res = await fetch("/api/armoire/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) return setState("error");
      if (!json.found) return setState("empty");
      setData(json);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#faf7f3", color: ENCRE, fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: "0 18px 64px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <header style={{ padding: "32px 0 8px" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", opacity: 0.5 }}>mood · admin</div>
          <h1 style={{ fontSize: 26, fontWeight: 400, margin: "4px 0 0" }}>Armoires clientes</h1>
          <p style={{ opacity: 0.6, fontSize: 13 }}>Recherche un client par email pour voir toute son armoire.</p>
        </header>

        <form onSubmit={chercher} style={{ display: "flex", gap: 10, margin: "12px 0 20px" }}>
          <input
            style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #e3d9cd", fontSize: 15, background: "#fff", color: ENCRE }}
            placeholder="email@client.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" style={{ padding: "12px 22px", borderRadius: 10, border: "none", background: ENCRE, color: "#fff", fontSize: 14, cursor: "pointer" }}>
            Chercher
          </button>
        </form>

        {state === "loading" && <div style={box()}>Recherche…</div>}
        {state === "empty" && <div style={box()}>Aucune cliente trouvée pour cet email.</div>}
        {state === "error" && <div style={box()}>Erreur (ou accès non autorisé — connecte-toi en @yourmood.net).</div>}

        {data && (
          <>
            <div style={box()}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "baseline" }}>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{data.prenom || "—"}</div>
                <span>{data.stats.commandes} commandes</span>
                <span>{data.stats.pieces} pièces</span>
                <span>{data.stats.totalDepense} {data.stats.devise}</span>
                <span>budget : {data.entitlements.gamesBudget} jeux / {data.entitlements.decoBudget} déco</span>
              </div>
              {(data.unlocks.games.length > 0 || data.unlocks.deco.length > 0) && (
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 8 }}>
                  Débloqués : {[...data.unlocks.games, ...data.unlocks.deco].join(" · ") || "—"}
                </div>
              )}
              <div style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>
                Commandes : {data.orderNames.slice(0, 12).join(", ")}{data.orderNames.length > 12 ? "…" : ""}
              </div>
            </div>

            <Cabinet tiroirs={data.tiroirs} open={open} setOpen={setOpen} />
          </>
        )}
      </div>
    </main>
  );
}

function box(): React.CSSProperties {
  return { background: "#fff", border: "1px solid #efe7dd", borderRadius: 16, padding: 18, marginBottom: 14 };
}
