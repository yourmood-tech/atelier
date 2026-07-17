"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "./styles.css";

type FileRef = { url: string; name: string };
type Addon = {
  id: string; collectionId: string; nom: string;
  format?: string | string[]; matiere?: string; couleur?: string; finition?: string;
  croquis?: string[]; inspi?: string[]; ai?: FileRef[]; photos?: string[];
  laser?: string; realisation?: string; mtrl?: string; shopify?: string;
};
type Collection = { id: string; name: string; month: string; addons: Addon[] };

const FORMATS = ["addon", "deux tiers", "medium", "mini", "open mood", "base", "pack", "coffret"];
// format peut être une chaîne (ancien) ou un tableau (nouveau) — on lit les deux sans rien perdre
const fmtArr = (v?: string | string[]) => Array.isArray(v) ? v : (v ? String(v).split(/[,·]/).map((s) => s.trim()).filter(Boolean) : []);
const fmtLabel = (v?: string | string[]) => fmtArr(v).join(" · ");
const MATIERES = ["argent", "acier", "titane", "or", "aluminium", "polymère", "céramique", "bronze"];

async function api(action: string, body: Record<string, unknown> = {}) {
  const r = await fetch("/api/carnet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
  return r.json();
}

export default function CarnetPage() {
  const [cols, setCols] = useState<Collection[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [colId, setColId] = useState<string | null>(null);
  const [addonId, setAddonId] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "col" | "addon">(null);
  const [draft, setDraft] = useState("");
  const [draft2, setDraft2] = useState("");

  const load = useCallback(() => {
    fetch("/api/carnet").then((r) => r.json()).then((d) => { setCols(d.collections || []); setCanEdit(!!d.canEdit); setLoading(false); }).catch(() => setLoading(false));
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
            {canEdit && <button className="card add-card" onClick={() => { setModal("col"); setDraft(""); setDraft2(""); }}>+ Nouvelle collection</button>}
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
          <button className="btn ghost sm backbtn" onClick={() => setColId(null)}>← Retour aux collections</button>
          <h2>{col.name} <span style={{ color: "var(--muted)", fontSize: 15 }}>{col.month}</span></h2>
          <div className="grid">
            {canEdit && <button className="card add-card" onClick={() => { setModal("addon"); setDraft(""); }}>+ Ajouter un addon</button>}
            {col.addons.map((a) => {
              const cover = (a.photos || [])[0] || (a.croquis || [])[0] || (a.inspi || [])[0];
              return (
                <button key={a.id} className="card" onClick={() => setAddonId(a.id)}>
                  {cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className="kthumb" src={cover} alt="" />
                    : <div className="kthumb ph">✎</div>}
                  <div className="kname">{a.nom}</div>
                  <div className="kmeta">{[fmtLabel(a.format), a.matiere, a.couleur].filter(Boolean).join(" · ") || "à détailler"}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* FICHE ADDON */}
      {!loading && col && addon && (
        <>
          <button className="btn ghost sm backbtn" onClick={() => setAddonId(null)}>← Retour à « {col.name} »</button>
          <div className="crumb">
            <button onClick={() => { setColId(null); setAddonId(null); }}>Collections</button> · <button onClick={() => setAddonId(null)}>{col.name}</button> · {addon.nom}
          </div>
          <Fiche key={addon.id} addon={addon} onSave={saveAddon} canEdit={canEdit} />
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

function Fiche({ addon, onSave, canEdit }: { addon: Addon; onSave: (id: string, patch: Partial<Addon>) => void; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState("");
  const flash = () => { setSaved("Enregistré ✓"); setTimeout(() => setSaved(""), 1500); };
  const save = (patch: Partial<Addon>) => { onSave(addon.id, patch); flash(); };
  const field = (k: keyof Addon, v: string) => save({ [k]: v } as Partial<Addon>);

  if (!editing) {
    return (
      <>
        <FicheRender addon={addon} />
        {canEdit && <div className="editbar"><button className="btn" onClick={() => setEditing(true)}>✎ Modifier la fiche</button></div>}
      </>
    );
  }

  return (
    <div className="fiche">
      <div className="fiche-head">
        <input className="nom-input" defaultValue={addon.nom} onBlur={(e) => field("nom", e.target.value)} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="save">{saved}</span><button className="btn ghost sm" onClick={() => setEditing(false)}>✓ Terminé</button></div>
      </div>

      <FormatChips value={addon.format} onSave={(v) => save({ format: v })} />
      <div className="detrow">
        <TextField label="Matière" val={addon.matiere} list="mat" onSave={(v) => field("matiere", v)} placeholder="matière" />
        <TextField label="Couleur" val={addon.couleur} onSave={(v) => field("couleur", v)} />
        <TextField label="Finition" val={addon.finition} onSave={(v) => field("finition", v)} />
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

function RGallery({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="r-sec">
      <h3>{title}</h3>
      <div className="r-gallery">
        {items.map((u, i) => (
          <a key={u + i} href={u} target="_blank" rel="noreferrer" className="r-shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" loading="lazy" />
          </a>
        ))}
      </div>
    </section>
  );
}

function FicheRender({ addon }: { addon: Addon }) {
  const photos = addon.photos || [];
  const hero = photos[0] || (addon.croquis || [])[0] || (addon.inspi || [])[0];
  const tags = [...fmtArr(addon.format), addon.matiere, addon.couleur, addon.finition].filter(Boolean) as string[];
  return (
    <article className="render">
      <header className="r-hero">
        {hero
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="r-hero-img" src={hero} alt={addon.nom} />
          : <div className="r-hero-img ph">🌸</div>}
        <div className="r-hero-txt">
          <h1>{addon.nom}</h1>
          {tags.length > 0 && <div className="r-tags">{tags.map((t, i) => <span className="r-tag" key={i}>{t}</span>)}</div>}
        </div>
      </header>

      <RGallery title="Photos du produit" items={photos.length > 1 ? photos.slice(1) : (hero && photos[0] === hero ? [] : photos)} />
      <RGallery title="Croquis" items={addon.croquis} />
      <RGallery title="Inspiration" items={addon.inspi} />

      {addon.ai && addon.ai.length > 0 && (
        <section className="r-sec">
          <h3>Fichier .ai</h3>
          <div className="zone">
            {addon.ai.map((f, i) => <a className="filechip" key={f.url + i} href={f.url} target="_blank" rel="noreferrer">📄 {f.name || "fichier"}</a>)}
          </div>
        </section>
      )}
      {addon.laser?.trim() && (
        <section className="r-sec"><h3>Réglage laser</h3><pre className="r-text">{addon.laser}</pre></section>
      )}
      {addon.realisation?.trim() && (
        <section className="r-sec"><h3>Réalisation</h3><pre className="r-text">{addon.realisation}</pre></section>
      )}
      {(addon.mtrl || addon.shopify) && (
        <footer className="r-foot">
          {addon.mtrl && <span>Code MTRL&nbsp;: <b>{addon.mtrl}</b></span>}
          {addon.shopify && <a href={addon.shopify} target="_blank" rel="noreferrer">Fiche Shopify ↗</a>}
        </footer>
      )}
    </article>
  );
}

function FormatChips({ value, onSave }: { value?: string | string[]; onSave: (v: string[]) => void }) {
  const sel = fmtArr(value);
  const opts = Array.from(new Set([...FORMATS, ...sel]));
  const toggle = (f: string) => onSave(sel.includes(f) ? sel.filter((x) => x !== f) : [...sel, f]);
  return (
    <div className="field" style={{ marginTop: 22 }}>
      <label>Format <span style={{ textTransform: "none", letterSpacing: 0 }}>(plusieurs possibles)</span></label>
      <div className="chips">
        {opts.map((f) => (
          <button key={f} type="button" className={"chip" + (sel.includes(f) ? " on" : "")} onClick={() => toggle(f)}>{f}</button>
        ))}
      </div>
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
