"use client";

import { useState, useEffect } from "react";

type Config = { variantId: string; productId: string; handle: string };

export default function SetupPersoArgentPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/creer-argent-setup")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config || null);
        setEnvConfigured(!!d.envConfigured);
      })
      .catch(() => {});
  }, []);

  const lancerCreation = async () => {
    if (!confirm("Créer le produit Shopify 'Bague personnalisée argent' avec 1 variant générique (SKU BAGUE-PERSO-ARGENT, prix 179 CHF — override par Draft Order) ?")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/creer-argent-setup", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setConfig({ variantId: String(d.variantId), productId: String(d.productId), handle: d.handle });
      alert(`Produit créé !\n\nVariant ID : ${d.variantId}\n\nLa commande argent fonctionne maintenant (variant lu depuis Redis en fallback).\n\nPour pérenniser : ajoute SHOPIFY_ARGENT_VARIANT_ID=${d.variantId} dans Vercel ENV.`);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reinitialiser = async () => {
    if (!confirm("Effacer la config Redis ? Le produit Shopify reste, juste la référence locale est supprimée.")) return;
    await fetch("/api/creer-argent-setup", { method: "DELETE" });
    setConfig(null);
  };

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Setup — Bague personnalisée argent</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Crée le produit Shopify générique &quot;Bague personnalisée argent&quot; utilisé par le configurateur <a href="/creer-argent" style={{ color: "#c9a96e" }}>/creer-argent</a>.
        Le prix sera dynamique via Draft Order selon la création du client.
      </p>

      {config ? (
        <div style={{ background: "#f0f9f0", border: "1px solid #4a8", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>
          <strong style={{ color: "#2a6" }}>✓ Produit créé</strong>
          <ul style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
            <li><strong>Variant ID :</strong> <code>{config.variantId}</code></li>
            <li><strong>Product ID :</strong> <code>{config.productId}</code></li>
            <li><strong>Handle :</strong> <code>{config.handle}</code> — <a href={`https://yourmood.net/products/${config.handle}`} target="_blank" rel="noreferrer" style={{ color: "#c9a96e" }}>voir sur yourmood.net</a></li>
          </ul>
          <p style={{ marginTop: "0.8rem", fontSize: "0.85rem", color: envConfigured ? "#2a6" : "#a60" }}>
            {envConfigured
              ? "✓ SHOPIFY_ARGENT_VARIANT_ID configuré dans Vercel ENV."
              : `⚠️ SHOPIFY_ARGENT_VARIANT_ID non défini dans Vercel ENV — fallback Redis utilisé. Pour pérenniser, ajoute la variable dans Vercel : SHOPIFY_ARGENT_VARIANT_ID=${config.variantId}`}
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff8e7", border: "1px solid #c9a96e", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>
          <strong>Produit non créé</strong>
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>Clique sur le bouton ci-dessous pour créer le produit Shopify.</p>
        </div>
      )}

      <button
        onClick={lancerCreation}
        disabled={loading}
        style={{
          background: "#c9a96e", color: "white", border: "none", borderRadius: 8,
          padding: "0.8rem 1.5rem", fontSize: "0.95rem", fontWeight: 600, cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1, marginRight: "0.5rem",
        }}
      >
        {loading ? "⏳ Création en cours…" : config ? "🔄 Recréer le produit" : "✨ Créer le produit Shopify"}
      </button>

      {config && (
        <button
          onClick={reinitialiser}
          style={{
            background: "white", color: "#c33", border: "1px solid #c33", borderRadius: 8,
            padding: "0.8rem 1.2rem", fontSize: "0.9rem", cursor: "pointer",
          }}
        >
          Effacer config Redis
        </button>
      )}

      {error && (
        <div style={{ marginTop: "1rem", background: "#fee", border: "1px solid #c33", borderRadius: 8, padding: "0.8rem", color: "#c33", fontSize: "0.9rem" }}>
          Erreur : {error}
        </div>
      )}

      <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #eee" }} />

      <h2 style={{ fontSize: "1rem", color: "#666" }}>Comment ça marche</h2>
      <ol style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.6, paddingLeft: "1.2rem" }}>
        <li>Ce bouton crée 1 produit Shopify &quot;Bague personnalisée argent&quot; avec 1 variant unique (SKU <code>BAGUE-PERSO-ARGENT</code>, prix placeholder 179 CHF).</li>
        <li>Le variant ID est stocké dans Redis (fallback) → le configurateur peut commander immédiatement.</li>
        <li>Pour pérenniser : ajoute <code>SHOPIFY_ARGENT_VARIANT_ID</code> dans Vercel Environment Variables (recommandé en prod).</li>
        <li>À la commande client, le configurateur appelle <code>/api/creer-argent-cart-shopify</code> → crée un Draft Order avec le prix exact + properties pierres/finition/gravure + 3 URLs SVG.</li>
        <li>Au paiement, le webhook <code>/api/orders-webhook</code> décrémente le stock argent dans Katana (les pierres sont gérées manuellement par Sandrine).</li>
      </ol>
    </main>
  );
}
