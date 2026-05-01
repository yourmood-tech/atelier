"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderFulfillmentData, FulfillmentLineItemData } from "@/lib/types";

type Phase = "order" | "items" | "coffret-count" | "disambiguate" | "submitting" | "error";

type ProdState =
  | { type: "done" }
  | { type: "coffret"; current: number; total: number };

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

function skuKey(sku: string): string {
  return sku.replace(/[^a-zA-Z0-9-_]/g, "");
}

function isCoffret(title: string) {
  const t = title.toLowerCase();
  return t.includes("pack") || t.startsWith("coffret");
}

// Map keyed by String(lineItemId) — unique per line, immune aux collisions SKU
function parseProdStates(tags: string[], lineItems: FulfillmentLineItemData[]): Map<string, ProdState> {
  const states = new Map<string, ProdState>();

  // lineItemId set for new-format tag detection
  const lineItemIdSet = new Set(lineItems.map(li => String(li.lineItemId)));
  // skuPart → lineItemIds pour rétrocompat avec anciens tags SKU-based
  const skuToIds = new Map<string, number[]>();
  for (const li of lineItems) {
    const k = skuKey(li.sku);
    if (!skuToIds.has(k)) skuToIds.set(k, []);
    skuToIds.get(k)!.push(li.lineItemId);
  }

  for (const tag of tags) {
    // Coffret: prod-ok-N-sur-TOTAL-PART
    const coffret = tag.match(/^prod-ok-(\d+)-sur-(\d+)-(.+)$/);
    if (coffret) {
      const n = Number(coffret[1]), total = Number(coffret[2]), part = coffret[3];
      const ids = lineItemIdSet.has(part) ? [Number(part)] : (skuToIds.get(part) ?? []);
      for (const id of ids) {
        const key = String(id);
        const existing = states.get(key);
        if (!existing || (existing.type === "coffret" && n > existing.current))
          states.set(key, { type: "coffret", current: n, total });
      }
      continue;
    }
    // Regular: prod-ok-ddmmyy-PART
    const regular = tag.match(/^prod-ok-(\d{6})-(.+)$/);
    if (regular) {
      const part = regular[2];
      if (lineItemIdSet.has(part)) {
        // Nouveau format : PART = lineItemId
        states.set(part, { type: "done" });
      } else {
        // Rétrocompat : PART = skuPart
        for (const id of skuToIds.get(part) ?? []) states.set(String(id), { type: "done" });
      }
    }
  }

  return states;
}

