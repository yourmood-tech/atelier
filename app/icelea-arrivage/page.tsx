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

  // Lecture défensive : si le serveur renvoie du HTML (timeout Vercel…), on affiche
  // le vrai texte au lieu d'un « Unexpected token » cryptique.
  async function readJson(res: Response): Promise<Record<string, unknown>> {
    const t = await res.text();
    try { return JSON.parse(t); } catch { return { error: t.slice(0, 300) || `HTTP ${res.status}` }; }
  }

  async function buildIndex(): Promise<boolean> {
    setIndexMsg("Construction de l'index Icelea… (une seule fois, puis instantané)");
    let restart = true;
    for (let i = 0; i < 60; i++) {
      let res: Response;
      try {
        res = await fetch("/api/icelea-arrivage/refresh-index", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restart }),
        });
      } catch { setError("Réseau interrompu pendant la construction de l'index — relance."); return false; }
      restart = false;
      const p = await readJson(res);
      if (!res.ok) { setError((p.error as string) || "Erreur construction index"); return false; }
      if (p.phase === "done") { setIndexMsg(`Index prêt (${p.total} variants).`); return true; }
      setIndexMsg(`Construction de l'index… ${p.done ?? 0}/${p.total ?? "?"} variants`);
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
      const data = await readJson(res);
      if (!res.ok) { setError((data.error as string) || "Erreur"); setLoading(false); return; }
      setRows(data.rows as ReceptionRow[]); setSummary(data.summary as Summary); setIndexMsg(null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  const badge = (m: ReceptionRow["match"]) =>
    m === "manuel" ? "bg-amber-100 text-amber-800 border-amber-300"
    : m === "nom" ? "bg-sky-100 text-sky-800 border-sky-300"
    : "bg-emerald-100 text-emerald-800 border-emerald-300";

  return (
    <div className="min-h-screen bg-white text-neutral-900">
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
          </div>
          {indexMsg && <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-800">{indexMsg}</div>}
          {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
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
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="p-2">Code-barres</th><th className="p-2">SKU Katana / Produit</th>
                  <th className="p-2">Taille</th><th className="p-2">Qté facture</th>
                  <th className="p-2">PO ouverts (FIFO)</th><th className="p-2">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-200 align-top">
                    <td className="p-2">
                      {r.barcode
                        ? <div className="space-y-0.5">
                            <div dangerouslySetInnerHTML={{ __html: code128Svg(r.barcode) }} />
                            <div className="font-mono text-[10px] text-neutral-500">{r.barcode}</div>
                          </div>
                        : <span className={`rounded border px-2 py-0.5 text-xs ${badge(r.match)}`}>SKU à confirmer</span>}
                    </td>
                    <td className="p-2">
                      <div className="font-mono text-xs">{r.sku ?? r.label}</div>
                      {r.sku && <div className="text-[11px] text-neutral-500">{r.label}</div>}
                      <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] ${badge(r.match)}`}>{r.match}</span>
                    </td>
                    <td className="p-2 font-medium">{r.size ?? "—"}</td>
                    <td className="p-2 font-semibold">{r.invoiceQty}</td>
                    <td className="p-2 text-xs">
                      {r.pos.length
                        ? r.pos.map((p, j) => <div key={j}>{p.po} <span className="text-neutral-400">×{p.qty}</span></div>)
                        : <span className="text-neutral-400">aucun PO ouvert</span>}
                      {r.openQty > 0 && <div className="text-neutral-400">reste PO: {r.openQty}</div>}
                    </td>
                    <td className="p-2"><div className="h-6 w-16 border-b border-neutral-400" /></td>
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

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-lg border border-neutral-300 p-2">
      <div className="text-neutral-500">{k}</div>
      <div className="text-lg font-semibold">{v}</div>
    </div>
  );
}
