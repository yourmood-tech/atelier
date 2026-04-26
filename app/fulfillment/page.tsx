"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderFulfillmentData, FulfillmentLineItemData } from "@/lib/types";

type Phase = "order" | "items" | "tracking" | "submitting" | "done" | "error";

export default function FulfillmentPage() {
  const [phase, setPhase] = useState<Phase>("order");
  const [scanInput, setScanInput] = useState("");
  const [order, setOrder] = useState<OrderFulfillmentData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [trackingNumber, setTrackingNumber] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on every phase change
  useEffect(() => {
    setScanInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [phase]);

  const unfulfilled = (order?.lineItems ?? []).filter(
    (li) => li.fulfillmentStatus === "unfulfilled" || li.fulfillmentStatus === "partial"
  );

  async function handleOrderScan(value: string) {
    const cleaned = value.trim().replace(/^#/, "");
    if (!cleaned) return;
    setPhase("submitting");
    setMessage("Chargement…");
    try {
      const res = await fetch(`/api/fulfillment?order=${encodeURIComponent(cleaned)}`);
      const json = await res.json() as { ok: boolean; data?: OrderFulfillmentData; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Commande introuvable");
      const data = json.data;
      const ids = new Set(
        data.lineItems
          .filter((li) => li.fulfillmentStatus === "unfulfilled" || li.fulfillmentStatus === "partial")
          .map((li) => li.lineItemId)
      );
      setOrder(data);
      setSelectedIds(ids);
      setMessage("");
      setPhase("items");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  function handleItemScan(value: string) {
    const productId = Number(value.trim());
    if (!productId || !order) return;
    const matches = unfulfilled.filter((li) => li.productId === productId);
    if (!matches.length) {
      // Vibrate / flash — barcode not found in order
      setMessage(`Produit ${productId} non trouvé dans cette commande`);
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      // Toggle: if all matches selected → deselect, else select all
      const allSelected = matches.every((li) => prev.has(li.lineItemId));
      matches.forEach((li) => allSelected ? next.delete(li.lineItemId) : next.add(li.lineItemId));
      return next;
    });
    setMessage("");
  }

  async function submitFulfillment(tracking?: string) {
    if (!order) return;
    setPhase("submitting");
    setMessage("Fulfillment en cours…");
    try {
      const lineItemIds = selectedIds.size === unfulfilled.length
        ? []  // all selected → let Shopify handle as full fulfillment
        : [...selectedIds];

      const res = await fetch("/api/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, lineItemIds, trackingNumber: tracking || undefined }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur Shopify");

      const msg = tracking
        ? `✓ ${order.orderName} fulfillé — tracking ${tracking}`
        : `✓ ${order.orderName} fulfillé`;
      setMessage(msg);
      setPhase("done");

      // Auto-reset after 2s
      setTimeout(() => {
        setOrder(null);
        setSelectedIds(new Set());
        setTrackingNumber("");
        setMessage("");
        setPhase("order");
      }, 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      if (phase === "items") {
        setPhase("tracking");
      } else if (phase === "tracking") {
        void submitFulfillment(undefined);
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const value = scanInput.trim();
      if (!value) {
        // Empty Enter in tracking = submit without tracking
        if (phase === "tracking") void submitFulfillment(undefined);
        return;
      }
      if (phase === "order") {
        void handleOrderScan(value);
      } else if (phase === "items") {
        handleItemScan(value);
        setScanInput("");
      } else if (phase === "tracking") {
        void submitFulfillment(value);
      }
    }
  }

  const selectedCount = selectedIds.size;
  const totalUnfulfilled = unfulfilled.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start pt-10 px-4 font-mono">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-widest uppercase text-zinc-400">
            Fulfillment
          </h1>
          {order && phase !== "done" && (
            <button
              onClick={() => { setOrder(null); setSelectedIds(new Set()); setMessage(""); setPhase("order"); }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕ annuler
            </button>
          )}
        </div>

        {/* Phase indicator */}
        <div className="flex gap-2 text-xs text-zinc-600">
          {(["order", "items", "tracking"] as const).map((p, i) => (
            <span key={p} className={`flex items-center gap-1 ${phase === p || (phase === "submitting" && p === "order") ? "text-white" : ""}`}>
              {i > 0 && <span>→</span>}
              <span className={`px-2 py-0.5 rounded ${
                phase === p ? "bg-zinc-700 text-white" :
                (phase === "items" && p === "order") || (phase === "tracking" && p !== "tracking") || phase === "done"
                  ? "text-zinc-500 line-through" : "text-zinc-600"
              }`}>
                {p === "order" ? "commande" : p === "items" ? "articles" : "tracking"}
              </span>
            </span>
          ))}
        </div>

        {/* Order info (phases items + tracking) */}
        {order && (phase === "items" || phase === "tracking") && (
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">{order.orderName}</span>
              <span className="text-xs text-zinc-400">
                {selectedCount}/{totalUnfulfilled} article{totalUnfulfilled > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {unfulfilled.map((li) => (
                <LineItemRow
                  key={li.lineItemId}
                  item={li}
                  selected={selectedIds.has(li.lineItemId)}
                  disabled={phase === "tracking"}
                  onToggle={() => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      prev.has(li.lineItemId) ? next.delete(li.lineItemId) : next.add(li.lineItemId);
                      return next;
                    });
                  }}
                />
              ))}
              {unfulfilled.length === 0 && (
                <p className="text-sm text-zinc-500">Tous les articles sont déjà fulfillés</p>
              )}
            </div>
          </div>
        )}

        {/* Tracking display */}
        {phase === "tracking" && trackingNumber && (
          <div className="text-sm text-zinc-300 bg-zinc-800 rounded px-3 py-2">
            Tracking : <span className="font-bold text-white">{trackingNumber}</span>
          </div>
        )}

        {/* Scan input */}
        {(phase === "order" || phase === "items" || phase === "tracking") && (
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 uppercase tracking-widest">
              {phase === "order" && "Scanner numéro de commande"}
              {phase === "items" && "Scanner article pour toggle · TAB → continuer"}
              {phase === "tracking" && "Scanner tracking Swiss Post · TAB → sans tracking"}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 rounded-lg px-4 py-3 text-lg font-mono outline-none caret-white"
              placeholder={
                phase === "order" ? "#394907" :
                phase === "items" ? "scan produit…" :
                "scan tracking…"
              }
            />
          </div>
        )}

        {/* Status message */}
        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            phase === "done" ? "bg-green-900 text-green-200 border border-green-700" :
            phase === "error" ? "bg-red-900 text-red-200 border border-red-700" :
            "bg-zinc-800 text-zinc-300"
          }`}>
            {message}
          </div>
        )}

        {/* Error retry */}
        {phase === "error" && (
          <button
            onClick={() => { setOrder(null); setSelectedIds(new Set()); setMessage(""); setPhase("order"); }}
            className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
          >
            ← Recommencer
          </button>
        )}

        {/* Submitting */}
        {phase === "submitting" && (
          <div className="text-zinc-500 text-sm animate-pulse">{message || "En cours…"}</div>
        )}
      </div>
    </div>
  );
}

function LineItemRow({
  item,
  selected,
  disabled,
  onToggle,
}: {
  item: FulfillmentLineItemData;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      className={`w-full text-left rounded px-3 py-2 flex items-center gap-3 transition-colors ${
        disabled ? "cursor-default" :
        selected ? "bg-green-900/40 hover:bg-green-900/60" : "bg-zinc-800/50 hover:bg-zinc-800"
      }`}
    >
      <span className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center text-xs ${
        selected ? "bg-green-500 border-green-400 text-white" : "border-zinc-600 bg-zinc-800"
      }`}>
        {selected ? "✓" : ""}
      </span>
      <span className={`flex-1 text-sm ${selected ? "text-zinc-100" : "text-zinc-500"}`}>
        {item.title}
        {item.variantTitle && item.variantTitle !== "Default Title" && (
          <span className="text-zinc-500 ml-1">— {item.variantTitle}</span>
        )}
      </span>
      <span className="text-xs text-zinc-600">×{item.quantity}</span>
    </button>
  );
}
