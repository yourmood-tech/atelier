"use client";

import { useState, useRef } from "react";
import type { Ecriture } from "@/lib/wineur/accounting";

const API_SOURCES = [
  { id: "sumup",   label: "SumUp",            emoji: "💳", color: "#00B4D8" },
  { id: "paypal",  label: "PayPal",            emoji: "🅿️", color: "#003087" },
  { id: "shopify", label: "Shopify Payouts",   emoji: "🛍️", color: "#96BF48" },
];

const FILE_SOURCES = [
  { id: "postfinance", label: "PostFinance (CAMT053 ZIP/XML)", emoji: "🏦", accept: ".zip,.xml" },
  { id: "twint",       label: "Twint (CSV export)",            emoji: "📱", accept: ".csv" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function WineurPage() {
  const [start, setStart] = useState(monthStart());
  const [end, setEnd]     = useState(today());
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set(["sumup", "paypal", "shopify"]));
  const [activeFiles, setActiveFiles]     = useState<Set<string>>(new Set());
  const [files, setFiles]   = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function toggleSource(id: string) {
    setActiveSources((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleFile(id: string) {
    setActiveFiles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleFile(id: string, f: File | undefined) {
    if (!f) return;
    setFiles((prev) => ({ ...prev, [id]: f }));
  }

  async function parseFileSources(): Promise<Ecriture[]> {
    // Placeholder — CAMT053 and Twint parsing happens client-side in a future iteration
    // For now, we signal if files are present but not parsed
    return [];
  }

  async function generate() {
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const ecritures_extra = await parseFileSources();

      const res = await fetch("/api/wineur/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start,
          end,
          sources: [...activeSources],
          ecritures_extra,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Erreur serveur : ${txt.slice(0, 200)}`);
      }

      const csv = await res.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `wineur_${start}_${end}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      const lines = csv.split("\n").length - 1;
      setStatus(`✅ ${lines} écritures générées — fichier téléchargé`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const hasAnything = activeSources.size > 0 || activeFiles.size > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
            📊 WinEUR Hub
          </h1>
          <p style={{ color: "#6e6e73", marginTop: 6, fontSize: 14 }}>
            Génère un fichier d&apos;écritures comptables prêt pour l&apos;import WinEUR GIT
          </p>
        </div>

        {/* Période */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e5e5ea" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 14px" }}>
            Période
          </h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "#6e6e73", display: "block", marginBottom: 4 }}>Du</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d2d2d7", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ color: "#6e6e73", marginTop: 18 }}>→</div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "#6e6e73", display: "block", marginBottom: 4 }}>Au</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d2d2d7", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
              />
            </div>
          </div>
          {/* Raccourcis période */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { label: "Hier",       fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().slice(0,10); setStart(s); setEnd(s); } },
              { label: "Cette sem.", fn: () => { const d = new Date(); const day = d.getDay() || 7; const mon = new Date(d); mon.setDate(d.getDate()-day+1); setStart(mon.toISOString().slice(0,10)); setEnd(today()); } },
              { label: "Ce mois",    fn: () => { setStart(monthStart()); setEnd(today()); } },
              { label: "Mois préc.", fn: () => { const d = new Date(); const y = d.getMonth()===0 ? d.getFullYear()-1 : d.getFullYear(); const m = d.getMonth()===0 ? 12 : d.getMonth(); const last = new Date(d.getFullYear(), d.getMonth(), 0); setStart(`${y}-${String(m).padStart(2,"0")}-01`); setEnd(last.toISOString().slice(0,10)); } },
            ].map(({ label, fn }) => (
              <button key={label} onClick={fn} style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid #d2d2d7", background: "white", fontSize: 13, cursor: "pointer", color: "#1d1d1f" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sources API */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e5e5ea" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 14px" }}>
            Sources directes (API)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {API_SOURCES.map(({ id, label, emoji, color }) => {
              const active = activeSources.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleSource(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12,
                    border: active ? `2px solid ${color}` : "2px solid #e5e5ea",
                    background: active ? `${color}15` : "white",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#1d1d1f" }}>{label}</span>
                  <span style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: 10, background: active ? color : "#e5e5ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {active && <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sources fichier */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 24, border: "1px solid #e5e5ea" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 14px" }}>
            Sources manuelles (import fichier)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FILE_SOURCES.map(({ id, label, emoji, accept }) => {
              const active = activeFiles.has(id);
              const f = files[id];
              return (
                <div key={id}>
                  <button
                    onClick={() => { toggleFile(id); if (!active) setTimeout(() => fileRefs.current[id]?.click(), 50); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%",
                      padding: "12px 16px", borderRadius: 12,
                      border: active ? "2px solid #8E8E93" : "2px solid #e5e5ea",
                      background: active ? "#8E8E9315" : "white",
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#1d1d1f" }}>{label}</div>
                      {f && <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 2 }}>{f.name}</div>}
                    </div>
                    <span style={{ fontSize: 13, color: "#6e6e73" }}>{active ? "Changer" : "Sélectionner"}</span>
                  </button>
                  <input
                    ref={(el) => { fileRefs.current[id] = el; }}
                    type="file"
                    accept={accept}
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleFile(id, f); setActiveFiles((prev) => new Set([...prev, id])); } }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bouton générer */}
        <button
          onClick={generate}
          disabled={loading || !hasAnything}
          style={{
            width: "100%", padding: "16px", borderRadius: 14,
            background: hasAnything ? "#007AFF" : "#d2d2d7",
            color: "white", fontSize: 17, fontWeight: 600,
            border: "none", cursor: hasAnything ? "pointer" : "default",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Génération en cours…" : "Générer le fichier WinEUR"}
        </button>

        {/* Status / erreur */}
        {status && (
          <div style={{ marginTop: 16, padding: "14px 18px", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 12, color: "#065f46", fontSize: 14 }}>
            {status}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 16, padding: "14px 18px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, color: "#991b1b", fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        <p style={{ textAlign: "center", color: "#c7c7cc", fontSize: 12, marginTop: 24 }}>
          WinEUR Hub · Mood Collection SA · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
