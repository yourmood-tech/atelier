"use client";

import { useState } from "react";
import Link from "next/link";

const PROCESSES = [
  { key: "coloration",  label: "Coloration" },
  { key: "gravure",     label: "Gravure" },
  { key: "bijouterie",  label: "Bijouterie" },
  { key: "sertissage",  label: "Sertissage" },
  { key: "pvd",         label: "PVD" },
  { key: "laser",       label: "Découpe laser" },
  { key: "casting",     label: "Casting" },
  { key: "picking",     label: "Picking" },
];

type PrintResult = {
  order: string;
  copies?: number;
  processes?: string;
  error?: string;
};

export default function ReprintPage() {
  const [orders, setOrders] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PrintResult[]>([]);

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orders.trim() || selected.size === 0) return;
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/reprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders, processes: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResults([{ order: "Erreur", error: data.error ?? "Erreur serveur" }]);
      } else {
        setResults(data.results);
      }
    } catch {
      setResults([{ order: "Erreur", error: "Impossible de contacter le serveur" }]);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = orders.trim().length > 0 && selected.size > 0 && !loading;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-start pt-16 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">
            ← Retour
          </Link>
        </div>

        <h1 className="text-2xl font-semibold mb-1">Réimpression</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Sélectionne le(s) processus à réimprimer et entre les numéros de commande.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Process selector */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Processus</p>
            <div className="grid grid-cols-2 gap-2">
              {PROCESSES.map(p => {
                const active = selected.has(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => toggle(p.key)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium text-left transition-colors ${
                      active
                        ? "border-white bg-white text-black"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order numbers */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Commandes</p>
            <textarea
              value={orders}
              onChange={e => setOrders(e.target.value)}
              placeholder={"12345\n12346\n12347"}
              rows={4}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder-zinc-600 p-4 text-sm font-mono resize-none focus:outline-none focus:border-zinc-400 transition-colors"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-white text-black font-semibold py-3 text-sm hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Impression en cours…" : `Imprimer${selected.size > 0 ? ` — ${[...selected].map(k => PROCESSES.find(p => p.key === k)?.label).join(", ")}` : ""}`}
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-8 flex flex-col gap-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 text-sm flex items-start gap-3 ${
                  r.error
                    ? "bg-red-950 border border-red-800 text-red-300"
                    : "bg-zinc-900 border border-zinc-700 text-zinc-200"
                }`}
              >
                <span className="mt-0.5">{r.error ? "✗" : "✓"}</span>
                <div>
                  <span className="font-semibold">{r.order}</span>
                  {r.error ? (
                    <p className="text-red-400 mt-0.5">{r.error}</p>
                  ) : (
                    <p className="text-zinc-400 mt-0.5">{r.copies} copie(s) — {r.processes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
