"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import reglagesData from "@/lib/gravure/reglages.json";
import "./styles.css";

type F = { nom: string; fichier: string; type: string; chemin: string };
type Reglage = {
  nom: string; matiere: string; laser: string; puissance: string; vitesse: string;
  passes: string; frequence: string; dpi: string; couleur_addon: string; couleur_trait: string; temps: string;
};
type Base = { base: string; z: string };
type Recipe = { text: string; by: string; at: string };
type Photo = { state: "idle" | "loading" | "none"; url?: string; title?: string };

const REGLAGES = (reglagesData as { reglages: Reglage[]; bases: Base[] }).reglages;
const BASES = (reglagesData as { reglages: Reglage[]; bases: Base[] }).bases;

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const regByName: Record<string, Reglage> = {};
REGLAGES.forEach((r) => { if (!regByName[norm(r.nom)]) regByName[norm(r.nom)] = r; });
// noms triés du plus long au plus court → on privilégie la correspondance la plus précise
const regNames = Object.keys(regByName).sort((a, b) => b.length - a.length);
const baseByName: Record<string, string> = {};
BASES.forEach((b) => { baseByName[norm(b.base)] = b.z; });

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
const idOf = (f: F) => f.chemin + " › " + f.fichier;

export default function GravurePage() {
  const [q, setQ] = useState("");
  const [files, setFiles] = useState<F[]>([]);
  const [total, setTotal] = useState(0);
  const [sel, setSel] = useState<F | null>(null);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<Photo>({ state: "idle" });
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // charge toutes les recettes partagées une fois
  useEffect(() => {
    fetch("/api/gravure/recipes").then((r) => r.json()).then((d) => {
      if (d.recipes) setRecipes(d.recipes);
    }).catch(() => {});
  }, []);

  // recherche (debounce)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setFiles([]); return; }
    timer.current = setTimeout(() => {
      fetch("/api/gravure/search?q=" + encodeURIComponent(q))
        .then((r) => r.json())
        .then((d) => { setFiles(d.files || []); setTotal(d.total || 0); })
        .catch(() => setFiles([]));
    }, 180);
  }, [q]);

  const openFiche = useCallback((f: F) => {
    setSel(f); setEditing(false); setCopied(false);
    setPhoto({ state: "loading" });
    fetch("/api/mood-flyer-search?q=" + encodeURIComponent(f.nom))
      .then((r) => r.json())
      .then((d) => {
        const p = d.products && d.products[0];
        const url = p?.featuredImage?.url || (p?.images && p.images[0]?.url);
        if (url) setPhoto({ state: "idle", url, title: p.title });
        else setPhoto({ state: "none" });
      })
      .catch(() => setPhoto({ state: "none" }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  async function saveRecipe() {
    if (!sel) return;
    setSaving(true);
    const id = idOf(sel);
    const text = draft.trim();
    try {
      const res = await fetch("/api/gravure/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text }),
      });
      const d = await res.json();
      setRecipes((prev) => {
        const next = { ...prev };
        if (!text) delete next[id];
        else next[id] = d.recipe || { text, by: "", at: "" };
        return next;
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const reg = sel ? findReglage(sel.nom) : null;
  const bz = sel ? findBaseZ(sel.nom) : null;
  const rec = sel ? recipes[idOf(sel)] : undefined;

  return (
    <div className="grv">
      <h1 className="title">Atelier <span>Gravure</span></h1>
      <p className="sub">Tape un nom — le fichier de gravure, son dossier, le réglage et la recette arrivent.</p>

      {!sel && (
        <>
          <div className="searchbox">
            <input
              className="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ex. panda, sakura, zebre, reale, cadence…"
              autoFocus
            />
          </div>
          <p className="hint">
            {q.trim()
              ? files.length + " résultat" + (files.length > 1 ? "s" : "") + (files.length >= 60 ? " (affine ta recherche)" : "")
              : total ? total.toLocaleString("fr") + " fichiers de gravure indexés" : "Commence à taper le nom du dessin, du produit ou de la cliente."}
          </p>

          {files.length > 0 && (
            <>
              <div className="count">Résultats</div>
              <div className="results">
                {files.map((f) => (
                  <button key={idOf(f)} className="row" onClick={() => openFiche(f)}>
                    <span>
                      <span className="nm">{f.nom}</span>
                      <span className="fd">{f.chemin}</span>
                    </span>
                    <span className={"tag " + typeClass(f.type)}>{f.type}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {sel && (
        <div className="fiche">
          <button className="back" onClick={() => setSel(null)}>← Retour à la recherche</button>
          <div className="fhead">
            <h2>{sel.nom}</h2>
            <span className={"tag " + typeClass(sel.type)}>{sel.type}</span>
          </div>

          <div className="block first">
            <div className="lab">📁 Où trouver le fichier</div>
            <div className="crumb">{sel.chemin} › <b>{sel.fichier}</b></div>
            <button className="copy" onClick={() => { navigator.clipboard?.writeText(sel.chemin + " › " + sel.fichier); setCopied(true); }}>
              {copied ? "Copié ✓" : "Copier le chemin"}
            </button>
          </div>

          <div className="block">
            <div className="lab">🔧 Réglage</div>
            {reg ? (
              <>
                <div className="setting">
                  <Cell k="puissance" v={reg.puissance} />
                  <Cell k="vitesse" v={reg.vitesse} />
                  <Cell k="passes" v={reg.passes} />
                  <Cell k="fréquence" v={reg.frequence} />
                  <Cell k="dpi" v={reg.dpi} />
                </div>
                <div className="meta">
                  {reg.matiere && <span>Matière <b>{reg.matiere}</b></span>}
                  {reg.laser && <span>Mode <b>{reg.laser}</b></span>}
                  {reg.couleur_addon && <span>Couleur addon <b>{reg.couleur_addon}</b></span>}
                  {reg.couleur_trait && <span>Couleur trait <b>{reg.couleur_trait}</b></span>}
                  {reg.temps && <span>Temps <b>{reg.temps}</b></span>}
                </div>
              </>
            ) : sel.type === "Laser" ? (
              <>
                <p className="none">Pas de réglage spécifique enregistré. Applique le standard selon la matière :</p>
                <div className="rule">
                  <div className="r"><div className="t">Polymère</div><div className="n">80 · 350 · 1 · 20’000 · 800</div></div>
                  <div className="r"><div className="t">Alu</div><div className="n">80 · 350 · 1 · 20’000 · 800</div></div>
                </div>
              </>
            ) : bz ? (
              <div className="crumb">Base « {bz.base} » → <b>{bz.z}</b></div>
            ) : (
              <p className="none">Pas de réglage indiqué pour ce fichier.</p>
            )}
          </div>

          <div className="block">
            <div className="lab">📷 Photo produit</div>
            {photo.state === "loading" && <p className="none">Recherche de la photo sur Shopify…</p>}
            {photo.state === "none" && <p className="none">Aucune photo trouvée sur Shopify pour ce nom.</p>}
            {photo.url && (
              <div className="photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.title || sel.nom} />
                {photo.title && <div className="pt">{photo.title}</div>}
              </div>
            )}
          </div>

          <div className="block recipe">
            <div className="lab">📝 Recette de fabrication</div>
            {!editing && rec && (
              <>
                <pre>{rec.text}</pre>
                {rec.by && <div className="by">Ajoutée par {rec.by}</div>}
                <div className="editrow">
                  <button className="btn ghost" onClick={() => { setDraft(rec.text); setEditing(true); }}>Modifier</button>
                </div>
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
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={"ex.\n1. graver sur polymère neutre\n2. coloration noir\n3. poncer\n4. coloration turquoise\n5. laser"}
                  autoFocus
                />
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
  return (
    <div className="cell">
      <div className="k">{k}</div>
      <div className="v">{v || "—"}</div>
    </div>
  );
}
