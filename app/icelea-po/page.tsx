"use client";

import { useEffect, useRef, useState } from "react";

type Supplier = { id: number; name: string };

type IceleaIngredient = {
  variantId: number;
  name: string;
  sku: string | null;
  purchasePrice: number;
};

type ScannedVariant = { title: string; sku: string };

type ScannedItem = {
  localId: string;
  productId: number | null;     // Shopify product ID — for OOS email
  linkedOrderId: number | null; // Shopify order this item was scanned for
  productName: string;
  productSku: string | null;
  variants: ScannedVariant[];
  icelea: IceleaIngredient[];
  excludedVariantIds: number[];
  quantity: number;
  status: "loading" | "selecting_size" | "resolving" | "ok" | "error";
  error?: string;
  selectedSize?: string; // set when size chosen but multiple variants remain (color sub-selection)
};

const SIZES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];

function variantsForSize(variants: ScannedVariant[], size: number): ScannedVariant[] {
  const sizeStr = String(size);
  return variants.filter(v => v.title.split(/[\s\/\-]+/).some(p => p === sizeStr));
}

type SubmitItem = {
  variantId: number;
  variantName: string;
  pricePerUnit: number;
  variantSku: string | null;
  quantity: number;
};

type LinkedOrder = { id: number; name: string };

type Phase = "setup" | "scanning" | "closed";

