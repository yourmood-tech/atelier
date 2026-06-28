"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GAMES } from "@/lib/armoire-catalog";
import { SeptDifferences } from "@/app/armoire/games/SeptDifferences";
import { Memoire } from "@/app/armoire/games/Memoire";
import { Quiz } from "@/app/armoire/games/Quiz";
import { Mots } from "@/app/armoire/games/Mots";
import { Sudoku } from "@/app/armoire/games/Sudoku";
import { Taquin } from "@/app/armoire/games/Taquin";
import { Maze } from "@/app/armoire/games/Maze";

/* Page de jeu PARTAGEABLE (newsletter / site) : …/jeu/<id>
   La cliente entre email + n° de dernière commande, joue (jeu d'adresse ou tirage),
   et gagne une carte du moment — décidée par le serveur (tirage pondéré). */

const ENCRE = "#3a3330";
type Carte = { id: string; nom: string; img: string; avantage?: string; rarete?: string; actif?: boolean };
type Resultat = { won?: Carte | null; already?: boolean; message?: string; error?: string };

export default function JeuPage() {
  const params = useParams();
  const slug = String(params?.slug ?? "");
  const game = GAMES.find((g) => g.id === slug);
  const isSkill = game?.type === "skill";

  const [cartes, setCartes] = useState<Carte[]>([]);
  const [email, setEmail] = useState("");
  const [commande, setCommande] = useState("");
  const [phase, setPhase] = useState<"intro" | "jeu" | "resultat">("intro");
  const [busy, setBusy] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  useEffect(() => {
    fetch("/api/armoire/moodailles-list", { cache: "no-store" })
      .then((r) => r.json())
      .then((m) => setCartes((m?.moodailles ?? []).filter((c: Carte) => c.actif !== false)))
      .catch(() => setCartes([]));
  }, []);

  if (!game || !game.partageable) {
    return <Center><p>Ce jeu n&apos;existe pas (ou plus) 🤍</p></Center>;
  }

  const identiteOk = /\S+@\S+\.\S+/.test(email) && Boolean(commande.replace(/\D/g, ""));

  // mémorise la session → retour direct à l'armoire sans se reconnecter
  function memoriser() {
    try { localStorage.setItem("armoire:session", JSON.stringify({ email, commande })); } catch { /* ignore */ }
  }

  // Appel serveur : attribue la moodaille (consomme la partie). Utilisé direct (chance) ou à la victoire (skill).
  async function attribuer() {
    setBusy(true);
    try {
      const res = await fetch("/api/armoire/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber: commande, jeu: slug }),
      });
      const j = await res.json();
      if (!j?.error) memoriser();
      setResultat(j);
      setPhase("resultat");
    } catch {
      setResultat({ error: "Petit souci de connexion, réessaie 🤍" });
      setPhase("resultat");
    } finally {
      setBusy(false);
    }
  }

  // Jeu d'adresse : on vérifie l'identité (sans consommer) puis on lance le jeu.
  async function commencer() {
    if (!identiteOk) return;
    setBusy(true);
    try {
      const res = await fetch("/api/armoire/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber: commande, jeu: slug, check: true }),
      });
      const j = await res.json();
      if (j?.error) { setResultat({ error: j.error }); setPhase("resultat"); return; }
      if (j?.already) { setResultat({ already: true }); setPhase("resultat"); return; }
      memoriser();
      setPhase("jeu");
    } catch {
      setResultat({ error: "Petit souci de connexion, réessaie 🤍" });
      setPhase("resultat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: `radial-gradient(circle at 50% 0%, #fff, #fbf7f2)`, color: ENCRE, fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: "0 18px 64px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <header style={{ textAlign: "center", padding: "36px 0 6px" }}>
          <div style={{ fontSize: 12, letterSpacing: 4, textTransform: "uppercase", opacity: 0.55 }}>mood</div>
          <h1 style={{ fontSize: 28, fontWeight: 300, margin: "6px 0 0" }}>{game.emoji} {game.nom}</h1>
          {game.jourNom && <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>Le jeu du {game.jourNom}</div>}
        </header>

        {/* Cartes à gagner cette semaine */}
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>🤍 Les moodailles à gagner cette semaine</div>
          {cartes.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 8 }}>
              {cartes.map((c) => (
                <div key={c.id} style={{ textAlign: "center" }} title={c.avantage || c.nom}>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e3d9cd", background: "#fff", aspectRatio: "3/4" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt={c.nom} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>{c.nom}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: "center", fontSize: 13, opacity: 0.6, margin: 0 }}>Les cartes du moment arrivent très bientôt 🤍</p>
          )}
        </div>

        {/* GATE */}
        {phase === "intro" && (
          <div style={card()}>
            <p style={{ opacity: 0.75, lineHeight: 1.6, marginTop: 0, fontSize: 14, textAlign: "center" }}>
              {isSkill ? "Relève le défi !" : "Tente ta chance !"} Entre ton email et ton <b>numéro de dernière commande</b> pour jouer.
              <br /><span style={{ fontSize: 12, opacity: 0.8 }}>1 seule partie par drop · tes cartes sont personnelles (partage interdit → code annulé).</span>
            </p>
            <input style={inp()} placeholder="Ton email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input style={inp()} placeholder="N° de ta dernière commande (ex. 392523)" value={commande} onChange={(e) => setCommande(e.target.value)} />
            <button onClick={isSkill ? commencer : attribuer} disabled={busy || !identiteOk} style={{ ...btn(), opacity: busy || !identiteOk ? 0.5 : 1 }}>
              {busy ? "…" : isSkill ? `${game.emoji} Commencer` : `${game.emoji} Jouer`}
            </button>
          </div>
        )}

        {/* JEU D'ADRESSE */}
        {phase === "jeu" && isSkill && (
          <div style={card()}>
            {slug === "sept" && <SeptDifferences onWin={attribuer} />}
            {slug === "memoire" && <Memoire inline onWin={attribuer} />}
            {slug === "quiz" && <Quiz onWin={attribuer} />}
            {slug === "sudoku" && <Sudoku onWin={attribuer} />}
            {slug === "mots" && <Mots onWin={attribuer} />}
            {slug === "taquin" && <Taquin onWin={attribuer} />}
            {slug === "labyrinthe" && <Maze onWin={attribuer} />}
            {busy && <p style={{ textAlign: "center", opacity: 0.6, fontSize: 13 }}>On prépare ta moodaille… 🤍</p>}
          </div>
        )}

        {/* RÉSULTAT */}
        {phase === "resultat" && resultat && (
          <div style={{ ...card(), textAlign: "center" }}>
            {resultat.error ? (
              <>
                <p style={{ lineHeight: 1.6 }}>{resultat.error}</p>
                <button onClick={() => setPhase("intro")} style={btnLight()}>Réessayer</button>
              </>
            ) : resultat.already ? (
              <>
                <div style={{ fontSize: 40 }}>⏳</div>
                <p style={{ lineHeight: 1.6 }}>Tu as déjà joué cette saison 🤍 Reviens au prochain drop de cartes !</p>
                <a href="/armoire" style={btnLink()}>🤍 Ouvrir ma commood</a>
              </>
            ) : resultat.won ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 10 }}>🎉 Bravo, tu gagnes une moodaille !</div>
                <div style={{ maxWidth: 240, margin: "0 auto" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resultat.won.img} alt={resultat.won.nom} style={{ width: "100%", borderRadius: 14, boxShadow: "0 8px 28px rgba(0,0,0,0.18)" }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>{resultat.won.nom}</div>
                {resultat.won.avantage && <div style={{ fontSize: 14, opacity: 0.8 }}>{resultat.won.avantage}</div>}
                <a href="/armoire" style={btnLink()}>🤍 Ouvrir ma commood</a>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40 }}>🤍</div>
                <p style={{ lineHeight: 1.6 }}>{resultat.message || "Pas de nouvelle carte cette fois — reviens au prochain drop !"}</p>
                <a href="/armoire" style={btnLink()}>🤍 Ouvrir ma commood</a>
              </>
            )}
          </div>
        )}

        <footer style={{ textAlign: "center", fontSize: 11, opacity: 0.4, marginTop: 26 }}>Jeux mood · gagne tes moodailles 🏅</footer>
      </div>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial", color: ENCRE }}>{children}</main>;
}
function card(): React.CSSProperties { return { background: "#fffdfb", border: "1px solid #efe7dd", borderRadius: 18, padding: 20, marginTop: 16, boxShadow: "0 6px 24px rgba(120,100,80,0.05)" }; }
function inp(): React.CSSProperties { return { width: "100%", boxSizing: "border-box", padding: "13px 15px", borderRadius: 12, border: "1px solid #e3d9cd", fontSize: 15, marginBottom: 10, background: "#fff", color: ENCRE }; }
function btn(): React.CSSProperties { return { width: "100%", padding: "14px", borderRadius: 999, border: "none", background: ENCRE, color: "#fff", fontSize: 16, cursor: "pointer", letterSpacing: 0.3 }; }
function btnLight(): React.CSSProperties { return { padding: "11px 22px", borderRadius: 999, border: "1px solid #d9cdbf", background: "transparent", color: ENCRE, fontSize: 14, cursor: "pointer" }; }
function lien(): React.CSSProperties { return { display: "inline-block", marginTop: 16, color: ENCRE, fontSize: 14, fontWeight: 600 }; }
function btnLink(): React.CSSProperties { return { display: "inline-block", marginTop: 18, padding: "14px 28px", borderRadius: 999, background: ENCRE, color: "#fff", fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 6px 18px rgba(58,51,48,0.25)" }; }
