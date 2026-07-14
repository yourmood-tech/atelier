"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import reglagesData from "@/lib/gravure/reglages.json";
import "./styles.css";

type Produit = { title: string; handle: string; image: string | null };
type Fichier = { nom: string; fichier: string; type: string; chemin: string; ap?: string };
type Reglage = {
  nom: string; matiere: string; laser: string; puissance: string; vitesse: string;
  passes: string; frequence: string; dpi: string; couleur_addon: string; couleur_trait: string; temps: string;
};
type Base = { base: string; z: string };
type Fraise = { matiere: string; fraise: string; vitesse: string; m20: string };
type Recipe = { text: string; by: string; at: string };

const DATA = reglagesData as { reglages: Reglage[]; bases: Base[]; mecanique: Fraise[] };
const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const regByName: Record<string, Reglage> = {};
DATA.reglages.forEach((r) => { if (!regByName[norm(r.nom)]) regByName[norm(r.nom)] = r; });
const regNames = Object.keys(regByName).sort((a, b) => b.length - a.length);
const baseByName: Record<string, string> = {};
DATA.bases.forEach((b) => { baseByName[norm(b.base)] = b.z; });

function findReglage(name: string): Reglage | null {
  const n = norm(name);
  if (regByName[n]) return regByName[n];
  for (const k of regNames) if (k.length > 3 && (n.includes(k) || k.includes(n))) return regByName[k];
  return null;
}
function findBaseZ(name: string): { base: string; z: string } | null {
  const n = norm(name);
  for (const k in baseByName) if (k.length > 3 && n.includes(k)) return { base: k, z: baseByName[k] };
  return null;
}
const typeClass = (t: string) => "t-" + t.normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function GravurePage() {
  const [q, setQ] = useState("");
  const [produits, setProduits] = useState<Produit[]>([]);
  const [searching, setSearching] = useState(false);
  const [prod, setProd] = useState<Produit | null>(null);
  const [fichiers, setFichiers] = useState<Fichier[]>([]);
  const [selFile, setSelFile] = useState<Fichier | null>(null);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/gravure/recipes").then((r) => r.json()).then((d) => { if (d.recipes) setRecipes(d.recipes); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setProduits([]); return; }
    setSearching(true);
    timer.current = setTimeout(() => {
      fetch("/api/gravure/produits?q=" + encodeURIComponent(q))
        .then((r) => r.json())
        .then((d) => setProduits(d.produits || []))
        .catch(() => setProduits([]))
        .finally(() => setSearching(false));
    }, 200);
  }, [q]);

  const openProduit = useCallback((p: Produit) => {
    setProd(p); setEditing(false); setCopied(false); setFichiers([]); setSelFile(null);
    fetch("/api/gravure/fichiers?q=" + encodeURIComponent(p.title))
      .then((r) => r.json())
      .then((d) => { setFichiers(d.fichiers || []); setSelFile((d.fichiers || [])[0] || null); })
      .catch(() => {});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  async function saveRecipe() {
    if (!prod) return;
    setSaving(true);
    const id = "prod:" + prod.handle;
    const text = draft.trim();
    try {
      const res = await fetch("/api/gravure/recipes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text }),
      });
      const d = await res.json();
      setRecipes((prev) => { const n = { ...prev }; if (!text) delete n[id]; else n[id] = d.recipe || { text, by: "", at: "" }; return n; });
      setEditing(false);
    } finally { setSaving(false); }
  }

  const reg = selFile && selFile.type === "Laser" ? findReglage(selFile.nom) : null;
  const bz = selFile ? findBaseZ(selFile.nom) : null;
  const isMeca = selFile ? (selFile.type === "Mécanique" || selFile.type === "Intérieur") : false;
  const rec = prod ? recipes["prod:" + prod.handle] : undefined;

  return (
    <div className="grv">
      <h1 className="title">Atelier <span>Gravure</span></h1>
      <p className="sub">Le mode d&apos;emploi de fabrication. Cherche le produit (comme sur la commande) → tout ce qu&apos;il faut pour le graver.</p>

      {!prod && (
        <>
          <div className="searchbox">
            <input className="q" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Nom du produit sur la commande (ex. Goofy, Panda, Poya…)" autoFocus />
          </div>
          <p className="hint">{searching ? "Recherche…" : produits.length ? produits.length + " produit" + (produits.length > 1 ? "s" : "") : q.trim().length >= 2 ? "Aucun produit trouvé." : "Tape le nom du produit."}</p>
          <div className="results">
            {produits.map((p) => (
              <button key={p.handle} className="row" onClick={() => openProduit(p)}>
                {p.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img className="thumb" src={p.image} alt="" loading="lazy" />
                  : <span className="thumb ph" aria-hidden="true" />}
                <span className="nm">{p.title}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {prod && (
        <div className="fiche">
          <button className="back" onClick={() => setProd(null)}>← Retour à la recherche</button>

          <div className="manual-head">
            {prod.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img className="pphoto" src={prod.image} alt={prod.title} />
              : <span className="pphoto ph" aria-hidden="true" />}
            <h2>{prod.title}</h2>
          </div>

          {/* FICHIER À OUVRIR */}
          <div className="block first">
            <div className="lab">📄 Fichier de gravure à ouvrir</div>
            {fichiers.length === 0 && <p className="none">Aucun fichier de gravure trouvé pour ce produit. Vérifie le nom, ou le fichier n&apos;est pas encore rangé.</p>}
            {fichiers.length > 1 && (
              <div className="cands">
                {fichiers.map((f) => (
                  <button key={f.chemin + f.fichier} className={"cand" + (selFile === f ? " on" : "")} onClick={() => setSelFile(f)}>
                    {f.nom} <span className={"tag " + typeClass(f.type)}>{f.type}</span>
                  </button>
                ))}
              </div>
            )}
            {selFile && (
              <>
                <div className="crumb">{selFile.chemin} › <b>{selFile.fichier}</b></div>
                <button className="copy" onClick={() => { navigator.clipboard?.writeText(selFile.chemin + " › " + selFile.fichier); setCopied(true); }}>
                  {copied ? "Copié ✓" : "Copier le chemin"}
                </button>
                {selFile.ap && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="apercu" src={"/apercus/" + selFile.ap + ".jpg"} alt="aperçu du dessin" />
                )}
              </>
            )}
          </div>

          {/* TYPE + RÉGLAGE */}
          {selFile && (
            <div className="block">
              <div className="lab">🔧 Gravure {selFile.type.toLowerCase()}{selFile.type === "Laser" ? " — réglage" : isMeca ? " — matière & fraise" : ""}</div>
              {selFile.type === "Laser" ? (
                reg ? (
                  <>
                    <div className="setting">
                      <Cell k="puissance" v={reg.puissance} /><Cell k="vitesse" v={reg.vitesse} />
                      <Cell k="passes" v={reg.passes} /><Cell k="fréquence" v={reg.frequence} /><Cell k="dpi" v={reg.dpi} />
                    </div>
                    <div className="meta">
                      {reg.matiere && <span>Matière <b>{reg.matiere}</b></span>}
                      {reg.laser && <span>Mode <b>{reg.laser}</b></span>}
                      {reg.couleur_addon && <span>Couleur addon <b>{reg.couleur_addon}</b></span>}
                      {reg.couleur_trait && <span>Couleur trait <b>{reg.couleur_trait}</b></span>}
                      {reg.temps && <span>Temps <b>{reg.temps}</b></span>}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="none">Pas de réglage enregistré pour ce dessin. Standard selon la matière :</p>
                    <div className="rule">
                      <div className="r"><div className="t">Polymère</div><div className="n">80 · 350 · 1 · 20’000 · 800</div></div>
                      <div className="r"><div className="t">Alu</div><div className="n">80 · 350 · 1 · 20’000 · 800</div></div>
                    </div>
                  </>
                )
              ) : isMeca ? (
                <>
                  <p className="none">Repère la matière, applique la fraise correspondante :</p>
                  <div className="tablewrap">
                    <table className="fraises">
                      <thead><tr><th>Matière</th><th>Fraise</th><th>Vitesse</th><th>M20</th></tr></thead>
                      <tbody>
                        {DATA.mecanique.map((m) => (
                          <tr key={m.matiere}><td>{m.matiere}</td><td>{m.fraise}</td><td>{m.vitesse}</td><td className="num">{m.m20}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bz && <div className="crumb" style={{ marginTop: 12 }}>Base « {bz.base} » → <b>{bz.z}</b></div>}
                </>
              ) : (
                <p className="none">Gravure {selFile.type.toLowerCase()}.</p>
              )}
            </div>
          )}

          {/* RECETTE */}
          <div className="block recipe">
            <div className="lab">📝 Recette de fabrication</div>
            {!editing && rec && (
              <>
                <pre>{rec.text}</pre>
                {rec.by && <div className="by">Ajoutée par {rec.by}</div>}
                <div className="editrow"><button className="btn ghost" onClick={() => { setDraft(rec.text); setEditing(true); }}>Modifier</button></div>
              </>
            )}
            {!editing && !rec && (
              <>
                <p className="none">Aucune recette encore.</p>
                <button className="btn" onClick={() => { setDraft(""); setEditing(true); }}>➕ Ajouter une recette</button>
              </>
            )}
            {editing && (
              <>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                  placeholder={"ex.\n1. graver sur polymère neutre\n2. coloration noir\n3. poncer\n4. coloration turquoise\n5. laser"} autoFocus />
                <div className="editrow">
                  <button className="btn" onClick={saveRecipe} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
                  <button className="btn ghost" onClick={() => setEditing(false)}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return <div className="cell"><div className="k">{k}</div><div className="v">{v || "—"}</div></div>;
}
