"use client";

import { useState, useEffect } from "react";

type Config = { productId: number; handle: string; variants?: Record<string, number>; variantId?: number };

export default function SetupPersoPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/creer-produits-perso")
      .then((r) => r.json())
      .then((d) => setConfig(d.config || null))
      .catch(() => {});
  }, []);

  const lancerCreation = async () => {
    if (!confirm("Créer le produit Shopify 'Bague personnalisée' (1 produit, 1 variant) ? Le prix réel sera calculé par le configurateur via Draft Order au moment de l'achat.")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/creer-produits-perso", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
      setConfig(d.config);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const ajouterTailles = async () => {
    if (!confirm("Ajouter l'option Taille (48→70) au produit existant ? Les SKU seront vides — tu les remplis manuellement dans Shopify Admin.")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/creer-produits-perso", { method: "PATCH" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
      setConfig(d.config);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reinitialiser = async () => {
    if (!confirm("Effacer le mapping actuel ? (à faire après avoir supprimé le produit sur Shopify)")) return;
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Setup Bagues personnalisées sur Shopify</h1>
        <p className="text-zinc-400 mb-6">
          1 seul produit Shopify avec 1 variant générique. Tout (format, couleur, taille, prix) est géré par le configurateur via Draft Order au moment de l'achat.
        </p>

        {!config && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Aucun produit perso encore créé</h2>
            <p className="text-zinc-400 text-sm mb-4">
              En cliquant ci-dessous, je crée 1 produit Shopify "Bague personnalisée" :
            </p>
            <ul className="text-sm text-zinc-300 mb-4 ml-4 list-disc space-y-1">
              <li>Titre : <strong>Bague personnalisée</strong></li>
              <li>Variant unique : SKU <code className="text-amber-400">BAGUE-PERSO</code>, prix de départ 65 CHF (overridé par Draft Order)</li>
              <li>Description : invite à cliquer "Configurer ma bague" → redirige vers <code className="text-amber-400">/creer</code></li>
              <li>Publication automatique sur le canal Online Store</li>
            </ul>
            <p className="text-sm text-zinc-400 mb-4">
              Workflow client : page produit → /creer → choix format/couleur/taille/design + prix calculé → 🛒 Acheter → Draft Order Shopify avec prix réel → checkout → paiement.
            </p>
            <button
              onClick={lancerCreation}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {loading ? "Création en cours..." : "🚀 Créer le produit Shopify"}
            </button>
            {error && <p className="text-red-400 text-sm mt-3">Erreur : {error}</p>}
          </div>
        )}

        {config && (
          <div className="bg-zinc-900 border border-green-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3 text-green-400">✓ Produit créé</h2>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4">
              <p className="text-sm"><strong>Product ID :</strong> {config.productId}</p>
              <p className="text-sm"><strong>Handle :</strong> {config.handle}</p>
              {config.variants ? (
                <p className="text-sm"><strong>Variants taille :</strong> {Object.keys(config.variants).join(", ")}</p>
              ) : config.variantId ? (
                <p className="text-sm"><strong>Variant ID :</strong> {config.variantId} <span className="text-amber-400">(sans taille — utilise le bouton ci-dessous)</span></p>
              ) : null}
              <p className="text-sm mt-2">
                <a
                  href={`https://www.yourmood.net/products/${config.handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  Voir sur la boutique →
                </a>
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800 space-y-3">
              <div>
                <p className="text-xs text-zinc-500 mb-2">Ajouter l'option Taille (48→70) au produit existant. Les SKU seront vides — à remplir manuellement dans Shopify Admin ensuite.</p>
                <button
                  onClick={ajouterTailles}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {loading ? "..." : "📐 Ajouter les tailles au produit"}
                </button>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2">⚠️ Si tu as supprimé le produit sur Shopify et veux le re-créer :</p>
                <button
                  onClick={reinitialiser}
                  disabled={loading}
                  className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {loading ? "..." : "♻️ Réinitialiser le mapping"}
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-3">Erreur : {error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
