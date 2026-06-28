"use client";

import React, { useEffect, useRef, useState } from "react";
import { GAMES } from "@/lib/armoire-catalog";

type Moodaille = {
  id?: string;
  nom: string;
  img: string;
  icone?: string;
  avantage?: string;
  code?: string;
  rarete?: string;
  jeu?: string;
  jeux?: string[];
  actif?: boolean;
};

const ENCRE = "#3a3330";
const VIDE: Moodaille = { nom: "", img: "", icone: "", avantage: "", code: "", rarete: "commune", jeux: [], actif: true };

export default function AdminMoodaillesPage() {
  const [list, setList] = useState<Moodaille[]>([]);
  const [form, setForm] = useState<Moodaille>(VIDE);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [saison, setSaison] = useState("");
  const [revEmail, setRevEmail] = useState("");
  const [revCard, setRevCard] = useState("");
  const [revMsg, setRevMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const iconeRef = useRef<HTMLInputElement>(null);

  async function call(action: string, extra: Record<string, unknown> = {}) {
    const r = await fetch("/api/armoire/moodailles-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    return r.json();
  }

  async function reload() {
    const j = await call("list");
    if (j?.moodailles) setList(j.moodailles);
    const s = await call("getSaison");
    if (s?.saison) setSaison(s.saison);
  }
  useEffect(() => { reload(); }, []);

  async function saveSaison() {
    const j = await call("setSaison", { saison });
    if (j?.saison) { setSaison(j.saison); setMsg("Saison enregistrée ✓ (les parties de tout le monde sont réinitialisées)"); }
  }
  async function revoke() {
    if (!revEmail || !revCard) { setRevMsg("Email cliente + carte requis"); return; }
    const j = await call("revoke", { email: revEmail, cardId: revCard });
    setRevMsg(j?.ok ? "Carte annulée pour cette cliente ✓" : (j?.error || "Erreur"));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await toDataUrl(f, 640);
    setForm((s) => ({ ...s, img: url }));
  }
  async function onIcone(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await toDataUrl(f, 256);
    setForm((s) => ({ ...s, icone: url }));
  }
  function toggleJeu(id: string) {
    setForm((s) => {
      const cur = s.jeux ?? (s.jeu ? [s.jeu] : []);
      return { ...s, jeux: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });
  }

  async function save() {
    if (!form.nom || !form.img) { setMsg("Il faut au moins un nom et une image de carte."); return; }
    setBusy(true);
    const j = await call("save", { moodaille: form });
    setBusy(false);
    if (j?.moodailles) { setList(j.moodailles); setForm(VIDE); if (fileRef.current) fileRef.current.value = ""; setMsg("Enregistré ✓"); }
    else setMsg(j?.error || "Erreur");
  }

  async function supprimer(id?: string) {
    if (!id || !confirm("Supprimer cette moodaille ?")) return;
    const j = await call("delete", { id });
    if (j?.moodailles) setList(j.moodailles);
  }

  async function toggle(m: Moodaille) {
    const j = await call("save", { moodaille: { ...m, actif: !(m.actif !== false) } });
    if (j?.moodailles) setList(j.moodailles);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#fbf7f2", color: ENCRE, fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: "32px 18px 64px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 400 }}>🏅 Admin moodailles</h1>
        <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
          Ajoute une moodaille (la carte que tu as faite + ses infos). Elle apparaîtra dans l&apos;armoire des clientes,
          à gagner via le jeu choisi. Réservé à l&apos;équipe Mood.
        </p>

        {/* SAISON / DROP COURANT */}
        <div style={card()}>
          <h2 style={h2()}>📅 Saison (drop courant)</h2>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0 }}>
            Change la saison pour lancer un nouveau drop : ça <b>réinitialise les parties</b> (chaque cliente peut rejouer 1 fois par jeu).
            Active/masque les cartes à gagner ce mois-ci dans la liste plus bas.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input style={{ ...inp(), maxWidth: 240 }} value={saison} onChange={(e) => setSaison(e.target.value)} placeholder="ex. juin-quinzaine-2" />
            <button onClick={saveSaison} style={btn()}>Lancer cette saison</button>
          </div>
        </div>

        {/* LIENS DES JEUX À PARTAGER */}
        <div style={card()}>
          <h2 style={h2()}>🔗 Liens des jeux (newsletter / site)</h2>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0 }}>
            Copie un lien et mets-le dans la newsletter ou sur le site. La cliente clique → entre email + n° de commande → joue → gagne une carte du moment.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {GAMES.filter((g) => g.partageable).map((g) => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/jeu/${g.id}`;
              return (
                <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, minWidth: 150 }}>{g.emoji} {g.nom}</span>
                  <input readOnly value={url} style={{ ...inp(), maxWidth: 360, flex: 1 }} onFocus={(e) => e.target.select()} />
                  <button onClick={() => navigator.clipboard?.writeText(url)} style={miniBtn()}>Copier</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* FORMULAIRE */}
        <div style={card()}>
          <h2 style={h2()}>{form.id ? "Modifier" : "Nouvelle moodaille"}</h2>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ width: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 4 }}>La carte (jeux / tableau)</div>
              <div onClick={() => fileRef.current?.click()} style={{ width: 180, height: 240, borderRadius: 14, border: "2px dashed #d9cdbf", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", textAlign: "center" }}>
                {form.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.img} alt="carte" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 13, opacity: 0.6, padding: 12 }}>Image de la carte 🖼️</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, margin: "12px 0 4px" }}>L&apos;icône (dans la commood)</div>
              <div onClick={() => iconeRef.current?.click()} style={{ width: 96, height: 96, borderRadius: 12, border: "2px dashed #d9cdbf", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", textAlign: "center" }}>
                {form.icone ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.icone} alt="icône" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 11, opacity: 0.6, padding: 8 }}>Icône 🏅</span>
                )}
              </div>
              <input ref={iconeRef} type="file" accept="image/*" onChange={onIcone} style={{ display: "none" }} />
            </div>

            <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Nom"><input style={inp()} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="ex. Moodaille hibiscus" /></Field>
              <Field label="Avantage"><input style={inp()} value={form.avantage} onChange={(e) => setForm({ ...form, avantage: e.target.value })} placeholder="ex. -20% sur l'addon hibiscus" /></Field>
              <Field label="Code"><input style={inp()} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ex. HIBISCUS20" /></Field>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Field label="Rareté">
                  <select style={inp()} value={form.rarete} onChange={(e) => setForm({ ...form, rarete: e.target.value })}>
                    <option value="commune">Commune</option>
                    <option value="rare">Rare</option>
                    <option value="epique">Épique</option>
                    <option value="ultrarare">Ultra-rare</option>
                  </select>
                </Field>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.65, marginBottom: 6 }}>Débloquée par quel(s) jeu(x) ?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {GAMES.filter((g) => g.jouable).map((g) => {
                    const on = (form.jeux ?? (form.jeu ? [form.jeu] : [])).includes(g.id);
                    return (
                      <button key={g.id} type="button" onClick={() => toggleJeu(g.id)} style={{ padding: "6px 11px", borderRadius: 999, border: on ? "none" : "1px solid #e0d6ca", background: on ? ENCRE : "#fff", color: on ? "#fff" : ENCRE, fontSize: 12, cursor: "pointer" }}>
                        {g.emoji} {g.nom}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>Aucun coché = la carte peut tomber dans n&apos;importe quel jeu.</div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                Active (visible / à gagner)
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={save} disabled={busy} style={btn()}>{busy ? "…" : form.id ? "Enregistrer" : "Ajouter"}</button>
                {form.id && <button onClick={() => setForm(VIDE)} style={btnLight()}>Annuler</button>}
                {msg && <span style={{ fontSize: 13, opacity: 0.7, alignSelf: "center" }}>{msg}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* LISTE */}
        <h2 style={{ ...h2(), marginTop: 24 }}>Moodailles ({list.length})</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {list.map((m) => (
            <div key={m.id} style={{ ...card(), padding: 12, opacity: m.actif !== false ? 1 : 0.5 }}>
              <div style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.img} alt={m.nom} style={{ width: "100%", borderRadius: 10, display: "block" }} />
                {m.icone && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.icone} alt="icône" title="icône commood" style={{ position: "absolute", bottom: 6, right: 6, width: 34, height: 34, borderRadius: 8, border: "2px solid #fff", background: "#fff", objectFit: "contain" }} />
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{m.nom}</div>
              {m.avantage && <div style={{ fontSize: 12, opacity: 0.75 }}>{m.avantage}</div>}
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                {m.rarete} · {(() => { const js = m.jeux && m.jeux.length ? m.jeux : (m.jeu ? [m.jeu] : []); return js.length ? js.map((id) => GAMES.find((g) => g.id === id)?.nom ?? id).join(", ") : "tous les jeux"; })()}{m.code ? ` · ${m.code}` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => setForm(m)} style={miniBtn()}>Modifier</button>
                <button onClick={() => toggle(m)} style={miniBtn()}>{m.actif !== false ? "Masquer" : "Activer"}</button>
                <button onClick={() => supprimer(m.id)} style={{ ...miniBtn(), color: "#b54a3a" }}>Suppr</button>
              </div>
            </div>
          ))}
          {!list.length && <p style={{ opacity: 0.6 }}>Aucune moodaille pour l&apos;instant — ajoute la première ci-dessus 🤍</p>}
        </div>

        {/* RÉVOCATION (partage interdit → annuler la carte d'une cliente) */}
        <div style={card()}>
          <h2 style={h2()}>🚫 Annuler une carte (partage interdit)</h2>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0 }}>
            Si une cliente partage son code, annule sa carte ici (elle disparaît de sa collection).
            Pense aussi à désactiver le vrai code promo de ton côté (Shopify).
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...inp(), maxWidth: 240 }} value={revEmail} onChange={(e) => setRevEmail(e.target.value)} placeholder="email de la cliente" />
            <select style={{ ...inp(), maxWidth: 220 }} value={revCard} onChange={(e) => setRevCard(e.target.value)}>
              <option value="">— quelle carte —</option>
              {list.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
            <button onClick={revoke} style={{ ...btn(), background: "#b54a3a" }}>Annuler la carte</button>
            {revMsg && <span style={{ fontSize: 13, opacity: 0.75 }}>{revMsg}</span>}
          </div>
        </div>
      </div>
    </main>
  );
}

function toDataUrl(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale);
        cv.height = Math.round(img.height * scale);
        const ctx = cv.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = fr.result as string;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, flex: 1, minWidth: 120 }}>
      <span style={{ fontWeight: 600, opacity: 0.65 }}>{label}</span>
      {children}
    </label>
  );
}
function card(): React.CSSProperties { return { background: "#fffdfb", border: "1px solid #efe7dd", borderRadius: 16, padding: 18, marginTop: 16 }; }
function h2(): React.CSSProperties { return { fontSize: 17, fontWeight: 500, margin: "0 0 12px" }; }
function inp(): React.CSSProperties { return { width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 10, border: "1px solid #e3d9cd", fontSize: 14, background: "#fff", color: ENCRE }; }
function btn(): React.CSSProperties { return { border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 14, cursor: "pointer", background: ENCRE, color: "#fff" }; }
function btnLight(): React.CSSProperties { return { border: "1px solid #d9cdbf", borderRadius: 999, padding: "10px 18px", fontSize: 14, cursor: "pointer", background: "transparent", color: ENCRE }; }
function miniBtn(): React.CSSProperties { return { border: "1px solid #e0d6ca", borderRadius: 8, padding: "5px 9px", fontSize: 12, cursor: "pointer", background: "#fff", color: ENCRE }; }
