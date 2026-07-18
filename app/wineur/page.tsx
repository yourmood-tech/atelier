"use client";

import { useState, useRef } from "react";
import type { Ecriture } from "@/lib/wineur/accounting";
import type { UnknownEntry, MappingSource } from "@/lib/wineur/mappings";

const API_SOURCES = [
  { id: "sumup",   label: "SumUp",            emoji: "💳", color: "#00B4D8" },
  { id: "paypal",  label: "PayPal",            emoji: "🅿️", color: "#003087" },
  { id: "shopify", label: "Shopify Payouts",   emoji: "🛍️", color: "#96BF48" },
];

const FILE_SOURCES = [
  { id: "twint",       label: "Twint (CSV export portal.twint.ch)", emoji: "📱", accept: ".csv",      route: "/api/wineur/parse-twint" },
  { id: "powerpay",    label: "Powerpay (PDF décompte)",             emoji: "💜", accept: ".pdf",      route: "/api/wineur/parse-powerpay" },
  { id: "postfinance", label: "PostFinance (CAMT053 ZIP/XML)",       emoji: "🏦", accept: ".zip,.xml", route: "/api/wineur/parse-camt053" },
  { id: "visa-pf",     label: "Visa PostFinance (PDF relevé carte)", emoji: "💳", accept: ".pdf",      route: "/api/wineur/parse-visa-pf" },
];

function today()      { return new Date().toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }

