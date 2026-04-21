"use client";

import { useState } from "react";

type StockInfo = {
  inStock: number;
  committed: number;
  available: number;
  toReceive: number;
};

type Ingredient = {
  name: string;
  sku: string | null;
  quantityNeeded: number;
  supplier: string | null;
  stock: StockInfo;
  canMake: number;
};

type ProductResult = {
  product: string;
  productId: number;
  ingredients: Ingredient[];
  minCanMake: number;
};

function StockBadge({ value, label }: { value: number; label: string }) {
  const color =
    value === 0
      ? "bg-red-100 text-red-700"
      : value < 5
      ? "bg-orange-100 text-orange-700"
      : "bg-green-100 text-green-700";
  return (
    <span className={`inline-flex flex-col items-center rounded-lg px-3 py-1.5 text-center ${color}`}>
      <span className="text-lg font-semibold leading-none">{value}</span>
      <span className="text-xs mt-0.5 opacity-75">{label}</span>
    </span>
  );
}

function CanMakeBadge({ value }: { value: number }) {
  const color =
    value === 0
      ? "bg-red-50 border-red-200 text-red-700"
      : value < 3
      ? "bg-orange-50 border-orange-200 text-orange-700"
      : "bg-green-50 border-green-200 text-green-700";
  const icon = value === 0 ? "✗" : "✓";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${color}`}>
      <span>{icon}</span>
      {value === 0 ? "Stock insuffisant" : `${value} unité${value > 1 ? "s" : ""} faisable${value > 1 ? "s" : ""}`}
    </span>
  );
}

export default function StockPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProductResult[] | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`/api/stock-check?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json() as { ok: boolean; results?: ProductResult[]; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur inconnue");
      setResults(json.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Stock matières premières
          </h1>
          <p className="text-sm text-zinc-500">
            Recherche un produit Shopify pour voir le stock disponible dans Katana
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom du produit (ex: Aura, Eclipse, Entrelacs…)"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "Chargement…" : "Rechercher"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 mb-6">
            {error}
          </div>
        )}

        {results !== null && results.length === 0 && (
          <div className="text-sm text-zinc-500 text-center py-8">
            Aucun produit trouvé pour &ldquo;{query}&rdquo;
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-6">
            {results.map((r) => (
              <div
                key={r.productId}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
              >
                {/* Product header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{r.product}</h2>
                  <CanMakeBadge value={r.minCanMake} />
                </div>

                {/* Ingredients */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {r.ingredients.map((ing, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {ing.name || ing.sku || "—"}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 space-x-2">
                            {ing.sku && <span>SKU: {ing.sku}</span>}
                            {ing.supplier && <span>· {ing.supplier}</span>}
                            <span>· Qté nécessaire: {ing.quantityNeeded}</span>
                          </div>
                        </div>
                        <CanMakeBadge value={ing.canMake} />
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <StockBadge value={ing.stock.inStock} label="En stock" />
                        <StockBadge value={ing.stock.committed} label="Engagé" />
                        <StockBadge value={ing.stock.available} label="Disponible" />
                        {ing.stock.toReceive > 0 && (
                          <StockBadge value={ing.stock.toReceive} label="À recevoir" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
