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

type VariantCheckResult = {
  sku: string;
  exists: boolean;
  katanaId?: number;
  katanaProductId?: number;
};

type VariantCheckState = {
  status: "checking" | "done";
  results: VariantCheckResult[];
  creating: boolean;
  createErrors: string[];
};

type IngredientEntry = {
  localId: string;
  material: KatanaMaterial;
  quantity: number;
  selectedVariantId: number | null;
  // For each non-size product option: which values this ingredient applies to (all = all values)
  productOptionFilter: Record<string, string[]>;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function isTailleOption(name: string): boolean {
  return ["taille", "size", "ring size"].includes(name.toLowerCase());
}

function getNonSizeOptions(product: ShopifyProduct): { name: string; values: string[] }[] {
  return product.options.filter((o) => !isTailleOption(o.name));
}

function variantMatchesFilter(variant: ShopifyVariant, filter: Record<string, string[]>): boolean {
  for (const [optName, selected] of Object.entries(filter)) {
    const val = variant.options[optName];
    if (val !== undefined && !selected.includes(val)) return false;
  }
  return true;
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
      if (!variantMatchesFilter(variant, ing.productOptionFilter)) continue;
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
  const [variantCheck, setVariantCheck] = useState<VariantCheckState | null>(null);
  const ingInputRef = useRef<HTMLInputElement>(null);

  async function checkVariants(p: ShopifyProduct) {
    const skus = p.variants.map((v) => v.sku).filter(Boolean) as string[];
    if (!skus.length) return;
    setVariantCheck({ status: "checking", results: [], creating: false, createErrors: [] });
    try {
      const res = await fetch("/api/recipes/check-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus }),
      });
      const data = (await res.json()) as { results?: VariantCheckResult[] };
      setVariantCheck({ status: "done", results: data.results ?? [], creating: false, createErrors: [] });
    } catch {
      setVariantCheck(null);
    }
  }

  async function createMissingVariants(p: ShopifyProduct) {
    if (!variantCheck) return;
    const missing = variantCheck.results.filter((r) => !r.exists);
    if (!missing.length) return;

    setVariantCheck((prev) => prev ? { ...prev, creating: true, createErrors: [] } : null);

    const variants = missing.map((r) => {
      const sv = p.variants.find((v) => v.sku === r.sku)!;
      return { sku: r.sku, variantName: getTailleValue(sv) ?? sv.title };
    });

    // Use katanaProductId from any already-existing variant to patch the right product
    const katanaProductId = variantCheck.results.find((r) => r.exists && r.katanaProductId)?.katanaProductId;

    try {
      const res = await fetch("/api/recipes/create-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productTitle: p.title, variants, katanaProductId }),
      });
      const data = (await res.json()) as { results?: { sku: string; created: boolean; error?: string }[] };
      const errors = (data.results ?? []).filter((r) => !r.created).map((r) => `${r.sku} : ${r.error ?? "erreur"}`);
      if (errors.length) {
        setVariantCheck((prev) => prev ? { ...prev, creating: false, createErrors: errors } : null);
      } else {
        // Re-check after successful creation
        await checkVariants(p);
      }
    } catch (e) {
      setVariantCheck((prev) => prev ? { ...prev, creating: false, createErrors: [e instanceof Error ? e.message : "Erreur réseau"] } : null);
    }
  }

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
    setVariantCheck(null);
    void checkVariants(p);
    setTimeout(() => ingInputRef.current?.focus(), 50);
  }

  function addIngredient(material: KatanaMaterial) {
    const filter: Record<string, string[]> = {};
    if (product) {
      for (const opt of getNonSizeOptions(product)) {
        filter[opt.name] = [...opt.values];
      }
    }
    setIngredients((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        material,
        quantity: 1,
        selectedVariantId: material.hasTaille ? null : (material.variants[0]?.id ?? null),
        productOptionFilter: filter,
      },
    ]);
    setIngResults([]);
    setIngQuery("");
    setWarnings([]);
    setTimeout(() => ingInputRef.current?.focus(), 50);
  }

  function toggleOptionValue(localId: string, optName: string, value: string) {
    setIngredients((prev) => prev.map((ing) => {
      if (ing.localId !== localId) return ing;
      const current = ing.productOptionFilter[optName] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (next.length === 0) return ing; // ne pas désélectionner tout
      return { ...ing, productOptionFilter: { ...ing.productOptionFilter, [optName]: next } };
    }));
    setWarnings([]);
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
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                Options : {product.options.map(o => `${o.name} (${o.values.length})`).join(" · ")}
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

      {/* ── Vérification variantes Katana ─────────────────────────────── */}
      {product && variantCheck && (() => {
        const missing = variantCheck.results.filter((r) => !r.exists);
        const total = variantCheck.results.length;
        if (variantCheck.status === "checking") {
          return (
            <div style={{ ...s.section, fontSize: 13, color: "#888" }}>
              ⏳ Vérification des variantes dans Katana ({total} SKU{total > 1 ? "s" : ""})…
            </div>
          );
        }
        if (missing.length === 0) {
          return (
            <div style={{ ...s.section, fontSize: 13, color: "#27ae60", fontWeight: 500 }}>
              ✓ Toutes les variantes sont dans Katana ({total}/{total})
            </div>
          );
        }
        return (
          <div style={{ ...s.section }}>
            <div style={{ background: "#fff8f0", border: "1px solid #e67e22", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e67e22", marginBottom: 8 }}>
                ⚠ {missing.length} variante{missing.length > 1 ? "s" : ""} manquante{missing.length > 1 ? "s" : ""} dans Katana ({total - missing.length}/{total} présentes)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                {missing.map((r) => (
                  <span key={r.sku} style={{ fontSize: 11, background: "#fde8d0", color: "#c0392b", padding: "2px 8px", borderRadius: 4 }}>
                    {r.sku}
                  </span>
                ))}
              </div>
              {variantCheck.createErrors.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {variantCheck.createErrors.map((err, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#c0392b" }}>✗ {err}</div>
                  ))}
                </div>
              )}
              <button
                style={{ ...s.btn, background: variantCheck.creating ? "#ccc" : "#e67e22", fontSize: 13, padding: "8px 16px", cursor: variantCheck.creating ? "not-allowed" : "pointer" }}
                disabled={variantCheck.creating}
                onClick={() => void createMissingVariants(product)}
              >
                {variantCheck.creating ? "Création en cours…" : `Créer les ${missing.length} variantes dans Katana`}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Step 2 — Ingrédients ──────────────────────────────────────── */}
      {product && (
        <div style={s.section}>
          <div style={s.stepLabel}>2 — Ingrédients (Katana)</div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={ingInputRef}
              style={{ ...s.input, flex: 1 }}
              placeholder="SKU d'une variante (ex: MTRL-MD-RI-113-Infinity CZ-50)"
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

              {/* Non-size product option filter */}
              {product && getNonSizeOptions(product).map((opt) => {
                const allValues = opt.values;
                const selected = ing.productOptionFilter[opt.name] ?? allValues;
                const allSelected = selected.length === allValues.length;
                return (
                  <div key={opt.name} style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                      {opt.name} {allSelected ? <span style={{ color: "#27ae60" }}>· toutes</span> : <span style={{ color: "#e67e22" }}>· {selected.length}/{allValues.length}</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {allValues.map((val) => {
                        const isOn = selected.includes(val);
                        return (
                          <button
                            key={val}
                            style={{
                              ...s.optBtn,
                              background: isOn ? "#111" : "#f5f5f5",
                              color: isOn ? "#fff" : "#999",
                              borderColor: isOn ? "#111" : "#e0e0e0",
                            }}
                            onClick={() => toggleOptionValue(ing.localId, opt.name, val)}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

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
