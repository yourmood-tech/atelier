"use client";

// Liste des photos du calendrier 2026 : pour chaque case, ce qui est là et ce qui manque.
// Tout est posé automatiquement sur la fiche le jour J à minuit.
import { useEffect, useState } from "react";

type Photos = { sansBase?: string; avecBase?: string; portee?: string; ambiance?: string[]; gif?: string; publie?: string; erreur?: string };
type Case = { n: number; t: string; d: string; photos: Photos };

const SLOTS: { k: "sansBase" | "avecBase" | "portee"; label: string }[] = [
  { k: "sansBase", label: "Produit sans base" },
  { k: "avecBase", label: "Produit avec base" },
  { k: "portee", label: "Photo portée" },
];

const jourTxt = (n: number) => (n === 1 ? "1er" : String(n)) + " décembre";

// réduit les très grandes photos (max 2400 px) pour que l'envoi passe toujours
async function preparer(f: File): Promise<File> {
  if (f.type === "image/gif" || f.size < 3_500_000) return f;
  const img = await createImageBitmap(f);
  const k = Math.min(1, 2400 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const b: Blob = await new Promise((r) => c.toBlob((x) => r(x!), "image/jpeg", 0.92));
  return new File([b], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

async function envoyer(f: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", await preparer(f));
  const r = await fetch("/api/carnet/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!j.url) throw new Error(j.error || "envoi raté");
  return j.url;
}

export default function CalendrierPhotos() {
  const [cases, setCases] = useState<Case[]>([]);
  const [jour, setJour] = useState(0);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"tout" | "manque">("tout");
  // photo en cours de recadrage : d'où elle vient et où elle va
  const [recadre, setRecadre] = useState<null | { src: string; n: number; slot: string; ancien?: string }>(null);

  const charger = async () => {
    const j = await (await fetch("/api/calendrier-photos")).json();
    setCases(j.cases || []); setJour(j.jour || 0);
  };
  useEffect(() => { charger(); }, []);

  const agir = async (n: number, body: Record<string, unknown>, tag: string) => {
    setOccupe(tag);
    try {
      const j = await (await fetch("/api/calendrier-photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ n, ...body }) })).json();
      if (j.photos) setCases((cs) => cs.map((c) => (c.n === n ? { ...c, photos: j.photos } : c)));
      else alert(j.error || "Ça n'a pas marché");
    } finally { setOccupe(null); }
  };

  const deposer = async (n: number, slot: string, files: FileList | File[]) => {
    const liste = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!liste.length) return;
    // une seule photo → on propose tout de suite le recadrage
    if (liste.length === 1 && liste[0].type !== "image/gif") { setRecadre({ src: URL.createObjectURL(liste[0]), n, slot }); return; }
    setOccupe(n + slot);
    try {
      if (slot === "ambiance") {
        for (const f of liste) await agir(n, { action: "ambiance", url: await envoyer(f) }, n + slot);
      } else {
        await agir(n, { action: "poser", slot, url: await envoyer(liste[0]) }, n + slot);
      }
    } catch (e) { alert(String((e as Error).message)); }
    finally { setOccupe(null); }
  };

  const finirRecadrage = async (f: File) => {
    const r = recadre!; setRecadre(null);
    setOccupe(r.n + r.slot);
    try {
      const url = await envoyer(f);
      if (r.slot === "ambiance") await agir(r.n, r.ancien ? { action: "remplacerAmbiance", ancien: r.ancien, url } : { action: "ambiance", url }, r.n + r.slot);
      else await agir(r.n, { action: "poser", slot: r.slot, url }, r.n + r.slot);
    } catch (e) { alert(String((e as Error).message)); }
    finally { setOccupe(null); }
  };

  const manque = (p: Photos) => [
    ...SLOTS.filter((s) => !p[s.k]).map((s) => s.label.toLowerCase()),
    ...(!p.ambiance?.length ? ["ambiance"] : []),
  ];
  const completes = cases.filter((c) => manque(c.photos).length === 0).length;
  const vues = cases.filter((c) => filtre === "tout" || manque(c.photos).length > 0);

  return (
    <main className="cp">
      <style>{CSS}</style>
      {recadre && <Recadreur src={recadre.src} carreParDefaut={recadre.slot !== "ambiance"} onAnnuler={() => setRecadre(null)} onValider={finirRecadrage} />}
      <header>
        <h1>Photos du calendrier 2026</h1>
        <p className="sous">Dépose les photos de chaque case. Elles se posent toutes seules sur la fiche <b>le jour J à minuit</b>, avec le gif (fabriqué automatiquement avec les deux photos produit).</p>
        <div className="barre">
          <span className="compte"><b>{completes}</b> / 24 cases complètes</span>
          <button className={filtre === "tout" ? "on" : ""} onClick={() => setFiltre("tout")}>Toutes</button>
          <button className={filtre === "manque" ? "on" : ""} onClick={() => setFiltre("manque")}>Seulement ce qui manque</button>
        </div>
      </header>

      <section className="grille">
        {vues.map((c) => {
          const p = c.photos;
          const m = manque(p);
          const enLigne = !!p.publie;
          const passe = jour >= c.n;
          const etat = enLigne ? { cls: "ok", txt: "En ligne ✓" }
            : m.length === 0 ? { cls: "pret", txt: passe ? "Tout est là ✓ — posée cette nuit" : `Tout est là ✓ — en ligne le ${jourTxt(c.n)} à minuit` }
            : { cls: "manque", txt: "Manque : " + m.join(", ") };
          return (
            <article key={c.n} className={"case " + etat.cls}>
              <div className="tete">
                <span className="num">{String(c.n).padStart(2, "0")}</span>
                <div>
                  <h2>{c.t}</h2>
                  <p>{c.d} · {jourTxt(c.n)}</p>
                </div>
              </div>
              <p className={"etat " + etat.cls}>{etat.txt}</p>
              {p.erreur && <p className="err">Problème : {p.erreur}</p>}

              <div className="slots">
                {SLOTS.map((s) => (
                  <Zone key={s.k} label={s.label} url={p[s.k]} occupe={occupe === c.n + s.k}
                    onFiles={(f) => deposer(c.n, s.k, f)}
                    onRecadrer={() => setRecadre({ src: p[s.k]!, n: c.n, slot: s.k })}
                    onRetirer={() => agir(c.n, { action: "retirer", slot: s.k }, c.n + s.k)} />
                ))}
                <div className="zone gif">
                  <span className="lab">Gif (automatique)</span>
                  {p.gif ? <img src={p.gif} alt="gif" /> : <div className="vide">{p.sansBase && p.avecBase ? (occupe === c.n + "gif" ? "Fabrication…" : "—") : "Se fait dès que les 2 photos produit sont là"}</div>}
                  {p.sansBase && p.avecBase && <button className="petit" onClick={() => agir(c.n, { action: "gif" }, c.n + "gif")}>Refaire le gif</button>}
                </div>
              </div>

              <div className="amb">
                <span className="lab">Photos d'ambiance (dans la description)</span>
                <div className="vignettes">
                  {(p.ambiance || []).map((u) => (
                    <div key={u} className="vig">
                      <img src={u} alt="" />
                      <button className="rec" title="Recadrer" onClick={() => setRecadre({ src: u, n: c.n, slot: "ambiance", ancien: u })}>✂</button>
                      <button title="Retirer" onClick={() => agir(c.n, { action: "retirerAmbiance", url: u }, c.n + "ambiance")}>×</button>
                    </div>
                  ))}
                  <Ajout occupe={occupe === c.n + "ambiance"} multiple onFiles={(f) => deposer(c.n, "ambiance", f)} />
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function Zone({ label, url, occupe, onFiles, onRecadrer, onRetirer }: { label: string; url?: string; occupe: boolean; onFiles: (f: FileList) => void; onRecadrer: () => void; onRetirer: () => void }) {
  const [survol, setSurvol] = useState(false);
  return (
    <label className={"zone" + (survol ? " survol" : "") + (url ? " pleine" : "")}
      onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => { e.preventDefault(); setSurvol(false); onFiles(e.dataTransfer.files); }}>
      <span className="lab">{label}</span>
      {occupe ? <div className="vide">Envoi…</div> : url ? <img src={url} alt={label} /> : <div className="vide">Glisse la photo ici<br />ou clique</div>}
      <input type="file" accept="image/*" hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
      {url && !occupe && <button className="x" title="Retirer" onClick={(e) => { e.preventDefault(); onRetirer(); }}>×</button>}
      {url && !occupe && <button className="recadrer" onClick={(e) => { e.preventDefault(); onRecadrer(); }}>✂ Recadrer</button>}
    </label>
  );
}

// fenêtre de recadrage : un cadre qu'on déplace et qu'on agrandit par les coins
type R = { x: number; y: number; w: number; h: number };
function Recadreur({ src, carreParDefaut, onAnnuler, onValider }: { src: string; carreParDefaut: boolean; onAnnuler: () => void; onValider: (f: File) => void }) {
  const [carre, setCarre] = useState(carreParDefaut);
  const [taille, setTaille] = useState<{ w: number; h: number } | null>(null); // taille affichée
  const [r, setR] = useState<R>({ x: 0, y: 0, w: 0, h: 0 });
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      const k = Math.min(1, (window.innerWidth * 0.86) / i.naturalWidth, (window.innerHeight * 0.66) / i.naturalHeight);
      const w = Math.round(i.naturalWidth * k), h = Math.round(i.naturalHeight * k);
      setTaille({ w, h }); setImg(i);
      const c = Math.min(w, h);
      setR(carreParDefaut ? { x: (w - c) / 2, y: (h - c) / 2, w: c, h: c } : { x: 0, y: 0, w, h });
    };
    i.onerror = () => setErreur("Impossible d'ouvrir cette photo");
    i.src = src;
  }, [src, carreParDefaut]);

  const passerCarre = (v: boolean) => {
    setCarre(v);
    if (v && taille) setR((o) => { const c = Math.min(o.w, o.h); return { x: o.x + (o.w - c) / 2, y: o.y + (o.h - c) / 2, w: c, h: c }; });
  };

  const tirer = (e: React.PointerEvent, coin: string | null) => {
    e.preventDefault(); e.stopPropagation();
    if (!taille) return;
    const x0 = e.clientX, y0 = e.clientY, d = { ...r }, W = taille.w, H = taille.h, MIN = 40;
    const bouge = (ev: PointerEvent) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!coin) { setR({ ...d, x: Math.max(0, Math.min(W - d.w, d.x + dx)), y: Math.max(0, Math.min(H - d.h, d.y + dy)) }); return; }
      // le coin opposé reste fixe
      const fx = coin.includes("g") ? d.x + d.w : d.x, fy = coin.includes("h") ? d.y + d.h : d.y;
      let px = Math.max(0, Math.min(W, (coin.includes("g") ? d.x : d.x + d.w) + dx));
      let py = Math.max(0, Math.min(H, (coin.includes("h") ? d.y : d.y + d.h) + dy));
      let w = Math.max(MIN, Math.abs(px - fx)), h = Math.max(MIN, Math.abs(py - fy));
      if (carre) {
        const lim = Math.min(coin.includes("g") ? fx : W - fx, coin.includes("h") ? fy : H - fy);
        w = h = Math.min(Math.max(w, h), lim);
      }
      px = coin.includes("g") ? fx - w : fx; py = coin.includes("h") ? fy - h : fy;
      setR({ x: px, y: py, w, h });
    };
    const fin = () => { window.removeEventListener("pointermove", bouge); window.removeEventListener("pointerup", fin); };
    window.addEventListener("pointermove", bouge); window.addEventListener("pointerup", fin);
  };

  const valider = () => {
    if (!img || !taille) return;
    const k = img.naturalWidth / taille.w;
    let sw = Math.round(r.w * k), sh = Math.round(r.h * k);
    const z = Math.min(1, 2400 / Math.max(sw, sh));
    const c = document.createElement("canvas");
    c.width = Math.round(sw * z); c.height = Math.round(sh * z);
    c.getContext("2d")!.drawImage(img, Math.round(r.x * k), Math.round(r.y * k), sw, sh, 0, 0, c.width, c.height);
    try {
      c.toBlob((b) => b ? onValider(new File([b], "recadree.jpg", { type: "image/jpeg" })) : setErreur("Recadrage raté"), "image/jpeg", 0.92);
    } catch { setErreur("Cette photo ne peut pas être recadrée ici"); }
    sw = sh = 0;
  };

  return (
    <div className="fond-rec" onClick={onAnnuler}>
      <div className="boite-rec" onClick={(e) => e.stopPropagation()}>
        <div className="rec-tete">
          <b>Recadrer</b>
          <div className="choix">
            <button className={carre ? "on" : ""} onClick={() => passerCarre(true)}>Carré</button>
            <button className={!carre ? "on" : ""} onClick={() => passerCarre(false)}>Libre</button>
          </div>
        </div>
        {erreur ? <p className="err">{erreur}</p> : !taille ? <p className="vide">Chargement…</p> : (
          <div className="scene" style={{ width: taille.w, height: taille.h }}>
            <img src={src} alt="" draggable={false} style={{ width: taille.w, height: taille.h }} />
            <div className="cadre" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} onPointerDown={(e) => tirer(e, null)}>
              {["hg", "hd", "bg", "bd"].map((c) => <span key={c} className={"coin " + c} onPointerDown={(e) => tirer(e, c)} />)}
            </div>
          </div>
        )}
        <p className="aide">Déplace le cadre, tire sur les coins pour l'agrandir ou le réduire.</p>
        <div className="rec-pied">
          <button onClick={onAnnuler}>Annuler</button>
          <button className="ok" onClick={valider} disabled={!taille}>Valider</button>
        </div>
      </div>
    </div>
  );
}

function Ajout({ occupe, multiple, onFiles }: { occupe: boolean; multiple?: boolean; onFiles: (f: FileList) => void }) {
  const [survol, setSurvol] = useState(false);
  return (
    <label className={"ajout" + (survol ? " survol" : "")}
      onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => { e.preventDefault(); setSurvol(false); onFiles(e.dataTransfer.files); }}>
      {occupe ? "Envoi…" : "+ Ajouter"}
      <input type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
    </label>
  );
}

const CSS = `
.cp{--bg:#f7f4ef;--card:#fff;--ink:#2b2622;--muted:#8c8177;--line:#e8e0d4;--gold:#b08b57;--ok:#4f8a5b;--warn:#c0573f;--blue:#4c82b5;
  font-family:Poppins,system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;padding:24px 16px 60px}
.cp header{max-width:1200px;margin:0 auto 20px}
.cp h1{font-family:"Playfair Display",Georgia,serif;font-weight:500;font-size:30px;margin:0 0 6px}
.cp .sous{color:var(--muted);margin:0 0 14px;max-width:760px;line-height:1.5}
.cp .barre{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cp .compte{margin-right:8px}
.cp .barre button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 14px;cursor:pointer;font:inherit;font-size:13px}
.cp .barre button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.cp .grille{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.cp .case{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;border-top:4px solid var(--line)}
.cp .case.manque{border-top-color:var(--warn)}
.cp .case.pret,.cp .case.ok{border-color:#9cc7a5;border-top-color:var(--ok);background:#eef7ef}
.cp .case.ok{background:#e2f1e4}
.cp .tete{display:flex;gap:12px;align-items:center}
.cp .num{font-family:"Playfair Display",Georgia,serif;font-size:28px;color:var(--gold);min-width:40px}
.cp h2{font-size:16px;margin:0;font-weight:600}
.cp .tete p{margin:2px 0 0;color:var(--muted);font-size:13px}
.cp .etat{font-size:13px;font-weight:600;margin:10px 0}
.cp .etat.ok,.cp .etat.pret{color:var(--ok)} .cp .etat.manque{color:var(--warn)}
.cp .err{background:#fbeae6;color:var(--warn);font-size:12px;padding:6px 8px;border-radius:8px}
.cp .slots{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cp .zone{position:relative;display:flex;flex-direction:column;border:1.5px dashed var(--line);border-radius:10px;padding:6px;cursor:pointer;background:#fcfaf7}
.cp .zone.pleine{border-style:solid}
.cp .zone.survol,.cp .ajout.survol{border-color:var(--gold);background:#f6efe4}
.cp .zone.gif{cursor:default;border-style:solid;background:#fff}
.cp .lab{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-bottom:4px}
.cp .zone img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px}
.cp .vide{aspect-ratio:1;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;color:var(--muted);padding:6px}
.cp .x,.cp .vig button{position:absolute;top:22px;right:8px;width:24px;height:24px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;line-height:1}
.cp .petit{margin-top:6px;border:1px solid var(--line);background:#fff;border-radius:6px;font:inherit;font-size:11px;padding:4px;cursor:pointer}
.cp .amb{margin-top:10px}
.cp .vignettes{display:flex;flex-wrap:wrap;gap:6px}
.cp .vig{position:relative}
.cp .vig img{width:72px;height:72px;object-fit:cover;border-radius:6px;display:block}
.cp .vig button{top:2px;right:2px;width:20px;height:20px}
.cp .ajout{width:72px;height:72px;border:1.5px dashed var(--line);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--muted);cursor:pointer;text-align:center}
.cp .recadrer{position:absolute;left:10px;bottom:10px;border:0;border-radius:999px;background:rgba(255,255,255,.92);font:inherit;font-size:11px;padding:4px 10px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.cp .vig .rec{left:2px;right:auto;font-size:11px}
.cp .fond-rec{position:fixed;inset:0;background:rgba(20,16,12,.7);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
.cp .boite-rec{background:#fff;border-radius:14px;padding:14px;max-width:96vw;max-height:96vh;overflow:auto}
.cp .rec-tete{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:12px}
.cp .choix button,.cp .rec-pied button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer;margin-left:6px}
.cp .choix button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.cp .scene{position:relative;margin:0 auto;user-select:none;touch-action:none;overflow:hidden}
.cp .scene img{display:block}
.cp .cadre{position:absolute;box-shadow:0 0 0 9999px rgba(0,0,0,.55);outline:2px solid #fff;cursor:move}
.cp .coin{position:absolute;width:22px;height:22px;background:#fff;border-radius:50%;box-shadow:0 0 0 2px var(--gold)}
.cp .coin.hg{left:-3px;top:-3px;cursor:nwse-resize} .cp .coin.bd{right:-3px;bottom:-3px;cursor:nwse-resize}
.cp .coin.hd{right:-3px;top:-3px;cursor:nesw-resize} .cp .coin.bg{left:-3px;bottom:-3px;cursor:nesw-resize}
.cp .aide{font-size:12px;color:var(--muted);text-align:center;margin:10px 0 6px}
.cp .rec-pied{display:flex;justify-content:flex-end}
.cp .rec-pied .ok{background:var(--gold);border-color:var(--gold);color:#fff}
@media (max-width:420px){.cp .grille{grid-template-columns:1fr}}
`;
