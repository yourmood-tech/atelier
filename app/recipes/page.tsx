"use client";

import { useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type ShopifyVariant = {
  id: number;
  sku: string | null;
  title: string;
  options: Record<string, string>;
};

type ShopifyProduct = {
  id: number;
  title: string;
  options: { name: string; values: string[] }[];
  variants: ShopifyVariant[];
};

type KatanaMaterialVariant = {
  id: number;
  sku: string | null;
  name: string;
};

type KatanaMaterial = {
  id: number;
  name: string;
  kind: "material" | "product";
  variants: KatanaMaterialVariant[];
  hasTaille: boolean;
};

type IngredientEntry = {
  localId: string;
  material: KatanaMaterial;
  quantity: number;
  // Selected variant (when hasTaille=false and multiple non-size variants)
  selectedVariantId: number | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function isTailleOption(name: string): boolean {
  return ["taille", "size", "ring size"].includes(name.toLowerCase());
}

function hasTailleOption(product: ShopifyProduct): boolean {
  return product.options.some((o) => isTailleOption(o.name));
}

function getTailleValue(variant: ShopifyVariant): string | null {
  for (const [k, v] of Object.entries(variant.options)) {
    if (isTailleOption(k)) return v;
  }
  return null;
}

function findIngredientVariant(
  material: KatanaMaterial,
  productSize: string,
  selectedVariantId: number | null
): KatanaMaterialVariant | null {
  if (material.hasTaille) {
    return material.variants.find((v) => v.name.trim() === productSize) ?? null;
  }
  if (selectedVariantId !== null) {
    return material.variants.find((v) => v.id === selectedVariantId) ?? material.variants[0] ?? null;
  }
  return material.variants[0] ?? null;
}

function generateCSV(
  product: ShopifyProduct,
  ingredients: IngredientEntry[]
): { csv: string; warnings: string[] } {
  const header =
    "Product variant code / SKU (required),Ingredient variant code / SKU (required),Quantity (required)";
  const rows: string[] = [header];
  const warnings: string[] = [];

  for (const variant of product.variants) {
    const productSku = variant.sku;
    if (!productSku) {
      warnings.push(`Variante "${variant.title}" sans SKU — ignorée`);
      continue;
    }

    const productSize = getTailleValue(variant) ?? variant.title;

    for (const ing of ingredients) {
      const ingVariant = findIngredientVariant(ing.material, productSize, ing.selectedVariantId);
      if (!ingVariant?.sku) {
        warnings.push(
          `Pas d'ingrédient trouvé pour "${ing.material.name}" — taille ${productSize}`
        );
        continue;
      }
      rows.push([productSku, ingVariant.sku, ing.quantity].join(","));
    }
  }

  return { csv: rows.join("\n"), warnings };
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ShopifyProduct[]>([]);
  const [productSearching, setProductSearching] = useState(false);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);

  const [ingQuery, setIngQuery] = useState("");
  const [ingResults, setIngResults] = useState<KatanaMaterial[]>([]);
  const [ingSearching, setIngSearching] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);

  const [warnings, setWarnings] = useState<string[]>([]);
  const ingInputRef = useRef<HTMLInputElement>(null);

  async function searchProduct(q: string) {
    if (!q.trim()) { setProductResults([]); return; }
    setProductSearching(true);
    try {
      const res = await fetch(`/api/bundles/search?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { products?: ShopifyProduct[] };
      setProductResults(data.products ?? []);
    } catch { setProductResults([]); }
    finally { setProductSearching(false); }
  }

  async function searchIngredient(q: string) {
    if (!q.trim()) { setIngResults([]); return; }
    setIngSearching(true);
    try {
      const res = await fetch(`/api/recipes/search-ingredient?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { materials?: KatanaMaterial[] };
      setIngResults(data.materials ?? []);
    } catch { setIngResults([]); }
    finally { setIngSearching(false); }
  }

  function selectProduct(p: ShopifyProduct) {
    setProduct(p);
    setProductResults([]);
    setProductQuery("");
    setIngredients([]);
    setWarnings([]);
    setTimeout(() => ingInputRef.current?.focus(), 50);
  }

  function addIngredient(material: KatanaMaterial) {
    setIngredients((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        material,
        quantity: 1,
        selectedVariantId: material.hasTaille ? null : (material.variants[0]?.id ?? null),
      },
    ]);
    setIngResults([]);
    setIngQuery("");
    setWarnings([]);
    setTimeout(() => ingInputRef.current?.focus(), 50);
  }

  function updateQty(localId: string, qty: number) {
    if (qty < 1) return;
    setIngredients((prev) => prev.map((i) => (i.localId === localId ? { ...i, quantity: qty } : i)));
  }

  function updateVariant(localId: string, variantId: number) {
    setIngredients((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, selectedVariantId: variantId } : i))
    );
    setWarnings([]);
  }

  function removeIngredient(localId: string) {
    setIngredients((prev) => prev.filter((i) => i.localId !== localId));
    setWarnings([]);
  }

  function handleGenerate() {
    if (!product || !ingredients.length) return;
    const { csv, warnings: w } = generateCSV(product, ingredients);
    setWarnings(w);
    const slug = product.title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 40);
    downloadCSV(csv, `recipe_${slug}.csv`);
  }

  const variantCount = product?.variants.length ?? 0;
  const skuCount = product?.variants.filter((v) => v.sku).length ?? 0;
  const hasTailleInProduct = product ? hasTailleOption(product) : false;

  return (
    <div style={s.container}>
      <div style={s.title}>🧪 Générateur CSV Recettes Katana</div>

      {/* ── Step 1 — Produit fini ──────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.stepLabel}>1 — Produit fini (Shopify)</div>

        {product ? (
          <div style={s.selectedRow}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{product.title}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {skuCount} variante{skuCount > 1 ? "s" : ""} avec SKU
                {!hasTailleInProduct && (
                  <span style={{ color: "#e67e22" }}> · ⚠ pas d'option Taille détectée</span>
                )}
              </div>
            </div>
            <button
              style={s.clearBtn}
              onClick={() => { setProduct(null); setIngredients([]); setWarnings([]); }}
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="Nom du produit fini"
                value={productQuery}
                autoFocus
                onChange={(e) => setProductQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void searchProduct(productQuery); }}
              />
              <button
                style={{ ...s.btn, flexShrink: 0, background: productQuery.trim() ? "#111" : "#ccc" }}
                disabled={!productQuery.trim() || productSearching}
                onClick={() => void searchProduct(productQuery)}
              >
                {productSearching ? "…" : "Chercher"}
              </button>
            </div>
            {productResults.length > 0 && (
              <div style={s.results}>
                {productResults.map((p) => (
                  <button key={p.id} style={s.resultRow} onClick={() => selectProduct(p)}>
                    <span style={s.productName}>{p.title}</span>
                    <span style={s.badge}>{p.variants.length} variantes</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Step 2 — Ingrédients ──────────────────────────────────────── */}
      {product && (
        <div style={s.section}>
          <div style={s.stepLabel}>2 — Ingrédients (Katana)</div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={ingInputRef}
              style={{ ...s.input, flex: 1 }}
              placeholder="Nom de la matière Katana"
              value={ingQuery}
              onChange={(e) => setIngQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void searchIngredient(ingQuery); }}
            />
            <button
              style={{ ...s.btn, flexShrink: 0, background: ingQuery.trim() ? "#111" : "#ccc" }}
              disabled={!ingQuery.trim() || ingSearching}
              onClick={() => void searchIngredient(ingQuery)}
            >
              {ingSearching ? "…" : "Chercher"}
            </button>
          </div>

          {ingResults.length > 0 && (
            <div style={s.results}>
              {ingResults.map((m) => (
                <button key={`${m.kind}-${m.id}`} style={s.resultRow} onClick={() => addIngredient(m)}>
                  <span style={s.productName}>{m.name}</span>
                  <span style={s.badge}>
                    {m.kind === "product" ? "produit" : "matière"} · {m.variants.length} variante{m.variants.length > 1 ? "s" : ""}
                    {m.hasTaille ? " · taille ✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Ingredient list */}
          {ingredients.map((ing) => (
            <div key={ing.localId} style={s.ingCard}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ing.material.name}</div>
                  {ing.material.hasTaille ? (
                    <div style={{ fontSize: 11, color: "#27ae60", marginTop: 2 }}>
                      ✓ Taille mappée automatiquement ({ing.material.variants.length} tailles)
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#e67e22", marginTop: 2 }}>
                      ⚠ Même variante pour toutes les tailles
                    </div>
                  )}
                </div>
                <div style={s.qtyControl}>
                  <button style={s.qtyBtn} onClick={() => updateQty(ing.localId, ing.quantity - 1)}>−</button>
                  <span style={{ minWidth: 24, textAlign: "center", fontSize: 14 }}>{ing.quantity}</span>
                  <button style={s.qtyBtn} onClick={() => updateQty(ing.localId, ing.quantity + 1)}>+</button>
                </div>
                <button style={s.clearBtn} onClick={() => removeIngredient(ing.localId)}>✕</button>
              </div>

              {/* Variant picker when not size-mapped */}
              {!ing.material.hasTaille && ing.material.variants.length > 1 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                    Quelle variante utiliser ?
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ing.material.variants.map((v) => (
                      <button
                        key={v.id}
                        style={{
                          ...s.optBtn,
                          background: ing.selectedVariantId === v.id ? "#111" : "#f5f5f5",
                          color: ing.selectedVariantId === v.id ? "#fff" : "#333",
                          borderColor: ing.selectedVariantId === v.id ? "#111" : "#e0e0e0",
                        }}
                        onClick={() => updateVariant(ing.localId, v.id)}
                      >
                        {v.name || v.sku || `#${v.id}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Generate button */}
          {ingredients.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button
                style={{ ...s.btn, width: "100%", fontSize: 15, padding: "13px 0" }}
                onClick={handleGenerate}
              >
                ⬇ Télécharger le CSV ({skuCount} variantes × {ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""})
              </button>
              {warnings.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#e67e22", padding: "3px 0" }}>
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = {
  container: { fontFamily: "sans-serif", maxWidth: 560, margin: "0 auto", padding: "24px 16px", color: "#111" } as React.CSSProperties,
  title: { fontSize: 20, fontWeight: 700 } as React.CSSProperties,
  section: { marginTop: 28 } as React.CSSProperties,
  stepLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#888", marginBottom: 10 },
  input: { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
  btn: { padding: "10px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" } as React.CSSProperties,
  results: { border: "1px solid #e8e8e8", borderRadius: 6, marginTop: 8, overflow: "hidden" } as React.CSSProperties,
  resultRow: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", gap: 8 } as React.CSSProperties,
  productName: { fontSize: 13, fontWeight: 500, flex: 1, textAlign: "left" as const },
  badge: { fontSize: 11, color: "#888", background: "#f5f5f5", padding: "2px 7px", borderRadius: 4, flexShrink: 0, whiteSpace: "nowrap" as const } as React.CSSProperties,
  selectedRow: { display: "flex", alignItems: "center", gap: 10, background: "#f5f5f5", borderRadius: 6, padding: "10px 14px" } as React.CSSProperties,
  clearBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0 } as React.CSSProperties,
  ingCard: { background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8, padding: "12px 14px", marginTop: 10 } as React.CSSProperties,
  qtyControl: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 } as React.CSSProperties,
  qtyBtn: { width: 26, height: 26, border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 15 } as React.CSSProperties,
  optBtn: { padding: "4px 12px", border: "1px solid", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500 } as React.CSSProperties,
};
