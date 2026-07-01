"use client";

import { useRef, useState } from "react";
import { code128Svg } from "@/lib/icelea/barcode";

type ReceptionRow = {
  code: string | null; label: string; size: string | null; invoiceQty: number;
  sku: string | null; variantId: number | null; barcode: string | null;
  pos: { po: string; rowId: number; qty: number; created: string }[];
  openQty: number; match: "code" | "nom" | "manuel";
};
type Summary = {
  invoiceLines: number; invoicePieces: number; receptionRows: number;
  matchedRows: number; manualRows: number; openVariants: number;
};

export default function IceleaArrivagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ReceptionRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexMsg, setIndexMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function buildIndex(): Promise<boolean> {
    setIndexMsg("Construction de l'index Icelea… (une seule fois, puis instantané)");
    let restart = true;
    for (let i = 0; i < 40; i++) {
      const res = await fetch("/api/icelea-arrivage/refresh-index", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restart }),
      });
      restart = false;
      const p = await res.json();
      if (!res.ok) { setError(p.error || "Erreur construction index"); return false; }
      if (p.phase === "done") { setIndexMsg(`Index prêt (${p.total} variants).`); return true; }
      setIndexMsg(`Construction de l'index… ${p.done}/${p.total} variants`);
    }
    setError("Construction de l'index trop longue — relance."); return false;
  }

  async function prepare() {
    if (!file) { setError("Choisis d'abord la facture PDF."); return; }
    setLoading(true); setError(null); setRows(null); setSummary(null);
    try {
      const send = async () => {
        const fd = new FormData(); fd.append("pdf", file);
        return fetch("/api/icelea-arrivage/prepare", { method: "POST", body: fd });
      };
      let res = await send();
      if (res.status === 409) { const ok = await buildIndex(); if (!ok) { setLoading(false); return; } res = await send(); }
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur"); setLoading(false); return; }
      setRows(data.rows); setSummary(data.summary); setIndexMsg(null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  const badge = (m: ReceptionRow["match"]) =>
    m === "manuel" ? "bg-amber-900/40 text-amber-200 border-amber-700"
    : m === "nom" ? "bg-sky-900/40 text-sky-200 border-sky-700"
    : "bg-emerald-900/40 text-emerald-200 border-emerald-700";

  return (
    <div className="mx-auto max-w-6xl p-6 text-neutral-100 space-y-5">
      <div className="print:hidden space-y-4">
        <h1 className="text-2xl font-semibold">Arrivage marchandise Icelea</h1>
        <p className="text-sm text-neutral-400">
          Facture PDF → plan de réception (SKU + nom Katana + PO ouverts FIFO) imprimable avec code-barres.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-700 file:px-3 file:py-2 file:text-neutral-100" />
          <button onClick={prepare} disabled={loading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium disabled:opacity-50">
            {loading ? "Préparation…" : "Préparer la liste de réception"}
          </button>
          {rows && (
            <button onClick={() => window.print()}
              className="rounded-xl border border-neutral-600 px-4 py-2 text-sm">↧ Imprimer (avec code-barres)</button>
          )}
        </div>
        {indexMsg && <div className="rounded-xl border border-sky-800 bg-sky-900/20 p-3 text-sm text-sky-200">{indexMsg}</div>}
        {error && <div className="rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}
        {summary && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-sm">
            <Stat k="Lignes facture" v={summary.invoiceLines} />
            <Stat k="Pièces facturées" v={summary.invoicePieces} />
            <Stat k="Lignes de réception" v={summary.receptionRows} />
            <Stat k="Matchées auto" v={summary.matchedRows} />
            <Stat k="À confirmer (manuel)" v={summary.manualRows} />
            <Stat k="Variants PO ouverts" v={summary.openVariants} />
          </div>
        )}
      </div>

      {rows && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-neutral-400 print:text-black">
                <th className="p-2">Code-barres</th><th className="p-2">SKU Katana / Produit</th>
                <th className="p-2">Taille</th><th className="p-2">Qté facture</th>
                <th className="p-2">PO ouverts (FIFO)</th><th className="p-2">Reçu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-neutral-800 align-top print:border-neutral-300">
                  <td className="p-2">
                    {r.barcode
                      ? <div className="space-y-0.5">
                          <div dangerouslySetInnerHTML={{ __html: code128Svg(r.barcode) }} />
                          <div className="font-mono text-[10px] text-neutral-400 print:text-black">{r.barcode}</div>
                        </div>
                      : <span className={`rounded border px-2 py-0.5 text-xs ${badge(r.match)}`}>SKU à confirmer</span>}
                  </td>
                  <td className="p-2">
                    <div className="font-mono text-xs">{r.sku ?? r.label}</div>
                    {r.sku && <div className="text-[11px] text-neutral-400 print:text-black">{r.label}</div>}
                    <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] ${badge(r.match)}`}>{r.match}</span>
                  </td>
                  <td className="p-2 font-medium">{r.size ?? "—"}</td>
                  <td className="p-2 font-semibold">{r.invoiceQty}</td>
                  <td className="p-2 text-xs">
                    {r.pos.length
                      ? r.pos.map((p, j) => <div key={j}>{p.po} <span className="text-neutral-500">×{p.qty}</span></div>)
                      : <span className="text-neutral-500">aucun PO ouvert</span>}
                    {r.openQty > 0 && <div className="text-neutral-500">reste PO: {r.openQty}</div>}
                  </td>
                  <td className="p-2"><div className="h-6 w-16 border-b border-neutral-500 print:border-black" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-lg border border-neutral-700 p-2">
      <div className="text-neutral-400 print:text-black">{k}</div>
      <div className="text-lg font-semibold">{v}</div>
    </div>
  );
}
