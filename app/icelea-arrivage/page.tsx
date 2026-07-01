"use client";

import { useRef, useState } from "react";
import { code128Svg } from "@/lib/icelea/barcode";

type ReceptionRow = {
  code: string | null; label: string; size: string | null; invoiceQty: number;
  sku: string | null; variantId: number | null; barcode: string | null;
  pos: { po: string; line: number; rowId: number; qty: number; created: string }[];
  openQty: number; match: "code" | "nom" | "approx" | "manuel" | "corrige" | "aucun";
};
type Summary = {
  invoiceLines: number; invoicePieces: number; receptionRows: number;
  matchedRows: number; approxRows: number; manualRows: number; noAssocRows?: number; iceleaVariants: number;
};
type CatalogEntry = { vid: number; sku: string; size: string | null; barcode: string | null; pos: { po: string; line: number; qty: number }[] };
type ReceiveResult = { receivedOnPO: { po: string; line: number; qty: number }[]; totalReceivedPO: number; surplus: number; forcedNoPO: number; picked: number };

export default function IceleaArrivagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ReceptionRow[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [editRows, setEditRows] = useState<Record<number, boolean>>({});
  const [recv, setRecv] = useState<Record<number, { recvQty: string; pickQty: string }>>({}); // saisie réception/picking par ligne
  const [done, setDone] = useState<Record<number, ReceiveResult>>({}); // réceptions validées
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  // Lecture défensive : si le serveur renvoie du HTML (timeout Vercel…), on affiche
  // le vrai texte au lieu d'un « Unexpected token » cryptique.
  async function readJson(res: Response): Promise<Record<string, unknown>> {
    const t = await res.text();
    try { return JSON.parse(t); } catch { return { error: t.slice(0, 300) || `HTTP ${res.status}` }; }
  }

  async function prepare() {
    if (!file) { setError("Choisis d'abord la facture PDF."); return; }
    setLoading(true); setError(null); setRows(null); setSummary(null);
    try {
      const fd = new FormData(); fd.append("pdf", file);
      const res = await fetch("/api/icelea-arrivage/prepare", { method: "POST", body: fd });
      const data = await readJson(res);
      if (!res.ok) { setError((data.error as string) || "Erreur"); setLoading(false); return; }
      setRows(data.rows as ReceptionRow[]); setSummary(data.summary as Summary);
      setCatalog((data.catalog as CatalogEntry[]) ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  function updateRow(i: number, c: CatalogEntry) {
    setRows((prev) => prev ? prev.map((r, idx) => idx === i ? {
      ...r, sku: c.sku, variantId: c.vid, barcode: c.barcode, size: c.size ?? r.size,
      pos: c.pos.map((p) => ({ po: p.po, line: p.line, rowId: 0, qty: p.qty, created: "" })),
      openQty: c.pos.reduce((s, p) => s + p.qty, 0), match: "corrige",
    } : r) : prev);
  }
  // mémorise la correction côté serveur → réappliquée aux prochaines factures
  // (sku null = mémorise "sans association Katana")
  function learnPick(label: string, sku: string | null) {
    fetch("/api/icelea-arrivage/learn", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, sku }),
    }).catch(() => {});
  }
  // valide le choix proposé d'une ligne "à vérifier" → confirmé + mémorisé
  function confirmRow(i: number, label: string, sku: string | null) {
    if (!sku) return;
    setRows((prev) => prev ? prev.map((r, idx) => idx === i ? { ...r, match: "corrige" } : r) : prev);
    learnPick(label, sku);
  }
  // marque une ligne comme "sans association Katana" (article hors Katana) + mémorise
  function markNoAssoc(i: number, label: string) {
    setRows((prev) => prev ? prev.map((r, idx) => idx === i
      ? { ...r, sku: null, variantId: null, barcode: null, pos: [], openQty: 0, match: "aucun" } : r) : prev);
    learnPick(label, null);
    setEditRows((e) => ({ ...e, [i]: false }));
  }

  // valide la réception d'une ligne : imputation FIFO PO + surplus + picking (écrit dans Katana)
  async function validateReceive(i: number, r: ReceptionRow) {
    const d = recv[i] || { recvQty: "", pickQty: "" };
    const receivedQty = Number(d.recvQty || 0), pickQty = Number(d.pickQty || 0);
    if (!r.variantId || receivedQty <= 0) { alert("Saisis une quantité reçue > 0."); return; }
    setBusy((s) => ({ ...s, [i]: true }));
    try {
      const res = await fetch("/api/icelea-arrivage/receive", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: r.variantId, receivedQty, pickQty }),
      });
      const data = await readJson(res);
      if (!res.ok) { alert((data.error as string) || "Erreur réception"); return; }
      setDone((s) => ({ ...s, [i]: data.result as ReceiveResult }));
      scanRef.current?.focus(); // retour au champ scan → produit suivant directement
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy((s) => ({ ...s, [i]: false })); }
  }
  // scan code-barres → focalise la ligne correspondante
  function onScan(code: string) {
    const c = code.trim(); if (!c || !rows) return;
    const idx = rows.findIndex((r) => r.barcode === c);
    if (idx < 0) { alert(`Code-barres « ${c} » absent de la liste.`); return; }
    const el = document.querySelector<HTMLInputElement>(`[data-recv="${idx}"]`);
    el?.scrollIntoView({ block: "center" }); el?.focus();
  }

  const badge = (m: ReceptionRow["match"]) =>
    m === "manuel" ? "bg-red-100 text-red-800 border-red-300"
    : m === "approx" ? "bg-amber-100 text-amber-800 border-amber-300"
    : m === "corrige" ? "bg-violet-100 text-violet-800 border-violet-300"
    : m === "aucun" ? "bg-neutral-100 text-neutral-600 border-neutral-300"
    : m === "nom" ? "bg-sky-100 text-sky-800 border-sky-300"
    : "bg-emerald-100 text-emerald-800 border-emerald-300";

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <style>{`@media print { @page { margin: 8mm; } table { font-size: 10px; } tr { break-inside: avoid; } svg { max-height: 34px; } }`}</style>
      <div className="mx-auto max-w-6xl p-6 space-y-5">
        <div className="print:hidden space-y-4">
          <h1 className="text-2xl font-semibold">Arrivage marchandise Icelea</h1>
          <p className="text-sm text-neutral-600">
            Facture PDF → plan de réception (SKU + nom Katana + PO ouverts FIFO) imprimable avec code-barres.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-white" />
            <button onClick={prepare} disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "Préparation…" : "Préparer la liste de réception"}
            </button>
            {rows && (
              <button onClick={() => window.print()}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100">↧ Imprimer (avec code-barres)</button>
            )}
            {rows && (
              <input ref={scanRef} autoFocus placeholder="🔎 Scanner un code-barres…"
                onKeyDown={(e) => { if (e.key === "Enter") { onScan(e.currentTarget.value); e.currentTarget.value = ""; } }}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm w-56" />
            )}
          </div>
          {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {summary && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-sm">
              <Stat k="Lignes facture" v={summary.invoiceLines} />
              <Stat k="Pièces facturées" v={summary.invoicePieces} />
              <Stat k="Lignes de réception" v={summary.receptionRows} />
              <Stat k="Matchées (sûres)" v={summary.matchedRows} />
              <Stat k="À vérifier" v={summary.approxRows} />
              <Stat k="À confirmer (manuel)" v={summary.manualRows} />
            </div>
          )}
        </div>

        {rows && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="p-2">Code-barres</th>
                  <th className="p-2">Produit &amp; PO ouverts (FIFO — ligne dans le PO)</th>
                  <th className="p-2 w-14">Taille</th>
                  <th className="p-2 w-12">Qté</th>
                  <th className="p-2 w-16">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-200 align-top">
                    <td className="p-2">
                      {r.barcode && (
                        <div className="space-y-0.5">
                          <div dangerouslySetInnerHTML={{ __html: code128Svg(r.barcode) }} />
                          <div className="font-mono text-[10px] text-neutral-500">{r.barcode}</div>
                        </div>
                      )}
                      <div className="print:hidden mt-1 space-y-1">
                        {r.match === "approx" && <span className={`rounded border px-1.5 py-0.5 text-[10px] ${badge("approx")}`}>à vérifier</span>}
                        {r.match === "corrige" && <span className={`rounded border px-1.5 py-0.5 text-[10px] ${badge("corrige")}`}>corrigé (mémorisé)</span>}
                        {r.match === "aucun" && <span className={`rounded border px-1.5 py-0.5 text-[10px] ${badge("aucun")}`}>sans association</span>}
                        {r.match === "manuel" && <span className={`rounded border px-2 py-0.5 text-xs ${badge("manuel")}`}>SKU à confirmer</span>}
                        {(editRows[i] || r.match === "manuel") ? (
                          <div className="space-y-1">
                            <ManualPick catalog={catalog} onPick={(c) => { updateRow(i, c); learnPick(r.label, c.sku); setEditRows((e) => ({ ...e, [i]: false })); }} />
                            <button onClick={() => markNoAssoc(i, r.label)} className="block text-[11px] text-neutral-500 underline">∅ sans association Katana</button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {r.match === "approx" && (
                              <button onClick={() => confirmRow(i, r.label, r.sku)}
                                className="text-[11px] font-medium text-emerald-700 underline">✓ OK, c&apos;est correct</button>
                            )}
                            <button onClick={() => setEditRows((e) => ({ ...e, [i]: true }))}
                              className="text-[11px] text-sky-700 underline">{r.match === "aucun" ? "✎ associer un SKU" : "✎ changer le SKU"}</button>
                            {r.match !== "aucun" && (
                              <button onClick={() => markNoAssoc(i, r.label)}
                                className="text-[11px] text-neutral-500 underline">∅ retirer l&apos;association</button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="font-mono text-xs">{r.sku ?? r.label}</div>
                      {r.sku && <div className="text-[11px] text-neutral-500">{r.label}</div>}
                      {r.pos.length
                        ? <div className="mt-0.5 text-[11px] text-neutral-500">
                            PO : {r.pos.map((p, j) => (
                              <span key={j}>{j > 0 ? " · " : ""}{p.po} <span className="text-neutral-400">(l.{p.line ?? "?"} ×{p.qty})</span></span>
                            ))}
                          </div>
                        : <div className="mt-0.5 text-[11px] text-amber-700">aucun PO ouvert</div>}
                    </td>
                    <td className="p-2 font-medium">{r.size ?? "—"}</td>
                    <td className="p-2 font-semibold">{r.invoiceQty}</td>
                    <td className="p-2">
                      <div className="hidden h-6 w-14 border-b border-neutral-400 print:block" />
                      <div className="print:hidden">
                        {!r.variantId ? (
                          <span className="text-[11px] text-neutral-400">—</span>
                        ) : done[i] ? (
                          <div className="text-[11px] text-emerald-700">
                            <div className="font-medium">✓ reçu {done[i].totalReceivedPO + done[i].surplus + done[i].forcedNoPO}</div>
                            {done[i].receivedOnPO.map((p, k) => <div key={k} className="text-neutral-500">{p.po} l.{p.line} ×{p.qty}</div>)}
                            {done[i].surplus > 0 && <div className="text-amber-700">surplus stock +{done[i].surplus}</div>}
                            {done[i].forcedNoPO > 0 && <div className="text-amber-700">sans PO +{done[i].forcedNoPO}</div>}
                            {done[i].picked > 0 && <div className="text-sky-700">picking −{done[i].picked}</div>}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <label className="w-8 text-[10px] text-neutral-500">reçu</label>
                              <input type="number" min="0" data-recv={i} value={recv[i]?.recvQty ?? ""}
                                onChange={(e) => setRecv((s) => ({ ...s, [i]: { recvQty: e.target.value, pickQty: s[i]?.pickQty ?? "" } }))}
                                onKeyDown={(e) => { if (e.key === "Enter") validateReceive(i, r); }}
                                className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-xs" />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="w-8 text-[10px] text-neutral-500">sorti</label>
                              <input type="number" min="0" placeholder="0" value={recv[i]?.pickQty ?? ""}
                                onChange={(e) => setRecv((s) => ({ ...s, [i]: { recvQty: s[i]?.recvQty ?? "", pickQty: e.target.value } }))}
                                onKeyDown={(e) => { if (e.key === "Enter") validateReceive(i, r); }}
                                className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-xs" />
                            </div>
                            <button onClick={() => validateReceive(i, r)} disabled={busy[i]}
                              className="rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{busy[i] ? "…" : "Valider"}</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualPick({ catalog, onPick }: { catalog: CatalogEntry[]; onPick: (c: CatalogEntry) => void }) {
  const [q, setQ] = useState("");
  const toks = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); // découpe sur +, -, /, espace…
  const results = toks.length === 0 ? [] : catalog.filter((c) => {
    const s = c.sku.toLowerCase();
    return toks.every((t) => s.includes(t));
  }).slice(0, 10);
  return (
    <div className="mt-1">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="chercher dans Katana (nom/SKU)…"
        className="w-52 rounded border border-neutral-300 px-2 py-1 text-[11px]" />
      {results.length > 0 && (
        <div className="mt-1 max-h-44 w-72 overflow-auto rounded border border-neutral-200 bg-white text-[11px] shadow-lg">
          {results.map((c) => (
            <button key={c.sku} onClick={() => { onPick(c); setQ(""); }}
              className="block w-full border-b border-neutral-100 px-2 py-1 text-left hover:bg-neutral-100">
              <div className="font-mono">{c.sku}</div>
              <div className="text-neutral-400">{c.pos.map((p) => `${p.po} l.${p.line}`).join(" · ")}</div>
            </button>
          ))}
        </div>
      )}
      {toks.length > 0 && results.length === 0 && <div className="mt-1 text-[11px] text-neutral-400">aucun résultat dans les PO ouverts</div>}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-lg border border-neutral-300 p-2">
      <div className="text-neutral-500">{k}</div>
      <div className="text-lg font-semibold">{v}</div>
    </div>
  );
}
