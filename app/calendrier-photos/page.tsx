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

  const manque = (p: Photos) => [
    ...SLOTS.filter((s) => !p[s.k]).map((s) => s.label.toLowerCase()),
    ...(!p.ambiance?.length ? ["ambiance"] : []),
  ];
  const completes = cases.filter((c) => manque(c.photos).length === 0).length;
  const vues = cases.filter((c) => filtre === "tout" || manque(c.photos).length > 0);

  return (
    <main className="cp">
      <style>{CSS}</style>
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
            : m.length === 0 ? { cls: "pret", txt: passe ? "Complète — posée cette nuit" : `Complète — en ligne le ${jourTxt(c.n)} à minuit` }
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

function Zone({ label, url, occupe, onFiles, onRetirer }: { label: string; url?: string; occupe: boolean; onFiles: (f: FileList) => void; onRetirer: () => void }) {
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
    </label>
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
.cp .case.ok{border-top-color:var(--ok)} .cp .case.pret{border-top-color:var(--blue)} .cp .case.manque{border-top-color:var(--warn)}
.cp .tete{display:flex;gap:12px;align-items:center}
.cp .num{font-family:"Playfair Display",Georgia,serif;font-size:28px;color:var(--gold);min-width:40px}
.cp h2{font-size:16px;margin:0;font-weight:600}
.cp .tete p{margin:2px 0 0;color:var(--muted);font-size:13px}
.cp .etat{font-size:13px;font-weight:600;margin:10px 0}
.cp .etat.ok{color:var(--ok)} .cp .etat.pret{color:var(--blue)} .cp .etat.manque{color:var(--warn)}
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
@media (max-width:420px){.cp .grille{grid-template-columns:1fr}}
`;
