"use client";

import { useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type ShopifyVariant = {
  id: number;
  sku: string | null;
  title: string;
  options: Record<string, string>; // { "Taille": "50", "Couleur": "Or" }
};

type ShopifyProduct = {
  id: number;
  title: string;
  status: string;
  descriptionHtml?: string;
  options: { name: string; values: string[] }[];
  variants: ShopifyVariant[];
};

type Suggestion = {
  name: string;
  product: ShopifyProduct | null;
  searching: boolean;
};

type ComponentEntry = {
  localId: string;
  product: ShopifyProduct;
  quantity: number;
  selectedOptions: Record<string, string>;
  hasTaille: boolean;
  extraOptionNames: string[];
  // Which values of each non-Taille BUNDLE option this component applies to (all = all)
  bundleOptionFilter: Record<string, string[]>;
};

type Phase = "bundle" | "ingredients";

// ── Helpers ────────────────────────────────────────────────────────────────

function extractNamesFromHtml(html: string): string[] {
  const text = html
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  return [...new Set(
    text.split("\n").map((l) => l.trim()).filter((l) => l.length > 4 && l.length < 120 && !/^https?:/.test(l))
  )];
}

function isTailleOption(name: string): boolean {
  return ["taille", "size", "ring size"].includes(name.toLowerCase());
}

function getExtraOptions(product: ShopifyProduct): string[] {
  return product.options.filter((o) => !isTailleOption(o.name)).map((o) => o.name);
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

function findComponentVariant(
  component: ComponentEntry,
  bundleSize: string
): ShopifyVariant | null {
  return (
    component.product.variants.find((v) => {
      if (component.hasTaille && getTailleValue(v) !== bundleSize) return false;
      for (const [optName, optVal] of Object.entries(component.selectedOptions)) {
        if (v.options[optName] !== optVal) return false;
      }
      return true;
    }) ?? null
  );
}

function variantMatchesBundleFilter(
  bundleVariant: ShopifyVariant,
  filter: Record<string, string[]>
): boolean {
  for (const [optName, selected] of Object.entries(filter)) {
    const val = bundleVariant.options[optName];
    if (val !== undefined && !selected.includes(val)) return false;
  }
  return true;
}

function generateCSV(
  bundleProduct: ShopifyProduct,
  components: ComponentEntry[]
): { csv: string; warnings: string[] } {
  const header = "bundle_variant_sku,bundle_item_variant_sku,bundle_item_quantity,sync_price";
  const rows: string[] = [header];
  const warnings: string[] = [];

  for (const bundleVariant of bundleProduct.variants) {
    const bundleSize = getTailleValue(bundleVariant) ?? bundleVariant.title;

    for (const comp of components) {
      if (!variantMatchesBundleFilter(bundleVariant, comp.bundleOptionFilter)) continue;

      const itemVariant = comp.hasTaille
        ? findComponentVariant(comp, bundleSize)
        : comp.product.variants.find((v) => {
            for (const [k, val] of Object.entries(comp.selectedOptions)) {
              if (v.options[k] !== val) return false;
            }
            return true;
          }) ?? comp.product.variants[0];

      if (!itemVariant) {
        warnings.push(`Pas de variante trouvée pour "${comp.product.title}" — taille ${bundleSize}`);
        continue;
      }

      rows.push([bundleVariant.id, itemVariant.id, comp.quantity, "FALSE"].join(","));
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

export default function BundlesPage() {
  const [phase, setPhase] = useState<Phase>("bundle");

  const [bundleQuery, setBundleQuery] = useState("");
  const [bundleResults, setBundleResults] = useState<ShopifyProduct[]>([]);
  const [bundleSearching, setBundleSearching] = useState(false);
  const [bundleProduct, setBundleProduct] = useState<ShopifyProduct | null>(null);

  const [ingQuery, setIngQuery] = useState("");
  const [ingResults, setIngResults] = useState<ShopifyProduct[]>([]);
  const [ingSearching, setIngSearching] = useState(false);
  const [components, setComponents] = useState<ComponentEntry[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [warnings, setWarnings] = useState<string[]>([]);

  const ingInputRef = useRef<HTMLInputElement>(null);

  async function search(
    q: string,
    setter: (p: ShopifyProduct[]) => void,
    loading: (v: boolean) => void
  ) {
    if (!q.trim()) { setter([]); return; }
    loading(true);
    try {
      const res = await fetch(`/api/bundles/search?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { products?: ShopifyProduct[] };
      setter(data.products ?? []);
    } catch { setter([]); }
    finally { loading(false); }
  }

  function selectBundle(product: ShopifyProduct) {
    setBundleProduct(product);
    setBundleResults([]);
    setBundleQuery("");
    setComponents([]);
    setWarnings([]);
    setSuggestions([]);
    setPhase("ingredients");

    const names = product.descriptionHtml ? extractNamesFromHtml(product.descriptionHtml) : [];
    if (!names.length) return;

    const initial: Suggestion[] = names.map((name) => ({ name, product: null, searching: true }));
    setSuggestions(initial);

    names.forEach((name, i) => {
      fetch(`/api/bundles/search?q=${encodeURIComponent(name)}`)
        .then((r) => r.json() as Promise<{ products?: ShopifyProduct[] }>)
        .then(({ products }) => {
          setSuggestions((prev) => prev.map((s, idx) =>
            idx === i ? { ...s, searching: false, product: products?.[0] ?? null } : s
          ));
        })
        .catch(() => {
          setSuggestions((prev) => prev.map((s, idx) =>
            idx === i ? { ...s, searching: false } : s
          ));
        });
    });
  }

  function addComponent(product: ShopifyProduct) {
    const extraOptionNames = getExtraOptions(product);
    const hasTaille = hasTailleOption(product);
    const defaultSelected: Record<string, string> = {};
    for (const optName of extraOptionNames) {
      const opt = product.options.find((o) => o.name === optName);
      if (opt?.values[0]) defaultSelected[optName] = opt.values[0];
    }
    const bundleFilter: Record<string, string[]> = {};
    if (bundleProduct) {
      for (const opt of bundleProduct.options.filter((o) => !isTailleOption(o.name))) {
        bundleFilter[opt.name] = [...opt.values];
      }
    }
    setComponents((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        product,
        quantity: 1,
        selectedOptions: defaultSelected,
        hasTaille,
        extraOptionNames,
        bundleOptionFilter: bundleFilter,
      },
    ]);
    setIngResults([]);
    setIngQuery("");
    setWarnings([]);
    setTimeout(() => ingInputRef.current?.focus(), 50);
  }

  function toggleBundleOption(localId: string, optName: string, value: string) {
    setComponents((prev) => prev.map((c) => {
      if (c.localId !== localId) return c;
      const current = c.bundleOptionFilter[optName] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length === 0) return c;
      return { ...c, bundleOptionFilter: { ...c.bundleOptionFilter, [optName]: next } };
    }));
    setWarnings([]);
  }

  function updateOption(localId: string, optName: string, value: string) {
    setComponents((prev) =>
      prev.map((c) =>
        c.localId === localId
          ? { ...c, selectedOptions: { ...c.selectedOptions, [optName]: value } }
          : c
      )
    );
    setWarnings([]);
  }

  function updateQty(localId: string, qty: number) {
    if (qty < 1) return;
    setComponents((prev) => prev.map((c) => (c.localId === localId ? { ...c, quantity: qty } : c)));
  }

  function removeComponent(localId: string) {
    setComponents((prev) => prev.filter((c) => c.localId !== localId));
    setWarnings([]);
  }

  function handleGenerate() {
    if (!bundleProduct || !components.length) return;
    const { csv, warnings: w } = generateCSV(bundleProduct, components);
    setWarnings(w);
    const slug = bundleProduct.title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 40);
    downloadCSV(csv, `simple_bundles_${slug}.csv`);
  }

  const bundleSizeCount = bundleProduct
    ? bundleProduct.variants.filter((v) => getTailleValue(v) !== null).length
    : 0;

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div style={s.container}>
      <div style={s.title}>🧩 Générateur CSV Simple Bundles</div>

      {/* ── Step 1 — Bundle ──────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.stepLabel}>1 — Produit bundle</div>

        {bundleProduct ? (
          <div style={s.selectedRow}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{bundleProduct.title}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {bundleProduct.variants.length} variante(s) · {bundleSizeCount} taille(s)
              </div>
            </div>
            <button style={s.clearBtn} onClick={() => { setBundleProduct(null); setPhase("bundle"); setComponents([]); }}>✕</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="Nom du produit bundle"
                value={bundleQuery}
                autoFocus
                onChange={(e) => setBundleQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void search(bundleQuery, setBundleResults, setBundleSearching); }}
              />
              <button
                style={{ ...s.btn, flexShrink: 0, background: bundleQuery.trim() ? "#111" : "#ccc" }}
                disabled={!bundleQuery.trim() || bundleSearching}
                onClick={() => void search(bundleQuery, setBundleResults, setBundleSearching)}
              >
                {bundleSearching ? "…" : "Chercher"}
              </button>
            </div>
            {bundleResults.length > 0 && (
              <div style={s.results}>
                {bundleResults.map((p) => (
                  <button key={p.id} style={s.resultRow} onClick={() => selectBundle(p)}>
                    <span style={s.productName}>{p.title}</span>
                    <span style={s.badge}>{p.variants.length} variantes</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Step 2 — Ingredients ─────────────────────────────────────────── */}
      {phase === "ingredients" && bundleProduct && (
        <div style={s.section}>
          <div style={s.stepLabel}>2 — Composants</div>

          {/* Suggested components from description */}
          {suggestions.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Trouvé dans la description
              </div>
              {suggestions.map((sg, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #f0f0f0" }}>
                  {sg.searching ? (
                    <span style={{ fontSize: 13, color: "#aaa", flex: 1 }}>⏳ {sg.name}</span>
                  ) : sg.product ? (
                    <>
                      <span style={{ fontSize: 13, flex: 1 }}>{sg.product.title}</span>
                      {components.some((c) => c.product.id === sg.product!.id) ? (
                        <span style={{ fontSize: 11, color: "#27ae60" }}>✓ Ajouté</span>
                      ) : (
                        <button style={{ ...s.btn, padding: "4px 12px", fontSize: 12 }} onClick={() => addComponent(sg.product!)}>
                          Ajouter
                        </button>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: "#bbb", flex: 1 }}>✗ {sg.name} — non trouvé</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={ingInputRef}
              style={{ ...s.input, flex: 1 }}
              placeholder="Chercher un composant"
              value={ingQuery}
              onChange={(e) => setIngQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void search(ingQuery, setIngResults, setIngSearching); }}
            />
            <button
              style={{ ...s.btn, flexShrink: 0, background: ingQuery.trim() ? "#111" : "#ccc" }}
              disabled={!ingQuery.trim() || ingSearching}
              onClick={() => void search(ingQuery, setIngResults, setIngSearching)}
            >
              {ingSearching ? "…" : "Chercher"}
            </button>
          </div>

          {ingResults.length > 0 && (
            <div style={s.results}>
              {ingResults.map((p) => (
                <button key={p.id} style={s.resultRow} onClick={() => addComponent(p)}>
                  <span style={s.productName}>{p.title}</span>
                  <span style={s.badge}>
                    {p.options.map((o) => o.name).join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Component list */}
          {components.map((comp) => (
            <div key={comp.localId} style={s.compCard}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{comp.product.title}</div>
                  {!comp.hasTaille && (
                    <div style={{ fontSize: 11, color: "#e67e22", marginTop: 2 }}>
                      ⚠ Pas de variante Taille — même variante pour toutes les tailles
                    </div>
                  )}
                </div>
                <div style={s.qtyControl}>
                  <button style={s.qtyBtn} onClick={() => updateQty(comp.localId, comp.quantity - 1)}>−</button>
                  <span style={{ minWidth: 24, textAlign: "center", fontSize: 14 }}>{comp.quantity}</span>
                  <button style={s.qtyBtn} onClick={() => updateQty(comp.localId, comp.quantity + 1)}>+</button>
                </div>
                <button style={s.clearBtn} onClick={() => removeComponent(comp.localId)}>✕</button>
              </div>

              {/* Bundle option filter — which bundle variants this component applies to */}
              {bundleProduct && bundleProduct.options.filter((o) => !isTailleOption(o.name)).map((opt) => {
                const allValues = opt.values;
                const selected = comp.bundleOptionFilter[opt.name] ?? allValues;
                const allSelected = selected.length === allValues.length;
                return (
                  <div key={opt.name} style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                      {opt.name} du bundle&nbsp;
                      {allSelected
                        ? <span style={{ color: "#27ae60" }}>· toutes</span>
                        : <span style={{ color: "#e67e22" }}>· {selected.length}/{allValues.length}</span>}
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
                            onClick={() => toggleBundleOption(comp.localId, opt.name, val)}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Extra option selectors (non-Taille) */}
              {comp.extraOptionNames.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {comp.extraOptionNames.map((optName) => {
                    const opt = comp.product.options.find((o) => o.name === optName)!;
                    return (
                      <div key={optName}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                          {optName} — quelle valeur par défaut ?
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {opt.values.map((val) => (
                            <button
                              key={val}
                              style={{
                                ...s.optBtn,
                                background: comp.selectedOptions[optName] === val ? "#111" : "#f5f5f5",
                                color: comp.selectedOptions[optName] === val ? "#fff" : "#333",
                                borderColor: comp.selectedOptions[optName] === val ? "#111" : "#e0e0e0",
                              }}
                              onClick={() => updateOption(comp.localId, optName, val)}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Generate button */}
          {components.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button
                style={{ ...s.btn, width: "100%", fontSize: 15, padding: "13px 0" }}
                onClick={handleGenerate}
              >
                ⬇ Télécharger le CSV ({bundleProduct.variants.length} variantes × {components.length} composant{components.length > 1 ? "s" : ""})
              </button>
              {warnings.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#e67e22", padding: "3px 0" }}>⚠ {w}</div>
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
  compCard: { background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8, padding: "12px 14px", marginTop: 10 } as React.CSSProperties,
  qtyControl: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 } as React.CSSProperties,
  qtyBtn: { width: 26, height: 26, border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 15 } as React.CSSProperties,
  optBtn: { padding: "4px 12px", border: "1px solid", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500 } as React.CSSProperties,
};
