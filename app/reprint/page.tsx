"use client";

import { useState } from "react";
import Link from "next/link";

type PrintResult = {
  order: string;
  copies?: number;
  processes?: string;
  error?: string;
};

export default function ReprintPage() {
  const [orders, setOrders] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PrintResult[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orders.trim()) return;
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/reprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
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

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-start pt-16 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">
            ← Retour
          </Link>
        </div>

        <h1 className="text-2xl font-semibold mb-1">Réimpression</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Entre un ou plusieurs numéros de commande, un par ligne ou séparés par des virgules.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={orders}
            onChange={e => setOrders(e.target.value)}
            placeholder={"12345\n12346\n12347"}
            rows={5}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder-zinc-600 p-4 text-sm font-mono resize-none focus:outline-none focus:border-zinc-400 transition-colors"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !orders.trim()}
            className="w-full rounded-xl bg-white text-black font-semibold py-3 text-sm hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Impression en cours…" : "Imprimer"}
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