export default function RassemblementPage() {
  const [phase, setPhase] = useState<Phase>("order");
  const [scanInput, setScanInput] = useState("");
  const [order, setOrder] = useState<OrderFulfillmentData | null>(null);
  const [coffretCounts, setCoffretCounts] = useState<Record<string, number>>({});
  const [prodStates, setProdStates] = useState<Map<string, ProdState>>(new Map());
  const [pendingMatches, setPendingMatches] = useState<FulfillmentLineItemData[]>([]);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Coffret count prompt state
  const [pendingProduct, setPendingProduct] = useState<FulfillmentLineItemData | null>(null);
  const [coffretCountInput, setCoffretCountInput] = useState("");
  const [coffretReadyInput, setCoffretReadyInput] = useState("1");

  const inputRef = useRef<HTMLInputElement>(null);
  const coffretCountRef = useRef<HTMLInputElement>(null);
  const coffretReadyRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  useEffect(() => {
    if (phase !== "coffret-count") {
      setScanInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setCoffretCountInput("");
      setCoffretReadyInput("1");
      setTimeout(() => coffretCountRef.current?.focus(), 50);
    }
  }, [phase]);

  async function handleOrderScan(value: string) {
    const cleaned = value.trim().replace(/^#/, "");
    if (!cleaned) return;
    setPhase("submitting");
    setMessage("Chargement…");
    try {
      const res = await fetch(`/api/rassemblement?order=${encodeURIComponent(cleaned)}`);
      const json = await res.json() as {
        ok: boolean;
        data?: OrderFulfillmentData;
        error?: string;
      };
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
      // Restore coffret counts from order tags (coffret-count-LINEID-N)
      const savedCounts: Record<string, number> = {};
      for (const li of json.data.lineItems) {
        if (isCoffret(li.title)) {
          const prefix = `coffret-count-${li.lineItemId}-`;
          const countTag = json.data.tags.find(t => t.startsWith(prefix));
          if (countTag) {
            const n = Number(countTag.slice(prefix.length));
            if (n > 0) savedCounts[String(li.lineItemId)] = n;
          }
        }
      }
      setCoffretCounts(savedCounts);
      setProdStates(parseProdStates(json.data.tags, json.data.lineItems));
      setMessage("");
      setPhase("items");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  // Appelé depuis un clic direct sur une ligne — lineItemId connu, pas d'ambiguïté
  async function handleLineItemSelect(lineItemId: number) {
    if (!order) return;
    const item = order.lineItems.find(li => li.lineItemId === lineItemId);
    if (!item) return;
    await processItem(item);
  }

  // Appelé depuis le scan barcode — productId seulement, peut matcher plusieurs variantes
  async function handleProductScan(value: string) {
    const productId = Number(value.trim());
    if (!productId || !order) return;

    const matches = order.lineItems.filter(li => li.productId === productId);
    if (!matches.length) {
      setMessage(`Produit ${productId} non trouvé dans cette commande`);
      setTimeout(() => setMessage(""), 2500);
      return;
    }

    const nonDone = matches.filter(li => {
      const s = prodStates.get(String(li.lineItemId));
      return !s || (s.type === "coffret" && s.current < s.total);
    });

    // Plusieurs variantes non-faites → demander laquelle a été préparée
    if (nonDone.length > 1) {
      setPendingMatches(nonDone);
      setPhase("disambiguate");
      return;
    }

    const item = nonDone[0] ?? matches[matches.length - 1];
    await processItem(item);
  }

  async function processItem(item: FulfillmentLineItemData) {
    if (!order) return;
    const productId = item.productId;
    const state = prodStates.get(String(item.lineItemId));

    if (isCoffret(item.title)) {
      const total = coffretCounts[String(item.lineItemId)] ?? (state?.type === "coffret" ? state.total : null);

      if (state?.type === "coffret" && state.current >= state.total) {
        await handleDeselect(item);
        return;
      }

      if (total === null) {
        setPendingProduct(item);
        setPhase("coffret-count");
        return;
      }

      await submitCoffretScan(productId, item, total, state);
    } else {
      if (state?.type === "done") {
        await handleDeselect(item);
        return;
      }
      await submitRegularScan(productId, item.sku, item.lineItemId);
    }
  }

  async function submitRegularScan(productId: number, sku: string, lineItemId: number) {
    if (!order) return;
    setPhase("submitting");
    setMessage("Enregistrement…");
    try {
      const res = await fetch("/api/rassemblement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, productId, sku, lineItemId }),
      });
      const json = await res.json() as { ok: boolean; tag?: string; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur Shopify");

      setProdStates(prev => new Map(prev).set(String(lineItemId), { type: "done" }));
      setMessage(`✓ ${json.tag ?? "prod-ok enregistré"}`);
      setTimeout(() => setMessage(""), 2000);
      setPhase("items");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  async function submitCoffretScan(
    productId: number,
    item: FulfillmentLineItemData,
    total: number,
    currentState: ProdState | undefined,
    markCount: number = 1
  ) {
    if (!order) return;
    const currentN = currentState?.type === "coffret" ? currentState.current : 0;
    const n = Math.min(currentN + markCount, total);

    setPhase("submitting");
    setMessage("Enregistrement…");
    try {
      const res = await fetch("/api/rassemblement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, productId, sku: item.sku, lineItemId: item.lineItemId, n, total }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur Shopify");

      setProdStates(prev => new Map(prev).set(String(item.lineItemId), { type: "coffret", current: n, total }));
      const msg = n >= total
        ? `✓ ${item.title} — ${n}/${total} complet !`
        : `✓ ${item.title} — ${n}/${total} enregistré`;
      setMessage(msg);
      setTimeout(() => setMessage(""), 2500);
      setPhase("items");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  async function handleDeselect(item: FulfillmentLineItemData) {
    if (!order) return;
    setPhase("submitting");
    setMessage("Annulation…");
    try {
      const res = await fetch("/api/rassemblement", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, lineItemId: item.lineItemId }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Erreur Shopify");
      setProdStates(prev => { const next = new Map(prev); next.delete(String(item.lineItemId)); return next; });
      setMessage(`↩ ${item.title} — annulé`);
      setTimeout(() => setMessage(""), 2000);
      setPhase("items");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
      setPhase("error");
    }
  }

  async function handleCoffretCountConfirm() {
    const count = parseInt(coffretCountInput.trim(), 10);
    if (!pendingProduct || isNaN(count) || count < 1) return;

    const productId = pendingProduct.productId;
    const readyCount = Math.min(
      Math.max(1, parseInt(coffretReadyInput.trim(), 10) || 1),
      count
    );

    // Persist on the order (Shopify tag coffret-count-LINEID-N) — survives cross-device, cross-session
    if (order) {
      fetch("/api/rassemblement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, lineItemId: pendingProduct.lineItemId, count }),
      }).catch(() => {});
    }
    const updatedCounts = { ...coffretCounts, [String(pendingProduct.lineItemId)]: count };
    setCoffretCounts(updatedCounts);
    const state = prodStates.get(String(pendingProduct.lineItemId));
    await submitCoffretScan(productId, pendingProduct, count, state, readyCount);
    setPendingProduct(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      if (phase === "items") {
        if (scanInput.trim()) {
          void handleProductScan(scanInput.trim());
        } else {
          setOrder(null);
          setProdStates(new Map());
          setCoffretCounts({});
          setPendingMatches([]);
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
          {order && phase !== "error" && phase !== "coffret-count" && (
            <button
              onClick={() => { setOrder(null); setProdStates(new Map()); setCoffretCounts({}); setPendingMatches([]); setMessage(""); setPhase("order"); }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕ annuler
            </button>
          )}
        </div>

        {/* Coffret count prompt */}
        {phase === "coffret-count" && pendingProduct && (
          <div className="rounded-lg bg-zinc-900 border border-amber-700 p-4 space-y-3">
            <p className="text-sm text-zinc-300 font-medium">{pendingProduct.title}</p>

            <div className="space-y-1">
              <label className="text-xs text-amber-400 uppercase tracking-widest">Nb d&apos;éléments dans ce coffret</label>
              <input
                ref={coffretCountRef}
                type="number"
                min={1}
                value={coffretCountInput}
                onChange={(e) => setCoffretCountInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); coffretReadyRef.current?.focus(); }
                  if (e.key === "Escape") { setPendingProduct(null); setPhase("items"); }
                }}
                className="w-full bg-zinc-800 border border-zinc-600 focus:border-amber-400 rounded-lg px-4 py-3 text-lg font-mono outline-none caret-white"
                placeholder="ex : 3"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-amber-400 uppercase tracking-widest">Combien sont prêts maintenant ?</label>
              <input
                ref={coffretReadyRef}
                type="number"
                min={1}
                value={coffretReadyInput}
                onChange={(e) => setCoffretReadyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void handleCoffretCountConfirm(); }
                  if (e.key === "Escape") { setPendingProduct(null); setPhase("items"); }
                }}
                className="w-full bg-zinc-800 border border-zinc-600 focus:border-amber-400 rounded-lg px-4 py-3 text-lg font-mono outline-none caret-white"
                placeholder="1"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => void handleCoffretCountConfirm()}
                className="flex-1 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-sm font-bold"
              >
                Confirmer
              </button>
              <button
                onClick={() => { setPendingProduct(null); setPhase("items"); }}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-400"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Disambiguation — plusieurs variantes non-faites pour le même produit */}
        {phase === "disambiguate" && pendingMatches.length > 0 && (
          <div className="rounded-lg bg-zinc-900 border border-blue-700 p-4 space-y-3">
            <p className="text-xs text-blue-400 uppercase tracking-widest">Quelle variante avez-vous préparée ?</p>
            <div className="space-y-2">
              {pendingMatches.map(li => (
                <button
                  key={li.lineItemId}
                  onClick={() => { setPendingMatches([]); setPhase("items"); void processItem(li); }}
                  className="w-full text-left rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-blue-500 px-4 py-3 transition-colors"
                >
                  <span className="font-bold text-zinc-200">{li.title}</span>
                  {li.variantTitle && li.variantTitle !== "Default Title" && (
                    <span className="ml-2 text-zinc-400">— {li.variantTitle}</span>
                  )}
                  {li.sku && <p className="text-xs text-zinc-500 mt-1">{li.sku}</p>}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPendingMatches([]); setPhase("items"); }}
              className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-500"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Order info */}
        {order && (phase === "items" || phase === "submitting") && (
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <div className="text-xl font-bold">{order.orderName}</div>

            {pending.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">En attente</p>
                {pending.map(li => (
                  <LineItemRow
                    key={li.lineItemId}
                    item={li}
                    state={prodStates.get(String(li.lineItemId))}
                    coffretTotal={isCoffret(li.title) ? (coffretCounts[String(li.lineItemId)] ?? null) : null}
                    onSelect={phase === "items" ? () => void handleLineItemSelect(li.lineItemId) : undefined}
                  />
                ))}
              </div>
            )}

            {fulfilled.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Déjà livré</p>
                {fulfilled.map(li => (
                  <LineItemRow
                    key={li.lineItemId}
                    item={li}
                    state={undefined}
                    coffretTotal={null}
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

        {/* Status */}
        {message && phase !== "coffret-count" && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            phase === "error" ? "bg-red-900 text-red-200 border border-red-700" :
            "bg-zinc-800 text-zinc-300"
          }`}>
            {message}
          </div>
        )}

        {phase === "error" && (
          <button
            onClick={() => { setOrder(null); setProdStates(new Map()); setCoffretCounts({}); setPendingMatches([]); setMessage(""); setPhase("order"); }}
            className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300"
          >
            ← Recommencer
          </button>
        )}

        {phase === "submitting" && (
          <div className="text-zinc-500 text-sm animate-pulse">{message || "En cours…"}</div>
        )}
      </div>
    </div>
  );
}

function LineItemRow({
  item,
  state,
  coffretTotal,
  fulfilled = false,
  onSelect,
}: {
  item: FulfillmentLineItemData;
  state: ProdState | undefined;
  coffretTotal: number | null;
  fulfilled?: boolean;
  onSelect?: () => void;
}) {
  const isCoffretItem = coffretTotal !== null || state?.type === "coffret";
  const coffretCurrent = state?.type === "coffret" ? state.current : 0;
  const total = coffretTotal ?? (state?.type === "coffret" ? state.total : null);
  const coffretDone = isCoffretItem && total !== null && coffretCurrent >= total;

  const isDone = fulfilled || state?.type === "done" || coffretDone;
  const isPartial = isCoffretItem && coffretCurrent > 0 && !coffretDone;

  return (
    <div
      onClick={onSelect}
      className={`rounded px-3 py-2 flex items-center gap-3 transition-colors ${
        onSelect ? "cursor-pointer active:opacity-70" : ""
      } ${
        fulfilled ? "bg-green-900/30 border border-green-800" :
        isDone ? "bg-blue-900/40 border border-blue-700 hover:bg-red-900/30 hover:border-red-700/60 group" :
        isPartial ? "bg-amber-900/30 border border-amber-800 hover:bg-red-900/30 hover:border-red-700/60 group" :
        onSelect ? "bg-zinc-800/30 border border-transparent hover:border-zinc-600 hover:bg-zinc-800/60" :
        "bg-zinc-800/30 border border-transparent"
      }`}
    >
      <span className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center text-xs ${
        fulfilled ? "border-green-600 bg-green-800 text-green-300" :
        isDone ? "bg-blue-500 border-blue-400 text-white" :
        isPartial ? "bg-amber-600 border-amber-500 text-white" :
        "border-zinc-600 bg-zinc-800"
      }`}>
        {fulfilled ? "✓" : isDone ? <><span className="group-hover:hidden">★</span><span className="hidden group-hover:inline">↩</span></> : isPartial ? <><span className="group-hover:hidden">…</span><span className="hidden group-hover:inline">↩</span></> : ""}
      </span>

      <span className={`flex-1 text-sm ${
        fulfilled ? "text-green-300" :
        isDone ? "text-zinc-200" :
        isPartial ? "text-amber-200" :
        "text-zinc-400"
      }`}>
        {item.title}
        {item.variantTitle && item.variantTitle !== "Default Title" && (
          <span className={`ml-1 ${fulfilled ? "text-green-600" : "text-zinc-500"}`}>— {item.variantTitle}</span>
        )}
      </span>

      <span className="text-xs text-right whitespace-nowrap">
        {fulfilled && <span className="text-green-600">livré</span>}
        {!fulfilled && isDone && !isCoffretItem && <span className="text-blue-400">prod-ok</span>}
        {!fulfilled && isCoffretItem && total !== null && (
          <span className={coffretDone ? "text-blue-400" : coffretCurrent > 0 ? "text-amber-400" : "text-zinc-500"}>
            {coffretCurrent}/{total}
          </span>
        )}
        {!fulfilled && isCoffretItem && total === null && (
          <span className="text-amber-500">? éléments</span>
        )}
        {!fulfilled && !isCoffretItem && !isDone && <span className="text-zinc-600">×{item.quantity}</span>}
      </span>
    </div>
  );
}
