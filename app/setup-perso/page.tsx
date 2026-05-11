"use client";

import { useState, useEffect } from "react";

type FormatConfig = { productId: number; handle: string; variants: Record<string, number> };
type FullConfig = Record<string, FormatConfig>;

const FORMATS = [
  { id: "addon",     nom: "Addon"      },
  { id: "2-3",       nom: "Deux tiers" },
  { id: "medium",    nom: "Medium"     },
  { id: "open-mood", nom: "Open mood"  },
];

export default function SetupPersoPage() {
  const [config, setConfig] = useState<FullConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/creer-produits-perso")
      .then((r) => r.json())
      .then((d) => setConfig(d.config || null))
      .catch(() => {});
  }, []);

  const lancerCreation = async () => {
    if (!confirm("Créer 4 produits Shopify (un par format) avec 144 variants chacun (12 tailles × 12 couleurs) ? SKU = PERSO-{FORMAT}-{TAILLE}-{COULEUR}. Opération longue (~2 min).")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/creer-produits-perso", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
      setConfig(d.resultats);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reinitialiser = async () => {
    if (!confirm("Effacer le mapping Redis ? (à faire après avoir supprimé les produits sur Shopify)")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/creer-produits-perso", { method: "DELETE" });
      if (!r.ok) throw new Error(`Erreur ${r.status}`);
      setConfig(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const totalVariants = config ? Object.values(config).reduce((s, f) => s + (f?.variants ? Object.keys(f.variants).length : 0), 0) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Setup Bagues personnalisées</h1>
        <p className="text-zinc-400 mb-6 text-sm">
          4 produits Shopify (un par format), chacun avec 144 variants (12 tailles × 12 couleurs).<br />
          SKU format : <code className="text-amber-400">PERSO-ADDON-56-ROUGE</code> — synchronisé automatiquement vers Katana pour créer les recettes.
        </p>

        {!config && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Aucun produit perso créé</h2>
            <ul className="text-sm text-zinc-300 mb-4 ml-4 list-disc space-y-1">
              <li>4 produits : Addon · Deux tiers · Medium · Open mood</li>
              <li>144 variants par produit (12 tailles × 12 couleurs)</li>
              <li>SKU unique par combinaison : <code className="text-amber-400">PERSO-{"{FORMAT}"}-{"{TAILLE}"}-{"{COULEUR}"}</code></li>
              <li>Publication automatique sur Online Store</li>
            </ul>
            <button
              onClick={lancerCreation}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {loading ? "Création en cours (~2 min)..." : "🚀 Créer les 4 produits Shopify"}
            </button>
            {error && <p className="text-red-400 text-sm mt-3">Erreur : {error}</p>}
          </div>
        )}

        {config && (
          <div className="bg-zinc-900 border border-green-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-1 text-green-400">✓ Produits créés</h2>
            <p className="text-zinc-400 text-sm mb-4">{totalVariants} variants au total</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {FORMATS.map((fmt) => {
                const fc = config[fmt.id];
                if (!fc) return (
                  <div key={fmt.id} className="bg-zinc-950 border border-red-800 rounded-lg p-3">
                    <p className="text-sm font-semibold text-red-400">{fmt.nom}</p>
                    <p className="text-xs text-zinc-500">Non créé</p>
                  </div>
                );
                const nbVariants = Object.keys(fc.variants).length;
                return (
                  <div key={fmt.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <p className="text-sm font-semibold">{fmt.nom}</p>
                    <p className="text-xs text-zinc-500">Product ID : {fc.productId}</p>
                    <p className="text-xs text-zinc-400">{nbVariants} variants</p>
                    <a
                      href={`https://www.yourmood.net/products/${fc.handle}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-amber-400 hover:underline"
                    >Voir sur la boutique →</a>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div>
                <p className="text-xs text-zinc-500 mb-2">⚠️ Si tu as supprimé les produits sur Shopify et veux les re-créer :</p>
                <div className="flex gap-3">
                  <button
                    onClick={reinitialiser}
                    disabled={loading}
                    className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    {loading ? "..." : "♻️ Réinitialiser le mapping"}
                  </button>
                  <button
                    onClick={lancerCreation}
                    disabled={loading}
                    className="bg-zinc-600 hover:bg-zinc-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    {loading ? "..." : "🔄 Recréer tous les produits"}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-400 text-sm mt-3">Erreur : {error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