export default function IceleaPOPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | "">("");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [buffer, setBuffer] = useState("");
  const [lastStatus, setLastStatus] = useState("Scannez une commande client");
  const [submitting, setSubmitting] = useState(false);
  const [closedPONumber, setClosedPONumber] = useState<string | null>(null);
  const [closedDeliveryDate, setClosedDeliveryDate] = useState<string | null>(null);
  const [closedError, setClosedError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState<number | null>(null);
  const [expectedArrival, setExpectedArrival] = useState<string>("");

  // Manual ingredient lookup by SKU
  type IngSearchState = { localId: string; sku: string; result: IceleaIngredient | null; error: string | null; loading: boolean };
  const [ingSearch, setIngSearch] = useState<IngSearchState | null>(null);

  // Manual order number entry
  const [manualOrder, setManualOrder] = useState("");

  // Multi-order linking
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [currentOrderName, setCurrentOrderName] = useState<string | null>(null);
  const [linkedOrders, setLinkedOrders] = useState<LinkedOrder[]>([]);
  const [closedLinkedOrders, setClosedLinkedOrders] = useState<LinkedOrder[]>([]);

  // Refs for event handlers (avoid stale closures)
  const currentOrderRef = useRef<LinkedOrder | null>(null);
  const lastAcceptedRef = useRef<{ barcode: string; ts: number } | null>(null);
  const scanHandlerRef = useRef<(barcode: string) => void>(() => {});
  const tabHandlerRef = useRef<() => void>(() => {});

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

  function setCurrentOrder(order: LinkedOrder | null) {
    currentOrderRef.current = order;
    setCurrentOrderId(order?.id ?? null);
    setCurrentOrderName(order?.name ?? null);
  }

  function playBeep(freq = 880) {
    try {
      const ctx = new window.AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

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
      const data = await res.json() as { ok?: boolean; icelea?: IceleaIngredient[]; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Introuvable");

      setItems((prev) =>
        prev.map((i) =>
          i.localId === localId
            ? { ...i, status: "ok", icelea: (data.icelea ?? []).map((x) => ({ ...x, purchasePrice: x.purchasePrice ?? 0 })), excludedVariantIds: [] }
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

  function handleSizeSelect(localId: string, productName: string, size: number, allVariants: ScannedVariant[]) {
    const matches = variantsForSize(allVariants, size);
    if (matches.length === 0) {
      setItems(prev => prev.map(i => i.localId === localId
        ? { ...i, status: "error", error: `Taille ${size} introuvable dans ce produit` }
        : i
      ));
      setLastStatus(`✗ Taille ${size} introuvable pour ${productName}`);
      return;
    }
    if (matches.length === 1) {
      void resolveSize(localId, matches[0].sku, matches[0].title);
      return;
    }
    // Multiple variants for this size (color variants) — show sub-selection
    setItems(prev => prev.map(i => i.localId === localId
      ? { ...i, selectedSize: String(size) }
      : i
    ));
    setLastStatus(`Taille ${size} — sélectionnez la couleur`);
  }

  // Keep scan handler refs fresh every render — avoids stale closures
  useEffect(() => {
    tabHandlerRef.current = () => {
      if (currentOrderRef.current !== null) {
        setCurrentOrder(null);
        setLastStatus("Commande suivante — scannez une commande client");
      }
    };

    scanHandlerRef.current = async (barcode: string) => {
      if (phase !== "scanning") return;

      const now = Date.now();
      const last = lastAcceptedRef.current;
      if (last && last.barcode === barcode && now - last.ts < 200) return;
      lastAcceptedRef.current = { barcode, ts: now };

      if (currentOrderRef.current === null) {
        // ── ORDER SCAN MODE ──────────────────────────────────────────
        setLastStatus(`Recherche commande ${barcode}…`);
        try {
          const res = await fetch(`/api/icelea-po/order?id=${encodeURIComponent(barcode)}`);
          const data = await res.json() as { ok?: boolean; orderId?: number; orderName?: string; error?: string };
          if (!res.ok || !data.ok) throw new Error(data.error ?? "Commande introuvable");
          const order: LinkedOrder = { id: data.orderId!, name: data.orderName! };
          setCurrentOrder(order);
          setLinkedOrders((prev) => prev.some((o) => o.id === order.id) ? prev : [...prev, order]);
          setLastStatus(`✓ ${order.name} — scannez les articles`);
          playBeep();
        } catch (err) {
          setLastStatus(`✗ ${err instanceof Error ? err.message : "Commande introuvable"}`);
          playBeep(300);
        }
      } else {
        // ── PRODUCT SCAN MODE ────────────────────────────────────────
        const localId = crypto.randomUUID();
        setLastStatus(`Recherche ${barcode}…`);

        setItems((prev) => [
          { localId, productId: null, linkedOrderId: currentOrderRef.current?.id ?? null, productName: barcode, productSku: null, variants: [], icelea: [], excludedVariantIds: [], quantity: 1, status: "loading" },
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
            productId?: number;
            productName?: string;
            variants?: ScannedVariant[];
            variantTitle?: string;
            sku?: string;
            error?: string;
          };

          if (!res.ok || !data.ok) throw new Error(data.error ?? "Introuvable");

          if (data.type === "product") {
            setItems((prev) =>
              prev.map((i) =>
                i.localId === localId
                  ? { ...i, status: "selecting_size", productId: data.productId ?? null, productName: data.productName ?? barcode, variants: data.variants ?? [] }
                  : i
              )
            );
            setLastStatus(`${data.productName} — sélectionnez la taille`);
          } else if (data.type === "variant" && data.sku) {
            setItems((prev) =>
              prev.map((i) =>
                i.localId === localId
                  ? { ...i, productId: data.productId ?? null, productName: data.productName ?? barcode, productSku: data.sku ?? null, variants: [] }
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
      }
    };
  });

  // Keyboard listener — active only in scanning phase
  useEffect(() => {
    if (phase !== "scanning") return;
    const buf = { value: "" };
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Tab") {
        e.preventDefault();
        buf.value = "";
        setBuffer("");
        tabHandlerRef.current();
        return;
      }
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

  function startScanning() {
    if (!selectedSupplierId) return;
    setItems([]);
    setLinkedOrders([]);
    setCurrentOrder(null);
    setLastStatus("Scannez une commande client");
    setBuffer("");
    setManualOrder("");
    setPhase("scanning");
  }

  function buildPoItems(scannedItems: ScannedItem[]): SubmitItem[] {
    const map = new Map<number, SubmitItem>();
    for (const item of scannedItems) {
      if (item.status !== "ok") continue;
      for (const ing of item.icelea.filter((ing) => !item.excludedVariantIds.includes(ing.variantId))) {
        const existing = map.get(ing.variantId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          map.set(ing.variantId, {
            variantId: ing.variantId,
            variantName: ing.name,
            variantSku: ing.sku,
            quantity: item.quantity,
            pricePerUnit: ing.purchasePrice,
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
      // Build deduped (orderId, productId) pairs for OOS emails
      const seen = new Set<string>();
      const scannedPairs = items
        .filter(i =>
          i.status === "ok" &&
          i.linkedOrderId !== null &&
          i.productId !== null &&
          i.icelea.filter(x => !i.excludedVariantIds.includes(x.variantId)).length > 0
        )
        .flatMap(i => {
          const key = `${i.linkedOrderId}-${i.productId}`;
          if (seen.has(key)) return [];
          seen.add(key);
          return [{ orderId: i.linkedOrderId!, productId: i.productId!, productName: i.productName }];
        });

      const res = await fetch("/api/icelea-po/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplier.id,
          supplierName: supplier.name,
          items: poItems,
          shopifyOrderIds: linkedOrders.map((o) => o.id),
          scannedPairs,
          expectedArrival: expectedArrival || null,
        }),
      });
      const data = await res.json() as { ok?: boolean; poNumber?: string; deliveryDate?: string | null; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Erreur création PO");
      setClosedPONumber(data.poNumber ?? "—");
      setClosedDeliveryDate(data.deliveryDate ?? null);
      setResendDone(null);
      setClosedLinkedOrders(linkedOrders);
      setPhase("closed");
    } catch (err) {
      setClosedError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setPhase("setup");
    setItems([]);
    setClosedPONumber(null);
    setCurrentOrder(null);
    setLinkedOrders([]);
    setClosedLinkedOrders([]);
    setClosedError(null);
  }

  function updateQuantity(localId: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, quantity: qty } : i)));
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  function toggleIngredient(localId: string, variantId: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.localId !== localId) return i;
        const excluded = i.excludedVariantIds.includes(variantId)
          ? i.excludedVariantIds.filter((id) => id !== variantId)
          : [...i.excludedVariantIds, variantId];
        return { ...i, excludedVariantIds: excluded };
      })
    );
  }

  function openIngSearch(localId: string) {
    setIngSearch({ localId, sku: "", result: null, error: null, loading: false });
  }

  function closeIngSearch() {
    setIngSearch(null);
  }

  async function lookupIngSku(localId: string, sku: string) {
    if (!sku.trim()) return;
    setIngSearch((prev) => prev ? { ...prev, loading: true, result: null, error: null } : null);
    try {
      const res = await fetch(`/api/icelea-po/search-ingredient?sku=${encodeURIComponent(sku.trim())}`);
      const data = await res.json() as { ok?: boolean; result?: IceleaIngredient; error?: string };
      if (!res.ok || !data.ok) {
        setIngSearch((prev) => prev ? { ...prev, loading: false, error: data.error ?? "Introuvable" } : null);
      } else {
        setIngSearch((prev) => prev ? { ...prev, loading: false, result: data.result ?? null } : null);
      }
    } catch {
      setIngSearch((prev) => prev ? { ...prev, loading: false, error: "Erreur réseau" } : null);
    }
  }

  function addManualIngredient(localId: string, ing: IceleaIngredient) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.localId !== localId) return i;
        if (i.icelea.some((x) => x.variantId === ing.variantId)) return i;
        return {
          ...i,
          icelea: [...i.icelea, ing],
          // Recover error items — they become valid once they have at least one ingredient
          status: i.status === "error" ? "ok" : i.status,
          error: i.status === "error" ? undefined : i.error,
        };
      })
    );
    closeIngSearch();
  }

  const poItems = buildPoItems(items);
  const totalQty = poItems.reduce((s, i) => s + i.quantity, 0);
  const totalCost = poItems.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const hasPending = items.some((i) => i.status === "selecting_size" || i.status === "resolving");
  const inProductMode = currentOrderId !== null;

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
          {closedLinkedOrders.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: "#2e7d32", fontSize: 13, margin: "0 0 6px" }}>
                ✓ Tags ajoutés sur {closedLinkedOrders.length} commande(s) :
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                {closedLinkedOrders.map((o) => (
                  <span key={o.id} style={s.chip}>{o.name}</span>
                ))}
              </div>
            </div>
          )}
          <p style={{ color: "#888", fontSize: 13, marginTop: 12 }}>Email envoyé à philippe@yourmood.net</p>

          {resendDone === null ? (
            <button
              style={{ ...s.btn, marginTop: 20, background: "#555" }}
              disabled={resending}
              onClick={async () => {
                if (!closedPONumber) return;
                setResending(true);
                try {
                  const res = await fetch("/api/icelea-po/resend", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      poNumber: closedPONumber,
                      supplierName: selectedSupplier?.name ?? "",
                      deliveryDate: closedDeliveryDate,
                    }),
                  });
                  const data = await res.json() as { ok?: boolean; queued?: number; error?: string };
                  if (!res.ok || !data.ok) throw new Error(data.error ?? "Erreur");
                  setResendDone(data.queued ?? 0);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Erreur renvoi");
                } finally {
                  setResending(false);
                }
              }}
            >
              {resending ? "Envoi en cours…" : "Renvoyer les emails clients"}
            </button>
          ) : (
            <p style={{ color: "#2e7d32", fontSize: 13, marginTop: 16 }}>
              ✓ {resendDone} paire(s) en cours d'envoi
            </p>
          )}

          <button style={{ ...s.btn, marginTop: 16 }} onClick={resetAll}>
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
          <div style={{ minWidth: 0 }}>
            <div style={s.title}>📦 PO Icelea</div>
            <div style={{ color: "#555", fontSize: 13 }}>
              {selectedSupplier?.name} · {poItems.length} réf. · {totalQty} pce · CHF {totalCost.toFixed(2)}
            </div>
          </div>
          <button
            style={{ ...s.btn, background: (poItems.length && !hasPending) ? "#111" : "#ccc", cursor: (poItems.length && !hasPending) ? "pointer" : "not-allowed", flexShrink: 0 }}
            disabled={!poItems.length || hasPending || submitting}
            onClick={closePO}
          >
            {submitting ? "En cours…" : "Clore le PO"}
          </button>
        </div>

        {/* Mode banner */}
        <div style={{
          ...s.modeBanner,
          background: inProductMode ? "#e8f5e9" : "#fff8e1",
          borderColor: inProductMode ? "#a5d6a7" : "#ffe082",
          color: inProductMode ? "#2e7d32" : "#856404",
        }}>
          {inProductMode
            ? `📋 ${currentOrderName} — scannez les articles`
            : "📋 Scannez une commande client"}
          {inProductMode && (
            <span style={{ float: "right", fontSize: 11, opacity: 0.7 }}>Tab = commande suivante</span>
          )}
        </div>

        {/* Linked orders chips */}
        {linkedOrders.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {linkedOrders.map((o) => (
              <span key={o.id} style={{ ...s.chip, background: o.id === currentOrderId ? "#111" : "#eee", color: o.id === currentOrderId ? "#fff" : "#555" }}>
                {o.name}
              </span>
            ))}
          </div>
        )}

        {!inProductMode && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Taper le n° de commande manuellement"
              value={manualOrder}
              onChange={(e) => setManualOrder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualOrder.trim()) {
                  e.preventDefault();
                  const val = manualOrder.trim();
                  setManualOrder("");
                  void scanHandlerRef.current(val);
                }
              }}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, outline: "none" }}
            />
            <button
              onClick={() => {
                const val = manualOrder.trim();
                if (!val) return;
                setManualOrder("");
                void scanHandlerRef.current(val);
              }}
              disabled={!manualOrder.trim()}
              style={{ padding: "8px 16px", background: manualOrder.trim() ? "#111" : "#ccc", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: manualOrder.trim() ? "pointer" : "not-allowed" }}
            >
              →
            </button>
          </div>
        )}
        <div style={s.statusBar}>{buffer ? `> ${buffer}` : lastStatus}</div>
        {closedError && <div style={s.errorBox}>{closedError}</div>}
        {items.length === 0 && <div style={s.empty}>Scannez une commande client puis les articles</div>}

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
                    {!item.selectedSize ? (
                      // Step 1 — taille
                      <>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Taille</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {SIZES.map((size) => {
                            const available = variantsForSize(item.variants, size).length > 0;
                            return (
                              <button
                                key={size}
                                style={{ ...s.sizeBtn, opacity: available ? 1 : 0.25, cursor: available ? "pointer" : "default" }}
                                disabled={!available}
                                onClick={() => handleSizeSelect(item.localId, item.productName, size, item.variants)}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      // Step 2 — couleur/variant (taille déjà choisie, plusieurs options)
                      <>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
                          Taille {item.selectedSize} — couleur
                          <button
                            style={{ marginLeft: 8, fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                            onClick={() => setItems(prev => prev.map(i => i.localId === item.localId ? { ...i, selectedSize: undefined } : i))}
                          >
                            ← retour
                          </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {variantsForSize(item.variants, Number(item.selectedSize)).map((v) => (
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
                  </>
                )}

                {item.status === "resolving" && (
                  <div style={{ color: "#888", fontSize: 14 }}>
                    {item.productName} · {item.productSku} — résolution…
                  </div>
                )}

                {item.status === "ok" && (
                  <>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                      {item.productName}{item.productSku ? ` · ${item.productSku}` : ""}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {item.icelea.map((ing) => {
                        const excluded = item.excludedVariantIds.includes(ing.variantId);
                        return (
                          <button
                            key={ing.variantId}
                            onClick={() => toggleIngredient(item.localId, ing.variantId)}
                            style={{
                              padding: "5px 12px",
                              border: `1px solid ${excluded ? "#ddd" : "#111"}`,
                              borderRadius: 20,
                              background: excluded ? "#f5f5f5" : "#111",
                              color: excluded ? "#bbb" : "#fff",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                              textDecoration: excluded ? "line-through" : "none",
                              transition: "all 0.15s",
                            }}
                          >
                            {ing.name}{ing.sku ? <span style={{ fontWeight: 400, opacity: 0.7 }}> · {ing.sku}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* + ingrédient button + search panel — available for ok and error states */}
                {(item.status === "ok" || item.status === "error") && (
                  <div style={{ marginTop: item.status === "ok" ? 6 : 8 }}>
                    {ingSearch?.localId !== item.localId && (
                      <button
                        onClick={() => openIngSearch(item.localId)}
                        style={{ padding: "4px 10px", border: "1px dashed #bbb", borderRadius: 20, background: "none", color: "#888", fontSize: 12, cursor: "pointer" }}
                      >
                        + ingrédient
                      </button>
                    )}
                    {ingSearch?.localId === item.localId && (
                      <div style={{ background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                          <input
                            autoFocus
                            type="text"
                            placeholder="SKU Icelea (ex: AUR-TITAN-52)"
                            value={ingSearch.sku}
                            onChange={(e) => setIngSearch((prev) => prev ? { ...prev, sku: e.target.value, result: null, error: null } : null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); void lookupIngSku(item.localId, ingSearch.sku); }
                              if (e.key === "Escape") closeIngSearch();
                            }}
                            style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none" }}
                          />
                          <button
                            onClick={() => void lookupIngSku(item.localId, ingSearch.sku)}
                            disabled={ingSearch.loading || !ingSearch.sku.trim()}
                            style={{ padding: "6px 12px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", opacity: ingSearch.loading || !ingSearch.sku.trim() ? 0.4 : 1 }}
                          >
                            {ingSearch.loading ? "…" : "OK"}
                          </button>
                          <button onClick={closeIngSearch} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                        </div>
                        {ingSearch.error && <div style={{ fontSize: 12, color: "#c62828" }}>{ingSearch.error}</div>}
                        {ingSearch.result && (
                          <button
                            onClick={() => addManualIngredient(item.localId, ingSearch.result!)}
                            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px", background: "#fff", border: "1px solid #111", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                          >
                            <span style={{ fontWeight: 600, flex: 1 }}>{ingSearch.result.name}</span>
                            {ingSearch.result.sku && <span style={{ color: "#888" }}>{ingSearch.result.sku}</span>}
                            <span style={{ color: "#555" }}>CHF {ingSearch.result.purchasePrice.toFixed(2)}</span>
                            <span style={{ color: "#2e7d32", fontWeight: 600 }}>+ Ajouter</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {item.status === "ok" && item.icelea.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: "#888", flexShrink: 0, textAlign: "right" as const }}>
                    CHF {item.icelea.filter((ing) => !item.excludedVariantIds.includes(ing.variantId)).reduce((s, ing) => s + ing.purchasePrice, 0).toFixed(2)}<br />
                    <span style={{ fontSize: 11 }}>/ pièce</span>
                  </div>
                  <div style={s.qtyControl}>
                    <button style={s.qtyBtn} onClick={() => updateQuantity(item.localId, item.quantity - 1)}>−</button>
                    <span style={{ minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                    <button style={s.qtyBtn} onClick={() => updateQuantity(item.localId, item.quantity + 1)}>+</button>
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
      <div style={{ marginTop: 24 }}>
        <label style={s.label}>Date d&apos;arrivée estimée (optionnel)</label>
        <input
          type="date"
          style={{ ...s.select, width: "auto", minWidth: 160 }}
          value={expectedArrival}
          onChange={(e) => setExpectedArrival(e.target.value)}
        />
        {expectedArrival && (
          <button
            style={{ marginLeft: 8, fontSize: 12, color: "#888", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
            onClick={() => setExpectedArrival("")}
          >
            Effacer
          </button>
        )}
      </div>
      <div style={{ color: "#888", fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
        Flux : scanner la commande client → scanner les articles → Tab pour la commande suivante → Clore le PO
      </div>
      <button
        style={{ ...s.btn, marginTop: 16, width: "100%", background: selectedSupplierId ? "#111" : "#ccc", cursor: selectedSupplierId ? "pointer" : "not-allowed", fontSize: 17, padding: "14px 0" }}
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 } as React.CSSProperties,
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 } as React.CSSProperties,
  modeBanner: { border: "1px solid", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 500, marginBottom: 10 } as React.CSSProperties,
  statusBar: { background: "#f5f5f5", borderRadius: 6, padding: "10px 14px", fontSize: 14, color: "#333", marginBottom: 12, minHeight: 40 } as React.CSSProperties,
  errorBox: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 12 } as React.CSSProperties,
  empty: { textAlign: "center" as const, color: "#aaa", fontSize: 15, padding: "40px 0" },
  itemRow: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #f0f0f0" } as React.CSSProperties,
  sizeBtn: { padding: "6px 14px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600 } as React.CSSProperties,
  qtyControl: { display: "flex", alignItems: "center", gap: 6, fontSize: 15, flexShrink: 0 } as React.CSSProperties,
  qtyBtn: { width: 28, height: 28, border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 16 } as React.CSSProperties,
  removeBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, padding: "4px 6px", flexShrink: 0 } as React.CSSProperties,
  btn: { padding: "10px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer" } as React.CSSProperties,
  label: { display: "block", fontSize: 13, color: "#555", marginBottom: 6 } as React.CSSProperties,
  select: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 15, background: "#fff" } as React.CSSProperties,
  chip: { padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 500 } as React.CSSProperties,
};
