"use client";

import { useState, useEffect } from "react";

type ResultatVariants = Record<string, { productId: number; handle: string; variants: Record<string, number> }>;

const COULEURS = [
  "noir", "rouge", "bleu-marine", "lilas-cashmere", "belipastel", "rose-pastel",
  "noisette", "peche", "abricot", "jaune-pastel", "vert-pastel", "bleu-pastel",
];

const FORMATS = [
  { id: "medium", nom: "Medium" },
  { id: "2-3", nom: "Deux tiers" },
  { id: "addon", nom: "Addon" },
  { id: "open-mood", nom: "Open mood" },
];

export default function SetupPersoPage() {
  const [resultats, setResultats] = useState<ResultatVariants | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/creer-produits-perso")
      .then((r) => r.json())
      .then((d) => setResultats(d.resultats || null))
      .catch(() => {});
  }, []);

  const reinitialiser = async () => {
    if (!confirm("Effacer le mapping actuel et permettre de re-créer les produits ? (à faire uniquement après avoir supprimé les anciens produits sur Shopify)")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/creer-produits-perso", { method: "DELETE" });
      if (!r.ok) throw new Error(`Erreur ${r.status}`);
      setResultats(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const lancerCreation = async () => {
    if (!confirm("Créer 4 produits Shopify avec 12 variants chacun ? (action irréversible, les produits seront publiés actifs)")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/creer-produits-perso", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
      setResultats(d.resultats);
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
          Crée les 4 produits Shopify (1 par format) avec 12 variants couleur chacun. Stock géré côté Katana.
        </p>

        {!resultats && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Aucun produit perso encore créé</h2>
            <p className="text-zinc-400 text-sm mb-4">
              En cliquant ci-dessous, je crée 4 produits Shopify :
            </p>
            <ul className="text-sm text-zinc-300 mb-4 ml-4 list-disc">
              <li>Bague personnalisée — Medium (65 CHF)</li>
              <li>Bague personnalisée — Deux tiers (75 CHF)</li>
              <li>Bague personnalisée — Addon (85 CHF)</li>
              <li>Bague personnalisée — Open mood (109 CHF)</li>
            </ul>
            <p className="text-sm text-zinc-400 mb-4">
              Chaque produit a 12 variants couleur (noir, rouge, bleu marine, lilas, etc.). Total : <strong>48 variants</strong>.
              SKU : <code className="text-amber-400">perso-{"{format}"}-{"{couleur}"}</code>.
            </p>
            <button
              onClick={lancerCreation}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {loading ? "Création en cours..." : "🚀 Créer les 4 produits Shopify"}
            </button>
            {error && <p className="text-red-400 text-sm mt-3">Erreur : {error}</p>}
          </div>
        )}

        {resultats && (
          <div className="bg-zinc-900 border border-green-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3 text-green-400">✓ Produits créés</h2>
            <div className="grid gap-4">
              {FORMATS.map((fmt) => {
                const r = resultats[fmt.id];
                if (!r) return null;
                return (
                  <div key={fmt.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{fmt.nom}</h3>
                        <p className="text-xs text-zinc-500">Product ID : {r.productId} · Handle : {r.handle}</p>
                      </div>
                      <a
                        href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE || "yourmood.myshopify.com"}/admin/products/${r.productId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-400 hover:underline"
                      >
                        Voir sur Shopify →
                      </a>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300">Voir les 12 variant IDs</summary>
                      <div className="mt-2 grid grid-cols-2 gap-1 font-mono">
                        {COULEURS.map((c) => (
                          <div key={c} className="text-zinc-300">
                            <span className="text-zinc-500">{c}</span> : {r.variants[c]}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-zinc-400 mt-6">
              Les variant IDs sont stockés dans Redis. La page <code className="text-amber-400">/creer</code> les utilisera automatiquement pour le bouton "Acheter".
            </p>
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2">⚠️ Si tu as supprimé les produits sur Shopify et veux tout re-créer :</p>
              <button
                onClick={reinitialiser}
                disabled={loading}
                className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
              >
                {loading ? "..." : "♻️ Réinitialiser le mapping (puis re-cliquer 'Créer')"}
              </button>
              {error && <p className="text-red-400 text-sm mt-3">Erreur : {error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
