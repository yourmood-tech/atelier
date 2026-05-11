"use client";

import { useState, useEffect } from "react";

type FormatConfig = { productId: number; handle: string; variants: Record<string, number> };
type FullConfig = Record<string, FormatConfig>;
type KatanaFormatConfig = { katanaProductId: number; variantsTotal: number; recipesCreated: number; recipesSkipped: number };
type KatanaConfig = Record<string, KatanaFormatConfig>;

const FORMATS = [
  { id: "addon",     nom: "Addon"      },
  { id: "2-3",       nom: "Deux tiers" },
  { id: "medium",    nom: "Medium"     },
  { id: "open-mood", nom: "Open mood"  },
];

export default function SetupPersoPage() {
  const [config, setConfig] = useState<FullConfig | null>(null);
  const [katanaConfig, setKatanaConfig] = useState<KatanaConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [katanaLoading, setKatanaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [katanaError, setKatanaError] = useState<string | null>(null);
  const [katanaErrors, setKatanaErrors] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/creer-produits-perso")
      .then((r) => r.json())
      .then((d) => setConfig(d.config || null))
      .catch(() => {});
    fetch("/api/sync-katana-perso")
      .then((r) => r.json())
      .then((d) => setKatanaConfig(d.config || null))
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

  const syncKatana = async () => {
    if (!confirm("Créer 4 produits dans Katana + 144 variants chacun + jusqu'à 576 recettes ? Opération longue (~1-2 min).")) return;
    setKatanaLoading(true);
    setKatanaError(null);
    setKatanaErrors([]);
    try {
      const r = await fetch("/api/sync-katana-perso", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
      setKatanaConfig(d.katanaResultats);
      if (d.errors?.length) setKatanaErrors(d.errors);
    } catch (e: unknown) {
      setKatanaError((e as Error).message);
    } finally {
      setKatanaLoading(false);
    }
  };

  const resetKatana = async () => {
    if (!confirm("Effacer la config Katana dans Redis ?")) return;
    await fetch("/api/sync-katana-perso", { method: "DELETE" });
    setKatanaConfig(null);
    setKatanaErrors([]);
  };

  const totalVariants = config
    ? Object.values(config).reduce((s, f) => s + (f?.variants ? Object.keys(f.variants).length : 0), 0)
    : 0;

  const totalRecipes = katanaConfig
    ? Object.values(katanaConfig).reduce((s, f) => s + (f?.recipesCreated ?? 0) + (f?.recipesSkipped ?? 0), 0)
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Setup Bagues personnalisées</h1>
          <p className="text-zinc-400 text-sm">
            4 produits Shopify × 144 variants (12 tailles × 12 couleurs) → mirroir dans Katana + 576 recettes.
          </p>
        </div>

        {/* ── Étape 1 : Shopify ── */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Étape 1 — Produits Shopify</h2>

          {!config ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Aucun produit perso créé</h3>
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
                {loading ? "Création en cours (~2 min)..." : "Créer les 4 produits Shopify"}
              </button>
              {error && <p className="text-red-400 text-sm mt-3">Erreur : {error}</p>}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-green-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1 text-green-400">✓ Produits Shopify créés</h3>
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
                  return (
                    <div key={fmt.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <p className="text-sm font-semibold">{fmt.nom}</p>
                      <p className="text-xs text-zinc-500">Product ID : {fc.productId}</p>
                      <p className="text-xs text-zinc-400">{Object.keys(fc.variants).length} variants</p>
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
                <p className="text-xs text-zinc-500">⚠️ Si tu as supprimé les produits sur Shopify et veux les re-créer :</p>
                <div className="flex gap-3">
                  <button
                    onClick={reinitialiser}
                    disabled={loading}
                    className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    {loading ? "..." : "Réinitialiser le mapping"}
                  </button>
                  <button
                    onClick={lancerCreation}
                    disabled={loading}
                    className="bg-zinc-600 hover:bg-zinc-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    {loading ? "..." : "Recréer tous les produits"}
                  </button>
                </div>
                {error && <p className="text-red-400 text-sm">Erreur : {error}</p>}
              </div>
            </div>
          )}
        </section>

        {/* ── Étape 2 : Katana ── */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Étape 2 — Produits & Recettes Katana</h2>

          {!config ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 opacity-50">
              <p className="text-sm text-zinc-400">Créer d'abord les produits Shopify (étape 1).</p>
            </div>
          ) : !katanaConfig ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Katana non synchronisé</h3>
              <ul className="text-sm text-zinc-300 mb-4 ml-4 list-disc space-y-1">
                <li>4 produits Katana (un par format) avec 144 variants chacun</li>
                <li>SKU Katana = SKU Shopify : <code className="text-amber-400">PERSO-ADDON-56-ROUGE</code></li>
                <li>576 recettes : chaque variant → matière vierge alu correspondante</li>
                <li>Idempotent — relançable sans créer de doublons</li>
              </ul>
              <button
                onClick={syncKatana}
                disabled={katanaLoading}
                className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold"
              >
                {katanaLoading ? "Synchronisation en cours (~1-2 min)..." : "Synchroniser vers Katana"}
              </button>
              {katanaError && <p className="text-red-400 text-sm mt-3">Erreur : {katanaError}</p>}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-blue-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1 text-blue-400">✓ Katana synchronisé</h3>
              <p className="text-zinc-400 text-sm mb-4">{totalRecipes} recettes au total</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {FORMATS.map((fmt) => {
                  const kc = katanaConfig[fmt.id];
                  if (!kc) return (
                    <div key={fmt.id} className="bg-zinc-950 border border-red-800 rounded-lg p-3">
                      <p className="text-sm font-semibold text-red-400">{fmt.nom}</p>
                      <p className="text-xs text-zinc-500">Non synchronisé</p>
                    </div>
                  );
                  return (
                    <div key={fmt.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                      <p className="text-sm font-semibold">{fmt.nom}</p>
                      <p className="text-xs text-zinc-500">Katana ID : {kc.katanaProductId}</p>
                      <p className="text-xs text-zinc-400">{kc.variantsTotal} variants · {kc.recipesCreated + kc.recipesSkipped} recettes</p>
                      {kc.variantsPatched > 0 && (
                        <p className="text-xs text-amber-500">{kc.variantsPatched} options patchées</p>
                      )}
                      {kc.recipesSkipped > 0 && (
                        <p className="text-xs text-zinc-500">{kc.recipesSkipped} recettes déjà existantes</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {katanaErrors.length > 0 && (
                <div className="bg-red-950 border border-red-800 rounded-lg p-3 mb-4">
                  <p className="text-xs font-semibold text-red-400 mb-1">{katanaErrors.length} erreur(s) lors de la sync :</p>
                  <ul className="text-xs text-red-300 space-y-0.5 max-h-32 overflow-y-auto">
                    {katanaErrors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={syncKatana}
                  disabled={katanaLoading}
                  className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {katanaLoading ? "..." : "Resynchroniser Katana"}
                </button>
                <button
                  onClick={resetKatana}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