// ── Composant résolution des inconnus ────────────────────────────────────────
function UnknownResolver({
  unknowns,
  onResolve,
  onSkip,
}: {
  unknowns: UnknownEntry[];
  onResolve: (resolved: Array<{ source: MappingSource; key: string; compte: string }>) => void;
  onSkip: () => void;
}) {
  const [accounts, setAccounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(unknowns.map(u => [u.key, ""]))
  );

  const filled = unknowns.filter(u => accounts[u.key]?.trim()).length;

  return (
    <div style={{ background: "#fff8e1", border: "1px solid #f59e0b", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#92400e", margin: "0 0 6px" }}>
        ⚠️ {unknowns.length} fournisseur{unknowns.length > 1 ? "s" : ""} inconnu{unknowns.length > 1 ? "s" : ""}
      </h2>
      <p style={{ fontSize: 13, color: "#78350f", margin: "0 0 16px" }}>
        Saisis le compte WinEUR pour chacun — il sera mémorisé pour la prochaine fois.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {unknowns.map(u => (
          <div key={u.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{u.label}</div>
              <div style={{ fontSize: 11, color: "#6e6e73" }}>{u.date} · {u.amount.toFixed(2)} CHF · {u.source}</div>
            </div>
            <input
              type="text"
              placeholder="Ex: 650080"
              value={accounts[u.key] ?? ""}
              onChange={e => setAccounts(prev => ({ ...prev, [u.key]: e.target.value }))}
              style={{ width: 100, padding: "6px 10px", border: "1px solid #d2d2d7", borderRadius: 8, fontSize: 14, textAlign: "center" }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          onClick={() => {
            const resolved = unknowns
              .filter(u => accounts[u.key]?.trim())
              .map(u => ({ source: u.source, key: u.key, compte: accounts[u.key].trim() }));
            onResolve(resolved);
          }}
          disabled={filled === 0}
          style={{ flex: 1, padding: "10px", borderRadius: 10, background: filled > 0 ? "#007AFF" : "#d2d2d7", color: "white", border: "none", cursor: filled > 0 ? "pointer" : "default", fontSize: 14, fontWeight: 600 }}
        >
          Sauvegarder {filled > 0 ? `(${filled})` : ""} et générer
        </button>
        <button
          onClick={onSkip}
          style={{ padding: "10px 16px", borderRadius: 10, background: "white", border: "1px solid #d2d2d7", cursor: "pointer", fontSize: 14, color: "#6e6e73" }}
        >
          Ignorer et générer quand même
        </button>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function WineurPage() {
  const [start, setStart] = useState(monthStart());
  const [end, setEnd]     = useState(today());
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set(["sumup", "paypal", "shopify"]));
  const [activeFiles, setActiveFiles]     = useState<Set<string>>(new Set());
  const [files, setFiles]   = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [unknowns, setUnknowns] = useState<UnknownEntry[]>([]);
  const [pendingEcritures, setPendingEcritures] = useState<Ecriture[]>([]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function toggleSource(id: string) {
    setActiveSources(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleFile(id: string) {
    setActiveFiles(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function handleFile(id: string, f: File | undefined) {
    if (!f) return;
    setFiles(prev => ({ ...prev, [id]: f }));
  }

  async function parseFileSources(): Promise<{ ecritures: Ecriture[]; unknowns: UnknownEntry[] }> {
    const allEcritures: Ecriture[] = [];
    const allUnknowns: UnknownEntry[] = [];
    for (const src of FILE_SOURCES) {
      if (!activeFiles.has(src.id) || !files[src.id] || !src.route) continue;
      const form = new FormData();
      form.append("file", files[src.id]);
      const res = await fetch(src.route, { method: "POST", body: form });
      if (!res.ok) throw new Error(`${src.label} : ${(await res.text()).slice(0, 200)}`);
      const j = await res.json() as { ecritures?: Ecriture[]; unknowns?: UnknownEntry[]; unknown_merchants?: string[] };
      if (j.ecritures) allEcritures.push(...j.ecritures);
      if (j.unknowns) allUnknowns.push(...j.unknowns);
    }
    return { ecritures: allEcritures, unknowns: allUnknowns };
  }

  // sources=null → re-génère sans re-appeler les API (skip avec écritures en attente)
  async function generate(extraEcritures?: Ecriture[], skipApiSources = false) {
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const { ecritures: fileEcritures, unknowns: fileUnknowns } = extraEcritures
        ? { ecritures: extraEcritures, unknowns: [] }
        : await parseFileSources();

      // Si inconnus fichiers → stopper et demander les comptes
      if (fileUnknowns.length > 0 && !extraEcritures) {
        setPendingEcritures(fileEcritures);
        setUnknowns(fileUnknowns);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/wineur/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start, end,
          sources: skipApiSources ? [] : [...activeSources],
          ecritures_extra: fileEcritures,
        }),
      });

      if (!res.ok) throw new Error(`Erreur serveur : ${(await res.text()).slice(0, 200)}`);

      const contentType = res.headers.get("content-type") ?? "";

      // Nom du fichier de résultats = même nom que le fichier PostFinance déposé + "-wineur.csv"
      const pfFile   = activeFiles.has("postfinance") ? files["postfinance"] : undefined;
      const baseName = pfFile ? pfFile.name.replace(/\.[^.]+$/, "") : null;
      const outName  = baseName ? `${baseName}-wineur.csv` : `wineur_${start}_${end}.csv`;

      if (contentType.includes("application/json")) {
        const j = await res.json() as {
          unknowns?: UnknownEntry[];
          ecritures?: Ecriture[];
          multi_year?: boolean;
          files?: Array<{ year: string; filename: string; lines: number; csv: string }>;
        };

        // Plusieurs années fiscales → un fichier par année, téléchargés à la suite
        if (j.multi_year && j.files) {
          for (const f of j.files) {
            const dl   = baseName ? `${baseName}-${f.year}-wineur.csv` : f.filename;
            const blob = new Blob([f.csv], { type: "text/csv;charset=utf-8;" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href = url; a.download = dl; a.click();
            URL.revokeObjectURL(url);
            await new Promise(r => setTimeout(r, 400)); // éviter que le navigateur bloque les téléchargements multiples
          }
          const detail = j.files.map(f => `${baseName ? `${baseName}-${f.year}-wineur.csv` : f.filename} (${f.lines})`).join(" + ");
          setStatus(`✅ ${j.files.length} années fiscales détectées — ${j.files.length} fichiers téléchargés : ${detail}`);
          setUnknowns([]); setPendingEcritures([]);
          return;
        }

        // Sinon : fournisseurs inconnus détectés côté API → afficher le résolveur
        setPendingEcritures(j.ecritures ?? []);
        setUnknowns(j.unknowns ?? []);
        setLoading(false);
        return;
      }

      const csv = await res.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = outName; a.click();
      URL.revokeObjectURL(url);

      const lines = csv.split("\n").length - 1;
      setStatus(`✅ ${lines} écritures générées — fichier téléchargé`);
      setUnknowns([]); setPendingEcritures([]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function resolveUnknowns(resolved: Array<{ source: MappingSource; key: string; compte: string }>) {
    if (resolved.length > 0) {
      await fetch("/api/wineur/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolved),
      });
    }
    setUnknowns([]);
    // Re-générer from scratch : les nouveaux mappings KV seront utilisés par PayPal
    await generate();
  }

  const hasAnything = activeSources.size > 0 || activeFiles.size > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>📊 WinEUR Hub</h1>
          <p style={{ color: "#6e6e73", marginTop: 6, fontSize: 14 }}>Génère un fichier d&apos;écritures comptables prêt pour l&apos;import WinEUR GIT</p>
        </div>

        {/* Résolution des inconnus */}
        {unknowns.length > 0 && (
          <UnknownResolver
            unknowns={unknowns}
            onResolve={resolveUnknowns}
            onSkip={() => { setUnknowns([]); generate(pendingEcritures, true); }}
          />
        )}

        {/* Période */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e5e5ea" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 14px" }}>Période</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: "#6e6e73", display: "block", marginBottom: 4 }}>Du</label><input type="date" value={start} onChange={e => setStart(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d2d2d7", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }} /></div>
            <div style={{ color: "#6e6e73", marginTop: 18 }}>→</div>
            <div style={{ flex: 1 }}><label style={{ fontSize: 12, color: "#6e6e73", display: "block", marginBottom: 4 }}>Au</label><input type="date" value={end} onChange={e => setEnd(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d2d2d7", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { label: "Hier",       fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s=d.toISOString().slice(0,10); setStart(s); setEnd(s); } },
              { label: "Cette sem.", fn: () => { const d = new Date(); const day=d.getDay()||7; const mon=new Date(d); mon.setDate(d.getDate()-day+1); setStart(mon.toISOString().slice(0,10)); setEnd(today()); } },
              { label: "Ce mois",    fn: () => { setStart(monthStart()); setEnd(today()); } },
              { label: "Mois préc.", fn: () => { const d=new Date(); const y=d.getMonth()===0?d.getFullYear()-1:d.getFullYear(); const m=d.getMonth()===0?12:d.getMonth(); const last=new Date(d.getFullYear(),d.getMonth(),0); setStart(`${y}-${String(m).padStart(2,"0")}-01`); setEnd(last.toISOString().slice(0,10)); } },
            ].map(({label,fn})=>(
              <button key={label} onClick={fn} style={{ padding:"4px 12px",borderRadius:20,border:"1px solid #d2d2d7",background:"white",fontSize:13,cursor:"pointer",color:"#1d1d1f" }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Sources API */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e5e5ea" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 14px" }}>Sources directes (API)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {API_SOURCES.map(({ id, label, emoji, color }) => {
              const active = activeSources.has(id);
              return (
                <button key={id} onClick={() => toggleSource(id)} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,border:active?`2px solid ${color}`:"2px solid #e5e5ea",background:active?`${color}15`:"white",cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#1d1d1f" }}>{label}</span>
                  <span style={{ marginLeft:"auto",width:20,height:20,borderRadius:10,background:active?color:"#e5e5ea",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {active && <span style={{ color:"white",fontSize:13,fontWeight:700 }}>✓</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sources fichier */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 24, border: "1px solid #e5e5ea" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 14px" }}>Sources manuelles (import fichier)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FILE_SOURCES.map(({ id, label, emoji, accept }) => {
              const active = activeFiles.has(id);
              const f = files[id];
              return (
                <div key={id}>
                  <button onClick={() => { toggleFile(id); if (!active) setTimeout(() => fileRefs.current[id]?.click(), 50); }} style={{ display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 16px",borderRadius:12,border:active?"2px solid #8E8E93":"2px solid #e5e5ea",background:active?"#8E8E9315":"white",cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
                    <span style={{ fontSize: 22 }}>{emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#1d1d1f" }}>{label}</div>
                      {f && <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 2 }}>{f.name}</div>}
                    </div>
                    <span style={{ fontSize: 13, color: "#6e6e73" }}>{active ? "Changer" : "Sélectionner"}</span>
                  </button>
                  <input ref={el => { fileRefs.current[id] = el; }} type="file" accept={accept} style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f){handleFile(id,f);setActiveFiles(prev=>new Set([...prev,id]));} }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bouton générer */}
        {unknowns.length === 0 && (
          <button onClick={() => generate()} disabled={loading || !hasAnything} style={{ width:"100%",padding:"16px",borderRadius:14,background:hasAnything?"#007AFF":"#d2d2d7",color:"white",fontSize:17,fontWeight:600,border:"none",cursor:hasAnything?"pointer":"default",transition:"background 0.15s" }}>
            {loading ? "Génération en cours…" : "Générer le fichier WinEUR"}
          </button>
        )}

        {status && <div style={{ marginTop:16,padding:"14px 18px",background:"#d1fae5",border:"1px solid #6ee7b7",borderRadius:12,color:"#065f46",fontSize:14 }}>{status}</div>}
        {error  && <div style={{ marginTop:16,padding:"14px 18px",background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:12,color:"#991b1b",fontSize:14 }}>⚠️ {error}</div>}

        <p style={{ textAlign:"center",color:"#c7c7cc",fontSize:12,marginTop:24 }}>WinEUR Hub · Mood Collection SA · {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
