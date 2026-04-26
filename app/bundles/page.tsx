"use client";

import { useRef, useState } from "react";

type ShopifyVariant = { id: number; title: string; sku: string | null };
type ShopifyProduct = { id: number; title: string; status: string; variants: ShopifyVariant[] };

type Component = {
  variantId: number;
  variantTitle: string;
  productTitle: string;
  quantity: number;
};

type Phase = "bundle" | "ingredients" | "done";

export default function BundlesPage() {
  const [phase, setPhase] = useState<Phase>("bundle");

  // Bundle selection
  const [bundleQuery, setBundleQuery] = useState("");
  const [bundleResults, setBundleResults] = useState<ShopifyProduct[]>([]);
  const [bundleSearching, setBundleSearching] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<{ variantId: number; title: string } | null>(null);

  // Ingredient addition
  const [ingQuery, setIngQuery] = useState("");
  const [ingResults, setIngResults] = useState<ShopifyProduct[]>([]);
  const [ingSearching, setIngSearching] = useState(false);
  const [components, setComponents] = useState<Component[]>([]);

  // Creation
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const ingInputRef = useRef<HTMLInputElement>(null);

  async function searchProducts(q: string, setter: (p: ShopifyProduct[]) => void, loadingSetter: (v: boolean) => void) {
    if (!q.trim()) { setter([]); return; }
    loadingSetter(true);
    try {
      const res = await fetch(`/api/bundles/search?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { products?: ShopifyProduct[] };
      setter(data.products ?? []);
    } catch {
      setter([]);
    } finally {
      loadingSetter(false);
    }
  }

  function selectBundle(product: ShopifyProduct, variant: ShopifyVariant) {
    setSelectedBundle({ variantId: variant.id, title: `${product.title}${variant.title !== "Default Title" ? ` — ${variant.title}` : ""}` });
    setBundleResults([]);
    setBundleQuery("");
  }

  function addComponent(product: ShopifyProduct, variant: ShopifyVariant) {
    const label = `${product.title}${variant.title !== "Default Title" ? ` — ${variant.title}` : ""}`;
    setComponents((prev) => {
      const existing = prev.find((c) => c.variantId === variant.id);
      if (existing) {
        return prev.map((c) => c.variantId === variant.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { variantId: variant.id, variantTitle: variant.title, productTitle: product.title, quantity: 1 }];
    });
    setIngResults([]);
    setIngQuery("");
    ingInputRef.current?.focus();
  }

  function updateQty(variantId: number, qty: number) {
    if (qty < 1) return;
    setComponents((prev) => prev.map((c) => c.variantId === variantId ? { ...c, quantity: qty } : c));
  }

  function removeComponent(variantId: number) {
    setComponents((prev) => prev.filter((c) => c.variantId !== variantId));
  }

  async function createBundle() {
    if (!selectedBundle || !components.length) return;
    setCreating(true);
    setResult(null);
    try {
      const res = await fetch("/api/bundles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleVariantId: selectedBundle.variantId,
          components: components.map((c) => ({ variantId: c.variantId, quantity: c.quantity })),
        }),
      });
      const data = await res.json() as { ok?: boolean; bundle?: { title: string }; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Erreur création");
      setResult({ ok: true, message: `Bundle "${data.bundle?.title ?? selectedBundle.title}" configuré dans Simple Bundles.` });
      setPhase("done");
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setCreating(false);
    }
  }

  function reset() {
    setPhase("bundle");
    setSelectedBundle(null);
    setBundleQuery("");
    setBundleResults([]);
    setComponents([]);
    setIngQuery("");
    setIngResults([]);
    setResult(null);
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div style={s.container}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{result?.ok ? "✓" : "✗"}</div>
          <h2 style={{ margin: 0 }}>{result?.ok ? "Bundle créé" : "Erreur"}</h2>
          <p style={{ color: result?.ok ? "#2e7d32" : "#c62828", marginTop: 12, fontSize: 14 }}>
            {result?.message}
          </p>
          {result?.ok && (
            <div style={{ marginTop: 16, background: "#f5f5f5", borderRadius: 8, padding: "12px 16px", textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 600, marginBottom: 8 }}>
                {selectedBundle?.title}
              </div>
              {components.map((c) => (
                <div key={c.variantId} style={{ fontSize: 13, color: "#333", padding: "2px 0" }}>
                  • {c.productTitle}{c.variantTitle !== "Default Title" ? ` — ${c.variantTitle}` : ""} × {c.quantity}
                </div>
              ))}
            </div>
          )}
          <button style={{ ...s.btn, marginTop: 24 }} onClick={reset}>
            Nouveau bundle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.title}>🧩 Configurer un bundle</div>
      <p style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
        Simple Bundles & Kits — configuration des composants
      </p>

      {/* ── STEP 1 — Bundle product ─────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.stepLabel}>1 — Produit bundle</div>

        {selectedBundle ? (
          <div style={s.selectedRow}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{selectedBundle.title}</span>
            <button style={s.clearBtn} onClick={() => { setSelectedBundle(null); setPhase("bundle"); }}>✕</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="Nom du bundle dans Shopify"
                value={bundleQuery}
                onChange={(e) => setBundleQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void searchProducts(bundleQuery, setBundleResults, setBundleSearching); }}
                autoFocus
              />
              <button
                style={{ ...s.btn, flexShrink: 0, background: bundleQuery.trim() ? "#111" : "#ccc" }}
                disabled={!bundleQuery.trim() || bundleSearching}
                onClick={() => void searchProducts(bundleQuery, setBundleResults, setBundleSearching)}
              >
                {bundleSearching ? "…" : "Chercher"}
              </button>
            </div>
            {bundleResults.length > 0 && (
              <div style={s.results}>
                {bundleResults.map((p) => (
                  <div key={p.id}>
                    {p.variants.length === 1 ? (
                      <button style={s.resultRow} onClick={() => { selectBundle(p, p.variants[0]); setPhase("ingredients"); }}>
                        <span style={s.productName}>{p.title}</span>
                        <span style={s.variantBadge}>{p.status}</span>
                      </button>
                    ) : (
                      <>
                        <div style={{ ...s.resultRow, cursor: "default", borderBottom: "none" }}>
                          <span style={s.productName}>{p.title}</span>
                        </div>
                        {p.variants.map((v) => (
                          <button key={v.id} style={{ ...s.resultRow, paddingLeft: 28 }} onClick={() => { selectBundle(p, v); setPhase("ingredients"); }}>
                            <span style={{ fontSize: 13 }}>{v.title}</span>
                            {v.sku && <span style={s.variantBadge}>{v.sku}</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── STEP 2 — Ingredients ────────────────────────────────────────────── */}
      {phase === "ingredients" && selectedBundle && (
        <div style={s.section}>
          <div style={s.stepLabel}>2 — Composants</div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={ingInputRef}
              style={{ ...s.input, flex: 1 }}
              placeholder="Nom du produit composant"
              value={ingQuery}
              onChange={(e) => setIngQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void searchProducts(ingQuery, setIngResults, setIngSearching); }}
            />
            <button
              style={{ ...s.btn, flexShrink: 0, background: ingQuery.trim() ? "#111" : "#ccc" }}
              disabled={!ingQuery.trim() || ingSearching}
              onClick={() => void searchProducts(ingQuery, setIngResults, setIngSearching)}
            >
              {ingSearching ? "…" : "Ajouter"}
            </button>
          </div>

          {ingResults.length > 0 && (
            <div style={s.results}>
              {ingResults.map((p) => (
                <div key={p.id}>
                  {p.variants.length === 1 ? (
                    <button style={s.resultRow} onClick={() => addComponent(p, p.variants[0])}>
                      <span style={s.productName}>{p.title}</span>
                      {p.variants[0].sku && <span style={s.variantBadge}>{p.variants[0].sku}</span>}
                    </button>
                  ) : (
                    <>
                      <div style={{ ...s.resultRow, cursor: "default", borderBottom: "none" }}>
                        <span style={s.productName}>{p.title}</span>
                      </div>
                      {p.variants.map((v) => (
                        <button key={v.id} style={{ ...s.resultRow, paddingLeft: 28 }} onClick={() => addComponent(p, v)}>
                          <span style={{ fontSize: 13 }}>{v.title}</span>
                          {v.sku && <span style={s.variantBadge}>{v.sku}</span>}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Component list */}
          {components.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {components.map((c) => (
                <div key={c.variantId} style={s.componentRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.productTitle}</div>
                    {c.variantTitle !== "Default Title" && (
                      <div style={{ fontSize: 12, color: "#666" }}>{c.variantTitle}</div>
                    )}
                  </div>
                  <div style={s.qtyControl}>
                    <button style={s.qtyBtn} onClick={() => updateQty(c.variantId, c.quantity - 1)}>−</button>
                    <span style={{ minWidth: 24, textAlign: "center", fontSize: 14 }}>{c.quantity}</span>
                    <button style={s.qtyBtn} onClick={() => updateQty(c.variantId, c.quantity + 1)}>+</button>
                  </div>
                  <button style={s.removeBtn} onClick={() => removeComponent(c.variantId)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {components.length > 0 && (
            <button
              style={{ ...s.btn, marginTop: 20, width: "100%", fontSize: 16, padding: "14px 0", background: creating ? "#ccc" : "#111" }}
              disabled={creating}
              onClick={createBundle}
            >
              {creating ? "Création en cours…" : `Créer le bundle (${components.length} composant${components.length > 1 ? "s" : ""})`}
            </button>
          )}

          {result && !result.ok && (
            <div style={{ marginTop: 12, color: "#c62828", fontSize: 13 }}>✗ {result.message}</div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  container: { fontFamily: "sans-serif", maxWidth: 520, margin: "0 auto", padding: "24px 16px", color: "#111" } as React.CSSProperties,
  title: { fontSize: 20, fontWeight: 700 } as React.CSSProperties,
  section: { marginTop: 28 } as React.CSSProperties,
  stepLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#888", marginBottom: 10 },
  input: { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, background: "#fff", outline: "none" } as React.CSSProperties,
  btn: { padding: "10px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" } as React.CSSProperties,
  results: { border: "1px solid #e8e8e8", borderRadius: 6, marginTop: 8, overflow: "hidden" } as React.CSSProperties,
  resultRow: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", textAlign: "left" as const, gap: 8 } as React.CSSProperties,
  productName: { fontSize: 14, fontWeight: 500, flex: 1, textAlign: "left" as const },
  variantBadge: { fontSize: 11, color: "#888", background: "#f5f5f5", padding: "2px 6px", borderRadius: 4, flexShrink: 0 } as React.CSSProperties,
  selectedRow: { display: "flex", alignItems: "center", gap: 10, background: "#f5f5f5", borderRadius: 6, padding: "10px 14px" } as React.CSSProperties,
  clearBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0 } as React.CSSProperties,
  componentRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f0f0f0" } as React.CSSProperties,
  qtyControl: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 } as React.CSSProperties,
  qtyBtn: { width: 28, height: 28, border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 16 } as React.CSSProperties,
  removeBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, padding: "4px 6px", flexShrink: 0 } as React.CSSProperties,
};
