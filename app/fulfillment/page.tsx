"use client";

import { useState } from "react";
import type { OrderFulfillmentData, FulfillmentLineItemData } from "@/lib/types";

type ActionState = "idle" | "loading" | "done" | "error";

const STATUS_LABELS: Record<string, string> = {
  fulfilled: "Fulfillé",
  unfulfilled: "Non fulfillé",
  partial: "Partiel",
  restocked: "Remis en stock",
};

const STATUS_COLORS: Record<string, string> = {
  fulfilled: "bg-green-100 text-green-800",
  unfulfilled: "bg-zinc-100 text-zinc-600",
  partial: "bg-yellow-100 text-yellow-800",
  restocked: "bg-blue-100 text-blue-800",
};

export default function FulfillmentPage() {
  const [orderInput, setOrderInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrderFulfillmentData | null>(null);
  const [actionStates, setActionStates] = useState<Record<number, ActionState>>({});
  const [actionMessages, setActionMessages] = useState<Record<number, string>>({});

  async function fetchOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!orderInput.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setActionStates({});
    setActionMessages({});

    try {
      const res = await fetch(`/api/fulfillment-order?order=${encodeURIComponent(orderInput.trim())}`);
      const json = await res.json() as { ok: boolean; data?: OrderFulfillmentData; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur inconnue");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(li: FulfillmentLineItemData, action: "fulfill" | "unfulfill") {
    if (!data) return;
    setActionStates((s) => ({ ...s, [li.lineItemId]: "loading" }));
    setActionMessages((s) => ({ ...s, [li.lineItemId]: "" }));

    try {
      const body =
        action === "unfulfill"
          ? { action, orderId: data.orderId, lineItemId: li.lineItemId, fulfillmentId: li.fulfillmentId }
          : {
              action,
              orderId: data.orderId,
              lineItemId: li.lineItemId,
              fulfillmentOrderId: li.fulfillmentOrderId,
              fulfillmentOrderLineItemId: li.fulfillmentOrderLineItemId,
              fulfillmentOrderLineItemQuantity: li.fulfillmentOrderLineItemQuantity,
            };

      const res = await fetch("/api/fulfillment-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; tagAdded?: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur inconnue");

      let msg = action === "unfulfill" ? "Unfulfillé" : "Fulfillé";
      if (json.tagAdded) msg += " + tag ATTENTION ajouté";
      setActionStates((s) => ({ ...s, [li.lineItemId]: "done" }));
      setActionMessages((s) => ({ ...s, [li.lineItemId]: msg }));

      // Reload order data
      const refreshRes = await fetch(`/api/fulfillment-order?order=${encodeURIComponent(orderInput.trim())}`);
      const refreshJson = await refreshRes.json() as { ok: boolean; data?: OrderFulfillmentData };
      if (refreshJson.ok && refreshJson.data) setData(refreshJson.data);
    } catch (err) {
      setActionStates((s) => ({ ...s, [li.lineItemId]: "error" }));
      setActionMessages((s) => ({
        ...s,
        [li.lineItemId]: err instanceof Error ? err.message : "Erreur",
      }));
    }
  }

  const hasErrorTag = data?.tags.includes("ATTENTION-ERREUR-FULFILL-POS-A-REIMPRIMER");
  const hasEnProduction = data?.tags.some((t) => t.toLowerCase() === "en production");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
          Gestion des fulfillments
        </h1>

        {/* Order search */}
        <form onSubmit={fetchOrder} className="flex gap-3 mb-8">
          <input
            type="text"
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            placeholder="Numéro de commande (ex: 392523)"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Chargement…" : "Charger"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 mb-6">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Order header */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {data.orderName}
                  </span>
                  <span className="ml-3 text-sm text-zinc-500">{data.lineItems.length} produit(s)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasEnProduction && (
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 font-medium">
                      en production
                    </span>
                  )}
                  {hasErrorTag && (
                    <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-medium">
                      ATTENTION-ERREUR-FULFILL
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line items */}
            {data.lineItems.map((li) => {
              const state = actionStates[li.lineItemId] ?? "idle";
              const msg = actionMessages[li.lineItemId] ?? "";
              const canUnfulfill = li.fulfillmentStatus === "fulfilled" && li.fulfillmentId !== null;
              const canFulfill =
                li.fulfillmentStatus === "unfulfilled" &&
                li.fulfillmentOrderId !== null &&
                li.fulfillmentOrderLineItemId !== null;

              return (
                <div
                  key={li.lineItemId}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {li.title}
                      {li.variantTitle && li.variantTitle !== "Default Title" && (
                        <span className="text-zinc-400 ml-1">— {li.variantTitle}</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Qté: {li.quantity}
                      {li.sku ? ` · SKU: ${li.sku}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[li.fulfillmentStatus] ?? "bg-zinc-100 text-zinc-600"}`}
                    >
                      {STATUS_LABELS[li.fulfillmentStatus] ?? li.fulfillmentStatus}
                    </span>

                    {canUnfulfill && (
                      <button
                        disabled={state === "loading"}
                        onClick={() => handleAction(li, "unfulfill")}
                        className="px-3 py-1 rounded text-xs font-medium bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        {state === "loading" ? "…" : "Unfulfill"}
                      </button>
                    )}

                    {canFulfill && (
                      <button
                        disabled={state === "loading"}
                        onClick={() => handleAction(li, "fulfill")}
                        className="px-3 py-1 rounded text-xs font-medium bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 disabled:opacity-50"
                      >
                        {state === "loading" ? "…" : "Fulfill"}
                      </button>
                    )}

                    {msg && (
                      <span
                        className={`text-xs ${state === "error" ? "text-red-600" : "text-green-600"}`}
                      >
                        {msg}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
