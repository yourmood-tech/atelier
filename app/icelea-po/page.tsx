"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Supplier = { id: number; name: string };

type IceleaIngredient = {
  variantId: number;
  name: string;
  sku: string | null;
};

type ScannedVariant = { title: string; sku: string };

type ScannedItem = {
  localId: string;
  productName: string;
  productSku: string | null;
  // Available sizes (when scanned as product_id)
  variants: ScannedVariant[];
  // Resolved Icelea ingredient(s)
  icelea: IceleaIngredient[];
  quantity: number;
  pricePerUnit: number;
  status: "loading" | "selecting_size" | "resolving" | "ok" | "error";
  error?: string;
};

type SubmitItem = {
  variantId: number;
  variantName: string;
  pricePerUnit: number;
  variantSku: string | null;
  quantity: number;
};

type Phase = "setup" | "scanning" | "closed";

export default function IceleaPOPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | "">("");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [buffer, setBuffer] = useState("");
  const [lastStatus, setLastStatus] = useState("Prêt — scannez un article");
  const [submitting, setSubmitting] = useState(false);
  const [closedPONumber, setClosedPONumber] = useState<string | null>(null);
  const [closedError, setClosedError] = useState<string | null>(null);

  const lastAcceptedRef = useRef<{ barcode: string; ts: number } | null>(null);
  const scanHandlerRef = useRef<(barcode: string) => void>(() => {});

  useEffect(() => {
    fetch("/api/icelea-po/suppliers")
      .then((r) => r.json())
      .then((data: { suppliers?: Supplier[] }) => {
        const list = data.suppliers ?? [];
        setSuppliers(list);
        const icelea = list.find((s) => s.name.toLowerCase().includes("icelea"));
        if (icelea) setSelectedSupplierId(icelea.id);
      })
      .catch(() => {})
      .finally(() => setSuppliersLoading(false));
  }, []);

  // Resolve SKU → Icelea ingredient and update an item
  async function resolveSize(localId: string, sku: string, sizeTitle: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.localId === localId ? { ...i, status: "resolving", productSku: sku } : i
      )
    );
    setLastStatus(`Résolution ${sizeTitle}…`);

    try {
      const res = await fetch("/api/icelea-po/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const data = await res.json() as {
        ok?: boolean;
        icelea?: IceleaIngredient[];
        error?: string;
      };

      if (!res.ok || !data.ok) throw new Error(data.error ?? "Introuvable");

      setItems((prev) =>
        prev.map((i) =>
          i.localId === localId
            ? { ...i, status: "ok", icelea: data.icelea ?? [] }
            : i
        )
      );
      const names = (data.icelea ?? []).map((x) => x.name).join(", ");
      setLastStatus(`✓ Taille ${sizeTitle} → ${names}`);
      playBeep();
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.localId === localId
            ? { ...i, status: "error", error: err instanceof Error ? err.message : "Erreur" }
            : i
        )
      );
      setLastStatus(`✗ ${err instanceof Error ? err.message : "Erreur"}`);
    }
  }

  const handleBarcode = useCallback(
    async (barcode: string) => {
      if (phase !== "scanning") return;

      const now = Date.now();
      const last = lastAcceptedRef.current;
      if (last && last.barcode === barcode && now - last.ts < 200) return;
      lastAcceptedRef.current = { barcode, ts: now };

      const localId = crypto.randomUUID();
      setLastStatus(`Recherche ${barcode}…`);

      setItems((prev) => [
        {
          localId,
          productName: barcode,
          productSku: null,
          variants: [],
          icelea: [],
          quantity: 1,
          pricePerUnit: 0,
          status: "loading",
        },
        ...prev,
      ]);

      try {
        const res = await fetch("/api/icelea-po/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode }),
        });
        const data = await res.json() as {
          ok?: boolean;
          type?: "product" | "variant";
          productName?: string;
          variants?: ScannedVariant[];
          // variant direct
          variantTitle?: string;
          sku?: string;
          error?: string;
        };

        if (!res.ok || !data.ok) throw new Error(data.error ?? "Introuvable");

        if (data.type === "product") {
          // Multiple sizes → ask Philippe to pick one
          setItems((prev) =>
            prev.map((i) =>
              i.localId === localId
                ? {
                    ...i,
                    status: "selecting_size",
                    productName: data.productName ?? barcode,
                    variants: data.variants ?? [],
                  }
                : i
            )
          );
          setLastStatus(`${data.productName} — sélectionnez la taille`);
        } else if (data.type === "variant" && data.sku) {
          // Single variant resolved directly
          setItems((prev) =>
            prev.map((i) =>
              i.localId === localId
                ? {
                    ...i,
                    productName: data.productName ?? barcode,
                    productSku: data.sku ?? null,
                    variants: [],
                  }
                : i
            )
          );
          await resolveSize(localId, data.sku, data.variantTitle ?? "");
        }
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.localId === localId
              ? { ...i, status: "error", error: err instanceof Error ? err.message : "Erreur" }
              : i
          )
        );
        setLastStatus(`✗ ${err instanceof Error ? err.message : "Erreur"}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase]
  );

  useEffect(() => {
    scanHandlerRef.current = handleBarcode;
  });

  useEffect(() => {
    if (phase !== "scanning") return;
    const buf = { value: "" };
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Enter") {
        if (buf.value) {
          e.preventDefault();
          const val = buf.value;
          buf.value = "";
          setBuffer("");
          void scanHandlerRef.current(val);
        }
      } else if (e.key === "Backspace") {
        buf.value = buf.value.slice(0, -1);
        setBuffer(buf.value);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buf.value += e.key;
        setBuffer(buf.value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  function playBeep() {
    try {
      const ctx = new window.AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  function startScanning() {
    if (!selectedSupplierId) return;
    setItems([]);
    setLastStatus("Prêt — scannez un article");
    setBuffer("");
    setPhase("scanning");
  }

  function buildPoItems(scannedItems: ScannedItem[]): SubmitItem[] {
    const map = new Map<number, SubmitItem>();
    for (const item of scannedItems) {
      if (item.status !== "ok") continue;
      for (const ing of item.icelea) {
        const existing = map.get(ing.variantId);
        if (existing) {
          existing.quantity += item.quantity;
          // Keep price of first occurrence (same ingredient = same price)
        } else {
          map.set(ing.variantId, {
            variantId: ing.variantId,
            variantName: ing.name,
            variantSku: ing.sku,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
          });
        }
      }
    }
    return Array.from(map.values());
  }

  function updatePrice(localId: string, price: number) {
    setItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, pricePerUnit: price } : i))
    );
  }

  async function closePO() {
    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) return;
    const poItems = buildPoItems(items);
    if (!poItems.length) return;
    setSubmitting(true);
    setClosedError(null);
    try {
      const res = await fetch("/api/icelea-po/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplier.id,
          supplierName: supplier.name,
          items: poItems,
        }),
      });
      const data = await res.json() as { ok?: boolean; poNumber?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Erreur création PO");
      setClosedPONumber(data.poNumber ?? "—");
      setPhase("closed");
    } catch (err) {
      setClosedError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function updateQuantity(localId: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, quantity: qty } : i)));
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  const poItems = buildPoItems(items);
  const totalQty = poItems.reduce((s, i) => s + i.quantity, 0);
  const totalCost = poItems.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const hasPending = items.some((i) => i.status === "selecting_size" || i.status === "resolving");

  // ── CLOSED ────────────────────────────────────────────────────────────────
  if (phase === "closed") {
    return (
      <div style={s.container}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ margin: 0 }}>Bon de commande créé</h2>
          <p style={{ color: "#555", margin: "8px 0 0" }}>
            PO n° <strong>{closedPONumber}</strong> — {selectedSupplier?.name}
          </p>
          <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
            {poItems.length} référence(s) · {totalQty} pièce(s) · CHF {totalCost.toFixed(2)}
          </p>
          <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>Email envoyé à philippe@yourmood.net</p>
          <button
            style={{ ...s.btn, marginTop: 32 }}
            onClick={() => { setPhase("setup"); setItems([]); setClosedPONumber(null); }}
          >
            Nouveau PO
          </button>
        </div>
      </div>
    );
  }

  // ── SCANNING ──────────────────────────────────────────────────────────────
  if (phase === "scanning") {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <div>
            <div style={s.title}>📦 PO Icelea</div>
            <div style={{ color: "#555", fontSize: 13 }}>
              {selectedSupplier?.name} · {poItems.length} réf. · {totalQty} pce · CHF {totalCost.toFixed(2)}
            </div>
          </div>
          <button
            style={{ ...s.btn, background: (poItems.length && !hasPending) ? "#111" : "#ccc", cursor: (poItems.length && !hasPending) ? "pointer" : "not-allowed" }}
            disabled={!poItems.length || hasPending || submitting}
            onClick={closePO}
          >
            {submitting ? "En cours…" : "Clore le PO"}
          </button>
        </div>

        <div style={s.statusBar}>{buffer ? `> ${buffer}` : lastStatus}</div>
        {closedError && <div style={s.errorBox}>{closedError}</div>}
        {items.length === 0 && <div style={s.empty}>Scannez les articles à commander</div>}

        <div>
          {items.map((item) => (
            <div key={item.localId} style={s.itemRow}>
              <div style={{ flex: 1, minWidth: 0 }}>

                {item.status === "loading" && (
                  <div style={{ color: "#888", fontSize: 14 }}>Recherche…</div>
                )}

                {item.status === "error" && (
                  <div style={{ color: "#c62828", fontSize: 13 }}>
                    <strong>{item.productName}</strong>
                    <br />
                    <span style={{ fontStyle: "italic" }}>{item.error}</span>
                  </div>
                )}

                {item.status === "selecting_size" && (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                      {item.productName}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {item.variants.map((v) => (
                        <button
                          key={v.sku}
                          style={s.sizeBtn}
                          onClick={() => resolveSize(item.localId, v.sku, v.title)}
                        >
                          {v.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {item.status === "resolving" && (
                  <div style={{ color: "#888", fontSize: 14 }}>
                    {item.productName} · {item.productSku} — résolution…
                  </div>
                )}

                {item.status === "ok" && (
                  <>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      {item.productName}{item.productSku ? ` · ${item.productSku}` : ""}
                    </div>
                    {item.icelea.map((ing) => (
                      <div key={ing.variantId} style={{ fontWeight: 600, fontSize: 14 }}>
                        → {ing.name}
                        {ing.sku && <span style={{ fontWeight: 400, color: "#888" }}> · {ing.sku}</span>}
                      </div>
                    ))}
                  </>
                )}

              </div>

              {item.status === "ok" && item.icelea.length > 0 && (
                <>
                  <div style={s.qtyControl}>
                    <button style={s.qtyBtn} onClick={() => updateQuantity(item.localId, item.quantity - 1)}>−</button>
                    <span style={{ minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                    <button style={s.qtyBtn} onClick={() => updateQuantity(item.localId, item.quantity + 1)}>+</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: "#888" }}>CHF</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.pricePerUnit || ""}
                      placeholder="0.00"
                      onChange={(e) => updatePrice(item.localId, parseFloat(e.target.value) || 0)}
                      style={s.priceInput}
                    />
                  </div>
                </>
              )}

              <button style={s.removeBtn} onClick={() => removeItem(item.localId)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.container}>
      <div style={s.title}>📦 Nouvel ordre d&apos;achat Icelea</div>
      <div style={{ marginTop: 32 }}>
        <label style={s.label}>Fournisseur</label>
        {suppliersLoading ? (
          <div style={{ color: "#888", fontSize: 14 }}>Chargement…</div>
        ) : (
          <select
            style={s.select}
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
          >
            <option value="">— Sélectionner —</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>{sup.name}</option>
            ))}
          </select>
        )}
      </div>
      <button
        style={{ ...s.btn, marginTop: 32, width: "100%", background: selectedSupplierId ? "#111" : "#ccc", cursor: selectedSupplierId ? "pointer" : "not-allowed", fontSize: 17, padding: "14px 0" }}
        disabled={!selectedSupplierId}
        onClick={startScanning}
      >
        Créer un PO et scanner
      </button>
    </div>
  );
}

const s = {
  container: { fontFamily: "sans-serif", maxWidth: 520, margin: "0 auto", padding: "24px 16px", color: "#111" } as React.CSSProperties,
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 } as React.CSSProperties,
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 } as React.CSSProperties,
  statusBar: { background: "#f5f5f5", borderRadius: 6, padding: "10px 14px", fontSize: 14, color: "#333", marginBottom: 16, minHeight: 40 } as React.CSSProperties,
  errorBox: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 16 } as React.CSSProperties,
  empty: { textAlign: "center" as const, color: "#aaa", fontSize: 15, padding: "40px 0" },
  itemRow: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #f0f0f0" } as React.CSSProperties,
  sizeBtn: { padding: "6px 14px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600 } as React.CSSProperties,
  qtyControl: { display: "flex", alignItems: "center", gap: 6, fontSize: 15, flexShrink: 0 } as React.CSSProperties,
  qtyBtn: { width: 28, height: 28, border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 16 } as React.CSSProperties,
  priceInput: { width: 68, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, textAlign: "right" as const },
  removeBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, padding: "4px 6px", flexShrink: 0 } as React.CSSProperties,
  btn: { padding: "10px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer" } as React.CSSProperties,
  label: { display: "block", fontSize: 13, color: "#555", marginBottom: 6 } as React.CSSProperties,
  select: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 15, background: "#fff" } as React.CSSProperties,
};
