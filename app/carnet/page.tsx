"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "./styles.css";

type FileRef = { url: string; name: string };
type Addon = {
  id: string; collectionId: string; nom: string;
  format?: string; matiere?: string; couleur?: string; finition?: string;
  croquis?: string[]; inspi?: string[]; ai?: FileRef[]; photos?: string[];
  laser?: string; realisation?: string; mtrl?: string; shopify?: string;
};
type Collection = { id: string; name: string; month: string; addons: Addon[] };

const FORMATS = ["addon", "deux tiers", "medium", "mini", "open mood", "base", "pack", "coffret"];
const MATIERES = ["argent", "acier", "titane", "or", "aluminium", "polymère", "céramique", "bronze"];

async function api(action: string, body: Record<string, unknown> = {}) {
  const r = await fetch("/api/carnet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
  return r.json();
}

export default function CarnetPage() {
  const [cols, setCols] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [colId, setColId] = useState<string | null>(null);
  const [addonId, setAddonId] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "col" | "addon">(null);
  const [draft, setDraft] = useState("");
  const [draft2, setDraft2] = useState("");

  const load = useCallback(() => {
    fetch("/api/carnet").then((r) => r.json()).then((d) => { setCols(d.collections || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const col = cols.find((c) => c.id === colId) || null;
  const addon = col?.addons.find((a) => a.id === addonId) || null;

  function patchAddonLocal(id: string, patch: Partial<Addon>) {
    setCols((prev) => prev.map((c) => ({ ...c, addons: c.addons.map((a) => (a.id === id ? { ...a, ...patch } : a)) })));
  }
  async function saveAddon(id: string, patch: Partial<Addon>) {
    patchAddonLocal(id, patch);
    await api("updateAddon", { id, patch });
  }

  async function createCollection() {
    const d = await api("createCollection", { name: draft.trim() || "Sans nom", month: draft2.trim() });
    if (d.collection) { setModal(null); setDraft(""); setDraft2(""); load(); }
  }
  async function createAddon() {
    if (!colId) return;
    const d = await api("createAddon", { collectionId: colId, nom: draft.trim() || "Nouvel addon" });
    if (d.addon) { setModal(null); setDraft(""); load(); setAddonId(d.addon.id); }
  }

  return (
    <div className="carnet">
      <div className="top">
        <h1 className="brand">Le Carnet des <em>nouveautés</em></h1>
      </div>
      <p className="tagline">Chaque création, sa fiche. Le dictionnaire de fabrication Mood.</p>

      {loading && <div className="empty">Chargement…</div>}

      {/* VUE COLLECTIONS */}
      {!loading && !colId && (
        <>
          <h2>Collections</h2>
          <div className="grid">
            <button className="card add-card" onClick={() => { setModal("col"); setDraft(""); setDraft2(""); }}>+ Nouvelle collection</button>
            {cols.map((c) => {
              const cover = c.addons.flatMap((a) => a.photos || [])[0] || c.addons.flatMap((a) => a.croquis || [])[0];
              return (
                <button key={c.id} className="card" onClick={() => setColId(c.id)}>
                  {cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className="kthumb" src={cover} alt="" />
                    : <div className="kthumb ph">🌸</div>}
                  <div className="kname">{c.name}</div>
                  <div className="kmeta">{c.month || "—"} · {c.addons.length} pièce{c.addons.length > 1 ? "s" : ""}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* VUE ADDONS D'UNE COLLECTION */}
      {!loading && col && !addon && (
        <>
          <div className="crumb"><button onClick={() => setColId(null)}>← Collections</button> · {col.name}</div>
          <h2>{col.name} <span style={{ color: "var(--muted)", fontSize: 15 }}>{col.month}</span></h2>
          <div className="grid">
            <button className="card add-card" onClick={() => { setModal("addon"); setDraft(""); }}>+ Ajouter un addon</button>
            {col.addons.map((a) => {
              const cover = (a.photos || [])[0] || (a.croquis || [])[0] || (a.inspi || [])[0];
              return (
                <button key={a.id} className="card" onClick={() => setAddonId(a.id)}>
                  {cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className="kthumb" src={cover} alt="" />
                    : <div className="kthumb ph">✎</div>}
                  <div className="kname">{a.nom}</div>
                  <div className="kmeta">{[a.format, a.matiere, a.couleur].filter(Boolean).join(" · ") || "à détailler"}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* FICHE ADDON */}
      {!loading && col && addon && (
        <>
          <div className="crumb">
            <button onClick={() => setColId(null)}>Collections</button> · <button onClick={() => setAddonId(null)}>{col.name}</button> · {addon.nom}
          </div>
          <Fiche key={addon.id} addon={addon} onSave={saveAddon} />
        </>
      )}

      {/* MODAL */}
      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === "col" ? "Nouvelle collection" : "Nouvel addon"}</h3>
            <input autoFocus placeholder={modal === "col" ? "Nom de la collection" : "Nom de l'addon"} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") (modal === "col" ? createCollection() : createAddon()); }} />
            {modal === "col" && <input placeholder="Mois (ex. Août 2026)" value={draft2} onChange={(e) => setDraft2(e.target.value)} />}
            <div className="row">
              <button className="btn ghost sm" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn sm" onClick={() => (modal === "col" ? createCollection() : createAddon())}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Fiche({ addon, onSave }: { addon: Addon; onSave: (id: string, patch: Partial<Addon>) => void }) {
  const [saved, setSaved] = useState("");
  const flash = () => { setSaved("Enregistré ✓"); setTimeout(() => setSaved(""), 1500); };
  const save = (patch: Partial<Addon>) => { onSave(addon.id, patch); flash(); };

  const field = (k: keyof Addon, v: string) => save({ [k]: v } as Partial<Addon>);

  return (
    <div className="fiche">
      <div className="fiche-head">
        <input className="nom-input" defaultValue={addon.nom} onBlur={(e) => field("nom", e.target.value)} />
        <div className="save">{saved}</div>
      </div>

      <div className="detrow">
        <TextField label="Format" val={addon.format} list="fmt" onSave={(v) => field("format", v)} />
        <TextField label="Type" val={addon.matiere} list="mat" onSave={(v) => field("matiere", v)} placeholder="matière" />
        <TextField label="Couleur" val={addon.couleur} onSave={(v) => field("couleur", v)} />
        <TextField label="Finition" val={addon.finition} onSave={(v) => field("finition", v)} />
        <datalist id="fmt">{FORMATS.map((f) => <option key={f} value={f} />)}</datalist>
        <datalist id="mat">{MATIERES.map((f) => <option key={f} value={f} />)}</datalist>
      </div>

      <ImageZone title="Croquis" items={addon.croquis || []} onChange={(v) => save({ croquis: v })} />
      <ImageZone title="Inspiration / vectoriel" items={addon.inspi || []} onChange={(v) => save({ inspi: v })} />
      <FileZone title="Fichier .ai" items={addon.ai || []} onChange={(v) => save({ ai: v })} />
      <ImageZone title="Photo du produit" items={addon.photos || []} onChange={(v) => save({ photos: v })} />

      <div className="sec">
        <h3><span className="dot" /> Réglage (si laser)</h3>
        <div className="field"><textarea defaultValue={addon.laser} placeholder="ex. puissance · vitesse · passes · fréquence · dpi, matière, mode…" onBlur={(e) => field("laser", e.target.value)} /></div>
      </div>
      <div className="sec">
        <h3><span className="dot" /> Réalisation de l'addon</h3>
        <div className="field"><textarea defaultValue={addon.realisation} placeholder={"Comment tu l'as faite…\nex.\n1. graver sur polymère neutre\n2. coloration noir\n3. poncer\n4. coloration turquoise\n5. laser"} onBlur={(e) => field("realisation", e.target.value)} /></div>
      </div>
      <div className="detrow">
        <TextField label="Code MTRL / fournisseur" val={addon.mtrl} onSave={(v) => field("mtrl", v)} />
        <TextField label="Lien Shopify" val={addon.shopify} onSave={(v) => field("shopify", v)} placeholder="https://…" />
      </div>
      {addon.shopify && <p><a className="shoplink" href={addon.shopify} target="_blank" rel="noreferrer">Ouvrir la fiche Shopify ↗</a></p>}
    </div>
  );
}

function TextField({ label, val, onSave, list, placeholder }: { label: string; val?: string; onSave: (v: string) => void; list?: string; placeholder?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input defaultValue={val} list={list} placeholder={placeholder} onBlur={(e) => onSave(e.target.value)} />
    </div>
  );
}

async function uploadFile(file: File): Promise<{ url: string; name: string; image: boolean } | null> {
  const fd = new FormData(); fd.append("file", file);
  const r = await fetch("/api/carnet/upload", { method: "POST", body: fd });
  const d = await r.json();
  return d.url ? { url: d.url, name: d.name, image: d.image } : null;
}

function ImageZone({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) { const u = await uploadFile(f); if (u) urls.push(u.url); }
    onChange([...items, ...urls]);
    setBusy(false);
  }
  return (
    <div className="sec">
      <h3><span className="dot" /> {title}</h3>
      <div className="zone">
        {items.map((u, i) => (
          <div className="thumb" key={u + i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" />
            <button className="rm" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <div className={"drop" + (busy ? " busy" : "")} onClick={() => inp.current?.click()}>
          {busy ? "Envoi…" : <>＋<span>ajouter</span></>}
        </div>
        <input ref={inp} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>
    </div>
  );
}

function FileZone({ title, items, onChange }: { title: string; items: FileRef[]; onChange: (v: FileRef[]) => void }) {
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: FileRef[] = [];
    for (const f of Array.from(files)) { const u = await uploadFile(f); if (u) added.push({ url: u.url, name: u.name }); }
    onChange([...items, ...added]);
    setBusy(false);
  }
  return (
    <div className="sec">
      <h3><span className="dot" /> {title}</h3>
      <div className="zone">
        {items.map((f, i) => (
          <a className="filechip" key={f.url + i} href={f.url} target="_blank" rel="noreferrer">
            📄 {f.name || "fichier"}
            <button className="rm" onClick={(e) => { e.preventDefault(); onChange(items.filter((_, j) => j !== i)); }}>×</button>
          </a>
        ))}
        <div className={"drop" + (busy ? " busy" : "")} onClick={() => inp.current?.click()}>
          {busy ? "Envoi…" : <>＋<span>ajouter</span></>}
        </div>
        <input ref={inp} type="file" hidden onChange={(e) => add(e.target.files)} />
      </div>
    </div>
  );
}
