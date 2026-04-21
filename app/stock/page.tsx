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

type VariantResult = {
  variantId: number;
  variantTitle: string;
  sku: string;
  ingredients: Ingredient[];
  minCanMake: number;
};

type ApiResponse = {
  ok: boolean;
  product?: string;
  productId?: number;
  variants?: VariantResult[];
  error?: string;
};

function StockBadge({ value, label }: { value: number; label: string }) {
  const color =
    value === 0
      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : value < 5
      ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
      : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
  return (
    <span className={`inline-flex flex-col items-center rounded-lg px-3 py-1.5 text-center min-w-[56px] ${color}`}>
      <span className="text-lg font-semibold leading-none">{value}</span>
      <span className="text-xs mt-0.5 opacity-75">{label}</span>
    </span>
  );
}

function CanMakeBadge({ value }: { value: number }) {
  const color =
    value === 0
      ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
      : value < 3
      ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300"
      : "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
      {value === 0 ? "✗ Stock insuffisant" : `✓ ${value} fabricable${value > 1 ? "s" : ""}`}
    </span>
  );
}

export default function StockPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [openVariants, setOpenVariants] = useState<Set<number>>(new Set());

  function toggleVariant(id: number) {
    setOpenVariants((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setOpenVariants(new Set());

    try {
      const res = await fetch(`/api/stock-check?url=${encodeURIComponent(url.trim())}`);
      const json = await res.json() as ApiResponse;
      if (!json.ok) throw new Error(json.error ?? "Erreur inconnue");
      setData(json);
      // Auto-open first variant with ingredients
      const first = json.variants?.find((v) => v.ingredients.length > 0);
      if (first) setOpenVariants(new Set([first.variantId]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  const variants = data?.variants?.filter((v) => v.ingredients.length > 0) ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Stock matières premières
          </h1>
          <p className="text-sm text-zinc-500">
            Colle l&apos;URL d&apos;un produit yourmood.net pour voir le stock disponible dans Katana
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourmood.net/products/bague-aura-titane"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "Chargement…" : "Voir le stock"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 mb-6">
            {error}
          </div>
        )}

        {data && variants.length === 0 && (
          <div className="text-sm text-zinc-500 text-center py-8">
            Aucune recette Katana trouvée pour ce produit
          </div>
        )}

        {data && variants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{data.product}</h2>
              <span className="text-xs text-zinc-400">{variants.length} variante{variants.length > 1 ? "s" : ""}</span>
            </div>

            {variants.map((v) => {
              const isOpen = openVariants.has(v.variantId);
              return (
                <div
                  key={v.variantId}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                >
                  {/* Variant header — clickable */}
                  <button
                    onClick={() => toggleVariant(v.variantId)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                        Taille {v.variantTitle}
                      </span>
                      <span className="text-xs text-zinc-400">{v.sku}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CanMakeBadge value={v.minCanMake} />
                      <span className="text-zinc-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Ingredients — collapsible */}
                  {isOpen && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                      {v.ingredients.map((ing, i) => (
                        <div key={i} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {ing.name || ing.sku || "—"}
                              </div>
                              <div className="text-xs text-zinc-400 mt-0.5 space-x-2">
                                {ing.sku && <span>SKU: {ing.sku}</span>}
                                {ing.supplier && <span>· {ing.supplier}</span>}
                                <span>· Qté/unité: {ing.quantityNeeded}</span>
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
