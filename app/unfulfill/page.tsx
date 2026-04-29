"use client";

import { useState } from "react";
import type { OrderFulfillmentData, FulfillmentLineItemData } from "@/lib/types";

type Phase = "search" | "loading" | "order" | "confirm" | "submitting" | "result" | "error";

type UnfulfillResult = {
  tagAdded: boolean;
  siblingsUnfulfilled: { lineItemId: number; title: string }[];
};

export default function UnfulfillPage() {
  const [phase, setPhase] = useState<Phase>("search");
  const [orderInput, setOrderInput] = useState("");
  const [order, setOrder] = useState<OrderFulfillmentData | null>(null);
  const [selected, setSelected] = useState<FulfillmentLineItemData | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<UnfulfillResult | null>(null);

  const fulfilled = (order?.lineItems ?? []).filter(
    (li) => li.fulfillmentStatus === "fulfilled" && li.fulfillmentId !== null
  );

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const value = orderInput.trim().replace(/^#/, "");
    if (!value) return;
    setPhase("loading");
    setMessage("Chargement…");
    try {
      const res = await fetch(`/api/fulfillment-order?order=${encodeURIComponent(value)}`);
      const json = await res.json() as { ok: boolean; data?: OrderFulfillmentData; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Commande introuvable");
      setOrder(json.data);
      setSelected(null);
      setResult(null);
      setMessage("");
      setPhase("order");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  function selectItem(item: FulfillmentLineItemData) {
    setSelected(item);
    setPhase("confirm");
  }

  async function confirmUnfulfill() {
    if (!order || !selected || !selected.fulfillmentId) return;
    setPhase("submitting");
    setMessage("Annulation du fulfillment…");
    try {
      const res = await fetch("/api/fulfillment-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unfulfill",
          orderId: order.orderId,
          orderName: order.orderName,
          fulfillmentId: selected.fulfillmentId,
          lineItemId: selected.lineItemId,
          lineItemTitle: selected.title,
          variantTitle: selected.variantTitle,
          sku: selected.sku,
          quantity: selected.fulfilledQuantity || selected.quantity,
        }),
      });
      const json = await res.json() as { ok: boolean; tagAdded?: boolean; siblingsUnfulfilled?: { lineItemId: number; title: string }[]; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur Shopify");
      setResult({
        tagAdded: json.tagAdded ?? false,
        siblingsUnfulfilled: json.siblingsUnfulfilled ?? [],
      });
      setPhase("result");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("search");
    setOrderInput("");
    setOrder(null);
    setSelected(null);
    setResult(null);
    setMessage("");
  }

  function backToOrder() {
    setSelected(null);
    setPhase("order");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start pt-10 px-4 font-mono">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-widest uppercase text-zinc-400">
            Unfulfill
          </h1>
          {order && phase !== "search" && (
            <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300">
              ✕ nouvelle recherche
            </button>
          )}
        </div>

        {/* Search */}
        {(phase === "search" || phase === "error") && (
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="text-xs text-zinc-500 uppercase tracking-widest">
              Numéro de commande
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                autoFocus
                placeholder="#394907"
                className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-zinc-400 rounded-lg px-4 py-3 text-lg font-mono outline-none caret-white"
              />
              <button
                type="submit"
                disabled={!orderInput.trim()}
                className="px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-sm"
              >
                →
              </button>
            </div>
            {phase === "error" && message && (
              <p className="text-sm text-red-400">{message}</p>
            )}
          </form>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <p className="text-zinc-500 text-sm animate-pulse">{message}</p>
        )}

        {/* Order — list fulfilled items */}
        {(phase === "order") && order && (
          <div className="space-y-4">
            {/* Order info */}
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 flex items-center justify-between">
              <span className="text-xl font-bold">{order.orderName}</span>
              <span className="text-xs text-zinc-500">{fulfilled.length} article{fulfilled.length !== 1 ? "s" : ""} fulfillé{fulfilled.length !== 1 ? "s" : ""}</span>
            </div>

            {fulfilled.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">
                Aucun article fulfillé dans cette commande.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Sélectionner l'article à unfulfiller
                </p>
                {fulfilled.map((li) => (
                  <button
                    key={li.lineItemId}
                    onClick={() => selectItem(li)}
                    className="w-full text-left rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-700 hover:bg-red-950/20 px-4 py-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-100 truncate">{li.title}</p>
                        {li.variantTitle && li.variantTitle !== "Default Title" && (
                          <p className="text-xs text-zinc-500 mt-0.5">{li.variantTitle}</p>
                        )}
                        {li.sku && (
                          <p className="text-xs text-zinc-600 mt-0.5">{li.sku}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-zinc-400">×{li.fulfilledQuantity || li.quantity}</span>
                        <p className="text-xs text-zinc-600 mt-0.5">#{li.fulfillmentId}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirm */}
        {phase === "confirm" && selected && order && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-4 space-y-3">
              <p className="text-sm font-semibold text-red-300 uppercase tracking-widest">Confirmer l'unfulfill</p>
              <div>
                <p className="text-base font-bold text-zinc-100">{selected.title}</p>
                {selected.variantTitle && selected.variantTitle !== "Default Title" && (
                  <p className="text-sm text-zinc-400">{selected.variantTitle}</p>
                )}
                {selected.sku && (
                  <p className="text-xs text-zinc-600 mt-1">{selected.sku}</p>
                )}
              </div>
              <div className="text-xs text-zinc-500 space-y-1">
                <p>Commande : <span className="text-zinc-300">{order.orderName}</span></p>
                <p>Fulfillment ID : <span className="text-zinc-300">#{selected.fulfillmentId}</span></p>
                <p className="text-amber-500 mt-2">
                  ⚠ Tout le fulfillment #{selected.fulfillmentId} sera annulé — les autres articles de ce fulfillment seront également remis en unfulfilled.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={backToOrder}
                className="flex-1 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
              >
                ← Annuler
              </button>
              <button
                onClick={() => void confirmUnfulfill()}
                className="flex-1 py-3 rounded-lg bg-red-700 hover:bg-red-600 text-sm font-semibold text-white"
              >
                Confirmer l'unfulfill
              </button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {phase === "submitting" && (
          <p className="text-zinc-500 text-sm animate-pulse">{message}</p>
        )}

        {/* Result */}
        {phase === "result" && result && selected && order && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-700 bg-green-950/30 px-4 py-4 space-y-3">
              <p className="text-sm font-semibold text-green-300">✓ Unfulfill effectué</p>
              <div>
                <p className="text-base font-bold text-zinc-100">{selected.title}</p>
                {selected.variantTitle && selected.variantTitle !== "Default Title" && (
                  <p className="text-sm text-zinc-400">{selected.variantTitle}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">Commande {order.orderName}</p>
              </div>
            </div>

            {result.tagAdded && (
              <div className="rounded-lg border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
                ⚠ Tag <span className="font-mono text-xs bg-amber-900/40 px-1 rounded">ATTENTION-ERREUR-FULFILL-POS-A-REIMPRIMER</span> ajouté à la commande — la commande était en production.
              </div>
            )}

            {result.siblingsUnfulfilled.length > 0 && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Articles également remis en unfulfilled</p>
                {result.siblingsUnfulfilled.map((s) => (
                  <p key={s.lineItemId} className="text-sm text-zinc-300">— {s.title}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={backToOrder}
                className="flex-1 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
              >
                ← Retour à la commande
              </button>
              <button
                onClick={reset}
                className="flex-1 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200"
              >
                Nouvelle recherche
              </button>
            </div>
          </div>
        )}

        {/* Generic error with retry */}
        {phase === "error" && order && (
          <button
            onClick={backToOrder}
            className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
          >
            ← Retour
          </button>
        )}
      </div>
    </div>
  );
}
