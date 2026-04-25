"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Supplier = { id: number; name: string };

type IceleaIngredient = {
  variantId: number;
  name: string;
  sku: string | null;
};

type ScannedItem = {
  localId: string;
  // Shopify product that was scanned
  productName: string;
  productSku: string | null;
  // Icelea material(s) from the recipe
  icelea: IceleaIngredient[];
  quantity: number;
  status: "loading" | "ok" | "error";
  error?: string;
};

type SubmitItem = {
  variantId: number;
  variantName: string;
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
          icelea: [],
          quantity: 1,
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
          productName?: string;
          productSku?: string | null;
          icelea?: IceleaIngredient[];
          error?: string;
        };

        if (!res.ok || !data.ok) throw new Error(data.error ?? "Introuvable");

        setItems((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  status: "ok",
                  productName: data.productName ?? barcode,
                  productSku: data.productSku ?? null,
                  icelea: data.icelea ?? [],
                }
              : item
          )
        );

        const iceleaNames = (data.icelea ?? []).map((i) => i.name).join(", ");
        setLastStatus(`✓ ${data.productName} → ${iceleaNames}`);
        playBeep();
      } catch (err) {
        setItems((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  status: "error",
                  error: err instanceof Error ? err.message : "Erreur",
                }
              : item
          )
        );
        setLastStatus(`✗ ${err instanceof Error ? err.message : "Erreur"}`);
      }
    },
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

  // Build consolidated PO items: group identical Icelea variants, sum quantities
  function buildPoItems(scannedItems: ScannedItem[]): SubmitItem[] {
    const map = new Map<number, SubmitItem>();
    for (const item of scannedItems) {
      if (item.status !== "ok") continue;
      for (const ing of item.icelea) {
        const existing = map.get(ing.variantId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          map.set(ing.variantId, {
            variantId: ing.variantId,
            variantName: ing.name,
            variantSku: ing.sku,
            quantity: item.quantity,
          });
        }
      }
    }
    return Array.from(map.values());
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

      const data = await res.json() as {
        ok?: boolean;
        poNumber?: string;
        error?: string;
      };

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
    setItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, quantity: qty } : i))
    );
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  const validItems = items.filter((i) => i.status === "ok" && i.icelea.length > 0);
  const poItems = buildPoItems(validItems);
  const totalQty = poItems.reduce((s, i) => s + i.quantity, 0);
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // ── CLOSED ────────────────────────────────────────────────────────────────
  if (phase === "closed") {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ margin: 0 }}>Bon de commande créé</h2>
          <p style={{ color: "#555", margin: "8px 0 0" }}>
            PO n° <strong>{closedPONumber}</strong> — {selectedSupplier?.name}
          </p>
          <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
            {poItems.length} référence(s) · {totalQty} pièce(s)
          </p>
          <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
            Email envoyé à philippe@yourmood.net
          </p>
          <button
            style={{ ...styles.btn, marginTop: 32 }}
            onClick={() => {
              setPhase("setup");
              setItems([]);
              setClosedPONumber(null);
            }}
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
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>📦 PO Icelea</div>
            <div style={{ color: "#555", fontSize: 13 }}>
              {selectedSupplier?.name} · {poItems.length} réf. · {totalQty} pce
            </div>
          </div>
          <button
            style={{
              ...styles.btn,
              background: poItems.length ? "#111" : "#ccc",
              cursor: poItems.length ? "pointer" : "not-allowed",
            }}
            disabled={!poItems.length || submitting}
            onClick={closePO}
          >
            {submitting ? "En cours…" : "Clore le PO"}
          </button>
        </div>

        <div style={styles.statusBar}>{buffer ? `> ${buffer}` : lastStatus}</div>

        {closedError && <div style={styles.errorBox}>{closedError}</div>}

        {items.length === 0 && (
          <div style={styles.empty}>Scannez les articles à commander</div>
        )}

        <div>
          {items.map((item) => (
            <div key={item.localId} style={styles.itemRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {item.status === "loading" && (
                  <div style={{ color: "#888", fontSize: 14 }}>
                    Recherche {item.productName}…
                  </div>
                )}
                {item.status === "error" && (
                  <div style={{ color: "#c62828", fontSize: 13 }}>
                    ✗ {item.productName}
                    <br />
                    <span style={{ fontStyle: "italic" }}>{item.error}</span>
                  </div>
                )}
                {item.status === "ok" && (
                  <>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      {item.productName}
                      {item.productSku ? ` · ${item.productSku}` : ""}
                    </div>
                    {item.icelea.map((ing) => (
                      <div key={ing.variantId} style={{ fontWeight: 600, fontSize: 14 }}>
                        → {ing.name}
                        {ing.sku ? (
                          <span style={{ fontWeight: 400, color: "#888" }}> · {ing.sku}</span>
                        ) : null}
                      </div>
                    ))}
                  </>
                )}
              </div>

              {item.status === "ok" && item.icelea.length > 0 && (
                <div style={styles.qtyControl}>
                  <button
                    style={styles.qtyBtn}
                    onClick={() => updateQuantity(item.localId, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 24, textAlign: "center" }}>
                    {item.quantity}
                  </span>
                  <button
                    style={styles.qtyBtn}
                    onClick={() => updateQuantity(item.localId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              )}

              <button style={styles.removeBtn} onClick={() => removeItem(item.localId)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <div style={styles.title}>📦 Nouvel ordre d&apos;achat Icelea</div>

      <div style={{ marginTop: 32 }}>
        <label style={styles.label}>Fournisseur</label>
        {suppliersLoading ? (
          <div style={{ color: "#888", fontSize: 14 }}>Chargement…</div>
        ) : (
          <select
            style={styles.select}
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
          >
            <option value="">— Sélectionner —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        style={{
          ...styles.btn,
          marginTop: 32,
          width: "100%",
          background: selectedSupplierId ? "#111" : "#ccc",
          cursor: selectedSupplierId ? "pointer" : "not-allowed",
          fontSize: 17,
          padding: "14px 0",
        }}
        disabled={!selectedSupplierId}
        onClick={startScanning}
      >
        Créer un PO et scanner
      </button>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "sans-serif",
    maxWidth: 520,
    margin: "0 auto",
    padding: "24px 16px",
    color: "#111",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  } as React.CSSProperties,
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  } as React.CSSProperties,
  statusBar: {
    background: "#f5f5f5",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 14,
    color: "#333",
    marginBottom: 16,
    minHeight: 40,
  } as React.CSSProperties,
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 13,
    color: "#c62828",
    marginBottom: 16,
  } as React.CSSProperties,
  empty: {
    textAlign: "center" as const,
    color: "#aaa",
    fontSize: 15,
    padding: "40px 0",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #f0f0f0",
  } as React.CSSProperties,
  qtyControl: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 15,
    flexShrink: 0,
  } as React.CSSProperties,
  qtyBtn: {
    width: 28,
    height: 28,
    border: "1px solid #ddd",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 16,
  } as React.CSSProperties,
  removeBtn: {
    background: "none",
    border: "none",
    color: "#aaa",
    cursor: "pointer",
    fontSize: 14,
    padding: "4px 6px",
    flexShrink: 0,
  } as React.CSSProperties,
  btn: {
    padding: "10px 20px",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    cursor: "pointer",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
  } as React.CSSProperties,
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 15,
    background: "#fff",
  } as React.CSSProperties,
};
