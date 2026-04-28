"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderFulfillmentData, FulfillmentLineItemData } from "@/lib/types";

type Phase = "order" | "items" | "submitting" | "error";

type HistoryEntry = {
  orderName: string;
  orderId: number;
  scannedAt: string;
};

const HISTORY_KEY = "rassemblement_history";

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as HistoryEntry[];
  } catch { return []; }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 3)));
}

// Extract prodOk productIds from order tags
function getProdOkIds(tags: string[]): Set<number> {
  const ids = new Set<number>();
  for (const tag of tags) {
    const m = tag.match(/^prod-ok:\d{4}-\d{2}-\d{2}:(\d+)$/);
    if (m) ids.add(Number(m[1]));
  }
  return ids;
}

export default function RassemblementPage() {
  const [phase, setPhase] = useState<Phase>("order");
  const [scanInput, setScanInput] = useState("");
  const [order, setOrder] = useState<OrderFulfillmentData | null>(null);
  const [prodOkIds, setProdOkIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    setScanInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [phase]);

  async function handleOrderScan(value: string) {
    const cleaned = value.trim().replace(/^#/, "");
    if (!cleaned) return;
    setPhase("submitting");
    setMessage("Chargement…");
    try {
      const res = await fetch(`/api/rassemblement?order=${encodeURIComponent(cleaned)}`);
      const json = await res.json() as { ok: boolean; data?: OrderFulfillmentData; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Commande introuvable");

      const entry: HistoryEntry = {
        orderName: json.data.orderName,
        orderId: json.data.orderId,
        scannedAt: new Date().toISOString(),
      };
      const updated = [entry, ...loadHistory().filter(h => h.orderId !== json.data!.orderId)];
      saveHistory(updated);
      setHistory(updated.slice(0, 3));

      setOrder(json.data);
      setProdOkIds(getProdOkIds(json.data.tags));
      setMessage("");
      setPhase("items");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  async function handleProductScan(value: string) {
    const productId = Number(value.trim());
    if (!productId || !order) return;

    const matches = order.lineItems.filter(li => li.productId === productId);
    if (!matches.length) {
      setMessage(`Produit ${productId} non trouvé dans cette commande`);
      setTimeout(() => setMessage(""), 2500);
      return;
    }

    if (prodOkIds.has(productId)) {
      setMessage(`Produit déjà marqué prod-ok`);
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    setPhase("submitting");
    setMessage("Enregistrement…");
    try {
      const res = await fetch("/api/rassemblement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, productId }),
      });
      const json = await res.json() as { ok: boolean; tag?: string; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur Shopify");

      setProdOkIds(prev => new Set([...prev, productId]));
      setMessage(`✓ prod-ok enregistré`);
      setTimeout(() => setMessage(""), 2000);
      setPhase("items");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      if (phase === "items") {
        if (scanInput.trim()) {
          void handleProductScan(scanInput.trim());
        } else {
          // TAB without scan = next order
          setOrder(null);
          setProdOkIds(new Set());
          setMessage("");
          setPhase("order");
        }
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const value = scanInput.trim();
      if (!value) return;
      if (phase === "order") {
        void handleOrderScan(value);
      } else if (phase === "items") {
        void handleProductScan(value);
        setScanInput("");
      }
    }
  }

  const lineItems = order?.lineItems ?? [];
  const fulfilled = lineItems.filter(li => li.fulfillmentStatus === "fulfilled");
  const pending = lineItems.filter(li => li.fulfillmentStatus !== "fulfilled");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start pt-10 px-4 font-mono">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-widest uppercase text-zinc-400">
            Rassemblement
          </h1>
          {order && phase !== "error" && (
            <button
              onClick={() => { setOrder(null); setProdOkIds(new Set()); setMessage(""); setPhase("order"); }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕ annuler
            </button>
          )}
        </div>

        {/* Order info */}
        {order && phase === "items" && (
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <div className="text-xl font-bold">{order.orderName}</div>

            {/* Pending items */}
            {pending.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">En attente</p>
                {pending.map(li => (
                  <LineItemRow
                    key={li.lineItemId}
                    item={li}
                    prodOk={prodOkIds.has(li.productId)}
                  />
                ))}
              </div>
            )}

            {/* Fulfilled items */}
            {fulfilled.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Déjà livré</p>
                {fulfilled.map(li => (
                  <LineItemRow
                    key={li.lineItemId}
                    item={li}
                    prodOk={false}
                    fulfilled
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scan input */}
        {(phase === "order" || phase === "items") && (
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 uppercase tracking-widest">
              {phase === "order" && "Scanner numéro de commande"}
              {phase === "items" && "Scanner article terminé · TAB sans scan → prochaine commande"}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 rounded-lg px-4 py-3 text-lg font-mono outline-none caret-white"
              placeholder={phase === "order" ? "#394907" : "scan produit…"}
            />
          </div>
        )}

        {/* History */}
        {phase === "order" && history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Récent</p>
            {history.map((h) => {
              const t = new Date(h.scannedAt);
              const time = t.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
              const date = t.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit" });
              return (
                <button
                  key={h.orderId}
                  onClick={() => void handleOrderScan(h.orderName)}
                  className="w-full text-left rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 px-4 py-3 flex items-center justify-between transition-colors"
                >
                  <span className="font-bold text-zinc-200">{h.orderName}</span>
                  <span className="text-xs text-zinc-500">{date} {time}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Status message */}
        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            phase === "error" ? "bg-red-900 text-red-200 border border-red-700" :
            "bg-zinc-800 text-zinc-300"
          }`}>
            {message}
          </div>
        )}

        {/* Error retry */}
        {phase === "error" && (
          <button
            onClick={() => { setOrder(null); setProdOkIds(new Set()); setMessage(""); setPhase("order"); }}
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
  prodOk,
  fulfilled = false,
}: {
  item: FulfillmentLineItemData;
  prodOk: boolean;
  fulfilled?: boolean;
}) {
  const state = fulfilled ? "fulfilled" : prodOk ? "prodok" : "pending";
  return (
    <div className={`rounded px-3 py-2 flex items-center gap-3 ${
      state === "fulfilled" ? "opacity-40" :
      state === "prodok" ? "bg-blue-900/40 border border-blue-700" :
      "bg-zinc-800/30 border border-transparent"
    }`}>
      <span className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center text-xs ${
        state === "fulfilled" ? "border-zinc-600 bg-zinc-700 text-zinc-400" :
        state === "prodok" ? "bg-blue-500 border-blue-400 text-white" :
        "border-zinc-600 bg-zinc-800"
      }`}>
        {state === "fulfilled" ? "✓" : state === "prodok" ? "★" : ""}
      </span>
      <span className={`flex-1 text-sm ${state === "pending" ? "text-zinc-400" : "text-zinc-200"}`}>
        {item.title}
        {item.variantTitle && item.variantTitle !== "Default Title" && (
          <span className="text-zinc-500 ml-1">— {item.variantTitle}</span>
        )}
        {state === "prodok" && <span className="ml-2 text-xs text-blue-400">prod-ok</span>}
        {state === "fulfilled" && <span className="ml-2 text-xs text-zinc-500">livré</span>}
      </span>
      <span className="text-xs text-zinc-600">×{item.quantity}</span>
    </div>
  );
}
