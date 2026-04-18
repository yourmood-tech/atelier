"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Direction, ScanApiResponse, RecipeLookupApiResponse, RecipeLookupResult, BackorderApiResponse, BackorderAnalysis, ProductionStep, ProductionDirection, ProductionAnalysis, ProductionNotifyApiResponse } from "@/lib/types";

type ScanLine = {
  sku: string;
  ts: number;
};

type BatchItem = {
  localId: string;
  orderId: string;
  productId: string;
  status: "analyzing" | "ready" | "error" | "sent";
  result: BackorderAnalysis | null;
  error: string | null;
};

type AppMode = "scan" | "recipe" | "backorder" | "suppliers" | "production";
type BackorderStep = "order" | "product";

type ProductionBatchItem = {
  localId: string;
  orderId: string;
  productId: string;
  stepKey: string;
  stepName: string;
  direction: ProductionDirection;
  status: "analyzing" | "ready" | "error";
  result: ProductionAnalysis | null;
  error: string | null;
};

type SupplierRow = {
  supplier_id: number;
  supplier_name: string;
  lead_time_min: number | null;
  lead_time_max: number | null;
  updated_at: string | null;
};

export default function ScannerPage() {
  const [mode, setMode] = useState<AppMode>("scan");
  const [direction, setDirection] = useState<Direction>("OUT");
  const [buffer, setBuffer] = useState("");
  const [status, setStatus] = useState("Prêt");
  const [lastScan, setLastScan] = useState<string>("-");
  const [scanLines, setScanLines] = useState<ScanLine[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastVariantName, setLastVariantName] = useState<string>("-");
  const [recipeResult, setRecipeResult] = useState<RecipeLookupResult | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [backorderStep, setBackorderStep] = useState<BackorderStep>("order");
  const [backorderOrderId, setBackorderOrderId] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchSendingAll, setBatchSendingAll] = useState(false);
  // Production mode
  const [productionView, setProductionView] = useState<"scan" | "steps">("scan");
  const [productionSteps, setProductionSteps] = useState<ProductionStep[]>([]);
  const [productionStepsLoading, setProductionStepsLoading] = useState(false);
  const [selectedStepKey, setSelectedStepKey] = useState<string>("");
  const [productionDirection, setProductionDirection] = useState<ProductionDirection>("IN");
  const [productionScanStep, setProductionScanStep] = useState<BackorderStep>("order");
  const [productionOrderId, setProductionOrderId] = useState<string | null>(null);
  const [productionBatch, setProductionBatch] = useState<ProductionBatchItem[]>([]);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editingStepMin, setEditingStepMin] = useState<string>("");
  const [editingStepMax, setEditingStepMax] = useState<string>("");
  const [editingStepUnit, setEditingStepUnit] = useState<"hours" | "days">("hours");
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingMin, setEditingMin] = useState<string>("");
  const [editingMax, setEditingMax] = useState<string>("");

  const lastAcceptedRef = useRef<{ sku: string; ts: number } | null>(null);
  const submitScanRef = useRef<(raw: string) => Promise<void>>(async () => {});

  useEffect(() => {
    const existing = sessionStorage.getItem("scanner_session_id");
    if (existing) {
      setSessionId(existing);
      return;
    }
    const newId = crypto.randomUUID();
    sessionStorage.setItem("scanner_session_id", newId);
    setSessionId(newId);
  }, []);

  // Keep the ref pointing to the latest submitScan on every render
  useEffect(() => {
    submitScanRef.current = submitScan;
  });

  // Document-level capture — uses focusin/focusout to track blocking state
  // More reliable than reading document.activeElement inside keydown
  useEffect(() => {
    const buf = { value: "" };
    const blocked = { value: false };

    const isEditableTag = (el: EventTarget | null) => {
      const tag = (el as HTMLElement | null)?.tagName ?? "";
      return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
    };

    const onFocusIn  = (e: FocusEvent) => { if (isEditableTag(e.target))        blocked.value = true;  };
    const onFocusOut = (e: FocusEvent) => { if (!isEditableTag(e.relatedTarget)) blocked.value = false; };

    const onKey = (e: KeyboardEvent) => {
      if (blocked.value) return;

      if (e.key === "Enter") {
        if (buf.value) {
          e.preventDefault();
          const val = buf.value;
          buf.value = "";
          setBuffer("");
          void submitScanRef.current(val);
        }
      } else if (e.key === "Backspace") {
        if (buf.value) {
          e.preventDefault();
          buf.value = buf.value.slice(0, -1);
          setBuffer(buf.value);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buf.value += e.key;
        setBuffer(buf.value);
      }
    };

    document.addEventListener("focusin",  onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown",  onKey);
    return () => {
      document.removeEventListener("focusin",  onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown",  onKey);
    };
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of scanLines) {
      map.set(line.sku, (map.get(line.sku) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [scanLines]);

  async function playBeep() {
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

  async function submitScan(raw: string) {
    const sku = raw.trim().toUpperCase();
    if (!sku) return;

    const now = Date.now();
    const last = lastAcceptedRef.current;

    if (last && last.sku === sku && now - last.ts < 150) {
      return;
    }

    lastAcceptedRef.current = { sku, ts: now };
    setLastScan(sku);

    if (mode === "recipe") {
      await submitRecipeLookup(sku);
      return;
    }

    if (mode === "backorder") {
      await submitBackorderScan(sku);
      return;
    }

    if (mode === "production" && productionView === "scan") {
      submitProductionScan(sku);
      return;
    }

    setStatus(`Envoi ${sku}...`);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, direction, sessionId, deviceName: "scanner-bluetooth-1" }),
      });

      let data: ScanApiResponse | null = null;
      let rawText = "";

      try {
        rawText = await res.text();
        data = rawText ? (JSON.parse(rawText) as ScanApiResponse) : null;
      } catch {
        throw new Error(`Réponse non JSON de l'API: ${rawText.slice(0, 200)}`);
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erreur API");
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur API");
      }

      setScanLines((prev) => [{ sku, ts: now }, ...prev].slice(0, 200));
      setLastVariantName(data.variantName || "-");
      setStatus(`OK · ${sku} · ${direction}`);
      playBeep();
    } catch (error) {
      setStatus(`Erreur · ${error instanceof Error ? error.message : "inconnue"}`);
    }
  }

  async function submitRecipeLookup(id: string) {
    setRecipeLoading(true);
    setRecipeResult(null);
    setStatus(`Recherche recette ${id}...`);

    try {
      const res = await fetch(`/api/recipe-lookup?id=${encodeURIComponent(id)}`);
      const data = (await res.json()) as RecipeLookupApiResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur API");
      }

      setRecipeResult(data.result ?? null);
      setStatus(`Recette trouvée · ${data.result?.shopify.productTitle ?? id}`);
      playBeep();
    } catch (error) {
      setStatus(`Erreur · ${error instanceof Error ? error.message : "inconnue"}`);
    } finally {
      setRecipeLoading(false);
    }
  }

  async function analyzeItem(localId: string, orderId: string, productId: string) {
    try {
      const res = await fetch(
        `/api/backorder-notify?order_id=${encodeURIComponent(orderId)}&product_id=${encodeURIComponent(productId)}`
      );
      const data = (await res.json()) as BackorderApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || "Erreur API");
      setBatchItems((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? { ...item, status: "ready", result: data.result ?? null }
            : item
        )
      );
    } catch (error) {
      setBatchItems((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? { ...item, status: "error", error: error instanceof Error ? error.message : "Erreur" }
            : item
        )
      );
    }
  }

  async function submitBackorderScan(id: string) {
    if (backorderStep === "order") {
      setBackorderOrderId(id);
      setBackorderStep("product");
      setStatus(`Commande ${id} — scannez le produit`);
      return;
    }

    if (!backorderOrderId) return;

    const localId = crypto.randomUUID();
    setBatchItems((prev) => [
      { localId, orderId: backorderOrderId, productId: id, status: "analyzing", result: null, error: null },
      ...prev,
    ]);
    setBackorderStep("order");
    setBackorderOrderId(null);
    setStatus(`Commande ${backorderOrderId} en analyse — scannez suivante`);
    playBeep();

    void analyzeItem(localId, backorderOrderId, id);
  }

  async function sendBatchEmail(localId: string) {
    const item = batchItems.find((i) => i.localId === localId);
    if (!item?.result?.emailDraft || !item.result.order.customer.email) return;

    setBatchItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, status: "sent" } : i))
    );

    const lines = item.result.emailDraft.split("\n");
    const subject = lines[0].replace(/^Subject:\s*/i, "");
    const body = lines.slice(2).join("\n");

    try {
      const res = await fetch("/api/backorder-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: item.result.order.customer.email,
          firstName: item.result.order.customer.firstName,
          subject,
          body,
          orderId: item.result.order.name,
          orderNumericId: item.result.order.id,
          productTitle: item.result.product.productTitle,
          estimatedDelivery: item.result.estimatedDelivery,
          supplierName: item.result.purchaseOrder?.supplierName ?? null,
          followupSubject: item.result.followUpEmailDraft
            ? item.result.followUpEmailDraft.split("\n")[0].replace(/^Subject:\s*/i, "")
            : null,
          followupBody: item.result.followUpEmailDraft
            ? item.result.followUpEmailDraft.split("\n").slice(2).join("\n")
            : null,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Erreur envoi");
    } catch (error) {
      setBatchItems((prev) =>
        prev.map((i) =>
          i.localId === localId
            ? { ...i, status: "ready", error: `Erreur envoi: ${error instanceof Error ? error.message : ""}` }
            : i
        )
      );
    }
  }

  async function sendAllReady() {
    setBatchSendingAll(true);
    const readyItems = batchItems.filter((i) => i.status === "ready");
    await Promise.all(readyItems.map((i) => sendBatchEmail(i.localId)));
    setBatchSendingAll(false);
    setStatus(`${readyItems.length} email(s) envoyé(s)`);
  }

  async function loadProductionSteps() {
    setProductionStepsLoading(true);
    try {
      const res = await fetch("/api/production-steps");
      const data = await res.json() as { ok: boolean; steps?: ProductionStep[] };
      if (data.ok && data.steps) {
        setProductionSteps(data.steps);
        if (!selectedStepKey && data.steps.length > 0) {
          setSelectedStepKey(data.steps[0].step_key);
        }
      }
    } finally {
      setProductionStepsLoading(false);
    }
  }

  async function saveProductionStep(id: number) {
    const min = parseInt(editingStepMin, 10);
    if (isNaN(min) || min < 0) { setEditingStepId(null); return; }
    const maxRaw = parseInt(editingStepMax, 10);
    const max = (!editingStepMax.trim() || isNaN(maxRaw)) ? null : maxRaw;

    setProductionSteps((prev) =>
      prev.map((s) => s.id === id ? { ...s, lead_time_min: min, lead_time_max: max, lead_time_unit: editingStepUnit, updated_at: new Date().toISOString() } : s)
    );
    setEditingStepId(null);

    await fetch("/api/production-steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, lead_time_min: min, lead_time_max: max, lead_time_unit: editingStepUnit }),
    });
  }

  async function analyzeProductionItem(localId: string, orderId: string, productId: string, stepKey: string, direction: ProductionDirection) {
    try {
      const res = await fetch("/api/production-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, product_id: productId, step_key: stepKey, direction }),
      });
      const data = await res.json() as ProductionNotifyApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || "Erreur API");
      setProductionBatch((prev) =>
        prev.map((item) => item.localId === localId ? { ...item, status: "ready", result: data.result ?? null } : item)
      );
    } catch (error) {
      setProductionBatch((prev) =>
        prev.map((item) => item.localId === localId ? { ...item, status: "error", error: error instanceof Error ? error.message : "Erreur" } : item)
      );
    }
  }

  function submitProductionScan(id: string) {
    if (productionScanStep === "order") {
      setProductionOrderId(id);
      setProductionScanStep("product");
      setStatus(`Commande ${id} — scannez le produit`);
      return;
    }
    if (!productionOrderId) return;
    const step = productionSteps.find((s) => s.step_key === selectedStepKey);
    if (!step) return;

    const localId = crypto.randomUUID();
    setProductionBatch((prev) => [{
      localId,
      orderId: productionOrderId,
      productId: id,
      stepKey: selectedStepKey,
      stepName: step.name,
      direction: productionDirection,
      status: "analyzing",
      result: null,
      error: null,
    }, ...prev]);
    setProductionScanStep("order");
    setProductionOrderId(null);
    setStatus(`${step.name} ${productionDirection === "IN" ? "▶ Entrée" : "◀ Sortie"} — scannez suivant`);
    playBeep();
    void analyzeProductionItem(localId, productionOrderId, id, selectedStepKey, productionDirection);
  }

  async function loadSuppliers() {
    setSuppliersLoading(true);
    try {
      const res = await fetch("/api/supplier-lead-times");
      const data = await res.json() as { ok: boolean; suppliers?: SupplierRow[] };
      if (data.ok) setSuppliers(data.suppliers ?? []);
    } finally {
      setSuppliersLoading(false);
    }
  }

  async function saveLeadTime(supplierId: number, supplierName: string) {
    const min = parseInt(editingMin, 10);
    if (isNaN(min) || min < 0) {
      setEditingId(null);
      return;
    }
    const maxRaw = parseInt(editingMax, 10);
    const max = (!editingMax.trim() || isNaN(maxRaw)) ? null : maxRaw;

    setSuppliers((prev) =>
      prev.map((s) =>
        s.supplier_id === supplierId
          ? { ...s, lead_time_min: min, lead_time_max: max, updated_at: new Date().toISOString() }
          : s
      )
    );
    setEditingId(null);

    await fetch("/api/supplier-lead-times", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplier_id: supplierId, supplier_name: supplierName, lead_time_min: min, lead_time_max: max }),
    });
  }

  function undoLastLocal() {
    setScanLines((prev) => prev.slice(1));
    setStatus("Dernier scan retiré localement");
  }

  function resetSession() {
    const newId = crypto.randomUUID();
    sessionStorage.setItem("scanner_session_id", newId);
    setSessionId(newId);
    setScanLines([]);
    setLastScan("-");
    setStatus("Nouvelle session");
    setLastVariantName("-");
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Scanner stock</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          className={`rounded-xl border px-5 py-3 ${mode === "scan" && direction === "IN" ? "font-bold ring-2" : ""} ${mode === "recipe" ? "opacity-40" : ""}`}
          onClick={() => { setMode("scan"); setDirection("IN"); }}
        >
          Entrée
        </button>
        <button
          className={`rounded-xl border px-5 py-3 ${mode === "scan" && direction === "OUT" ? "font-bold ring-2" : ""} ${mode === "recipe" ? "opacity-40" : ""}`}
          onClick={() => { setMode("scan"); setDirection("OUT"); }}
        >
          Sortie
        </button>
        <button
          className={`rounded-xl border px-5 py-3 ${mode === "recipe" ? "font-bold ring-2" : ""}`}
          onClick={() => { setMode("recipe"); setRecipeResult(null); setStatus("Scannez un produit Shopify"); }}
        >
          Mode Recette
        </button>
        <button
          className={`rounded-xl border px-5 py-3 ${mode === "backorder" ? "font-bold ring-2" : ""}`}
          onClick={() => { setMode("backorder"); setBackorderStep("order"); setBackorderOrderId(null); setStatus("Scannez le numéro de commande"); }}
        >
          Mode Suivi
        </button>
        <button
          className={`rounded-xl border px-5 py-3 ${mode === "suppliers" ? "font-bold ring-2" : ""}`}
          onClick={() => { setMode("suppliers"); if (suppliers.length === 0) loadSuppliers(); }}
        >
          Fournisseurs
        </button>
        <button
          className={`rounded-xl border px-5 py-3 ${mode === "production" ? "font-bold ring-2" : ""}`}
          onClick={() => {
            setMode("production");
            setProductionView("scan");
            setProductionScanStep("order");
            setProductionOrderId(null);
            if (productionSteps.length === 0) loadProductionSteps();
            setStatus("Sélectionnez une étape et scannez une commande");
          }}
        >
          Production
        </button>
        <button className="rounded-xl border px-5 py-3" onClick={undoLastLocal}>
          Annuler local
        </button>
        <button className="rounded-xl border px-5 py-3" onClick={resetSession}>
          Nouvelle session
        </button>
      </div>


<div className="mb-6 grid gap-3 md:grid-cols-4">
			  <div className="rounded-2xl border p-4">
			    <div className="text-sm opacity-70">Mode</div>
			    <div className="text-2xl font-semibold">{direction}</div>
			  </div>
			  <div className="rounded-2xl border p-4">
			    <div className="text-sm opacity-70">Dernier code-barres</div>
			    <div className="text-2xl font-semibold">{lastScan}</div>
			  </div>
			  <div className="rounded-2xl border p-4">
			    <div className="text-sm opacity-70">Variante</div>
			    <div className="text-xl font-semibold">{lastVariantName}</div>
			  </div>
			  <div className="rounded-2xl border p-4">
			    <div className="text-sm opacity-70">Statut</div>
			    <div className="text-xl font-semibold">{status}</div>
			  </div>
			</div>

      {mode !== "suppliers" && !(mode === "production" && productionView === "steps") && (
        <div className="mb-6 rounded-2xl border p-4">
          <div className="mb-2 text-sm opacity-70">Buffer scanner</div>
          <div className="font-mono text-lg">{buffer || "—"}</div>
        </div>
      )}

      {mode === "scan" && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border p-4">
            <h2 className="mb-4 text-xl font-semibold">Compteur session</h2>
            <ul className="space-y-2">
              {counts.length === 0 ? (
                <li className="opacity-60">Aucun scan</li>
              ) : (
                counts.map(([sku, qty]) => (
                  <li key={sku} className="flex justify-between">
                    <span className="font-mono">{sku}</span>
                    <span>× {qty}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border p-4">
            <h2 className="mb-4 text-xl font-semibold">Derniers scans</h2>
            <ul className="space-y-2">
              {scanLines.length === 0 ? (
                <li className="opacity-60">Aucun scan</li>
              ) : (
                scanLines.slice(0, 20).map((line, idx) => (
                  <li key={`${line.sku}-${line.ts}-${idx}`} className="flex justify-between">
                    <span className="font-mono">{line.sku}</span>
                    <span className="opacity-60">
                      {new Date(line.ts).toLocaleTimeString()}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      {mode === "backorder" && (
        <section className="rounded-2xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mode Suivi — Batch</h2>
            {batchItems.length > 0 && (
              <button
                className="text-sm opacity-40 hover:opacity-80"
                onClick={() => setBatchItems([])}
              >
                Vider la liste
              </button>
            )}
          </div>

          <div className="flex gap-3 text-sm">
            <span className={`rounded-full px-3 py-1 border ${backorderStep === "order" ? "font-bold ring-2" : "opacity-40"}`}>
              1 · Commande
            </span>
            <span className={`rounded-full px-3 py-1 border ${backorderStep === "product" ? "font-bold ring-2" : "opacity-40"}`}>
              2 · Produit
            </span>
          </div>

          <p className="text-sm opacity-60">
            {backorderStep === "order"
              ? "Scannez le numéro de commande Shopify"
              : <span>Commande <span className="font-mono font-semibold text-black">{backorderOrderId}</span> — scannez le produit</span>
            }
          </p>

          {batchItems.length > 0 && (
            <div className="space-y-2">
              {batchItems.map((item) => (
                <div
                  key={item.localId}
                  className={`rounded-xl border p-3 ${item.status === "sent" ? "opacity-50" : ""}`}
                >
                  {item.status === "analyzing" && (
                    <div className="flex items-center gap-2 text-sm opacity-60">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Commande {item.orderId} · analyse en cours...</span>
                    </div>
                  )}

                  {item.status === "error" && (
                    <div className="text-sm text-red-600">
                      Commande {item.orderId} · {item.error}
                    </div>
                  )}

                  {(item.status === "ready" || item.status === "sent") && item.result && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold">
                          {item.result.order.name}
                          <span className="font-normal opacity-70"> · {item.result.order.customer.firstName} {item.result.order.customer.lastName}</span>
                        </div>
                        <div className="truncate text-sm opacity-60">{item.result.product.productTitle}</div>
                        <div className="text-xs opacity-40">{item.result.order.customer.email} · {item.result.order.customer.locale.toUpperCase()}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {item.result.estimatedDelivery ? (
                          <span className="text-sm font-semibold text-green-700">
                            {new Date(item.result.estimatedDelivery).toLocaleDateString("fr-CH")}
                          </span>
                        ) : (
                          <span className="text-sm opacity-40">Pas de PO</span>
                        )}
                        {item.status === "sent" ? (
                          <span className="text-sm text-blue-600">Envoyé ✓</span>
                        ) : (
                          <button
                            onClick={() => sendBatchEmail(item.localId)}
                            className="rounded-lg bg-black px-3 py-1 text-sm text-white"
                          >
                            Envoyer
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {batchItems.some((i) => i.status === "ready") && (
            <button
              disabled={batchSendingAll}
              onClick={sendAllReady}
              className="w-full rounded-xl bg-black px-5 py-3 font-semibold text-white disabled:opacity-40"
            >
              {batchSendingAll
                ? "Envoi en cours..."
                : `Envoyer tous les emails prêts (${batchItems.filter((i) => i.status === "ready").length})`
              }
            </button>
          )}
        </section>
      )}

      {mode === "production" && (
        <section className="rounded-2xl border p-4 space-y-4">
          {/* Sub-nav */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mode Production</h2>
            <div className="flex gap-2 text-sm">
              <button
                className={`rounded-lg border px-3 py-1 ${productionView === "scan" ? "font-bold ring-2" : "opacity-60"}`}
                onClick={() => setProductionView("scan")}
              >Scanner</button>
              <button
                className={`rounded-lg border px-3 py-1 ${productionView === "steps" ? "font-bold ring-2" : "opacity-60"}`}
                onClick={() => { setProductionView("steps"); if (productionSteps.length === 0) loadProductionSteps(); }}
              >Étapes</button>
            </div>
          </div>

          {/* ── SCAN VIEW ── */}
          {productionView === "scan" && (
            <div className="space-y-4">
              {/* Step selector + direction */}
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  className="rounded-xl border px-3 py-2 text-sm font-medium"
                  value={selectedStepKey}
                  onChange={(e) => { setSelectedStepKey(e.target.value); e.currentTarget.blur(); }}
                >
                  {productionSteps.length === 0 && <option value="">Chargement…</option>}
                  {productionSteps.map((s) => (
                    <option key={s.step_key} value={s.step_key}>{s.name}</option>
                  ))}
                </select>
                <div className="flex rounded-xl border overflow-hidden text-sm">
                  <button
                    className={`px-4 py-2 ${productionDirection === "IN" ? "bg-black text-white font-bold" : "opacity-50"}`}
                    onClick={() => setProductionDirection("IN")}
                  >▶ Entrée atelier</button>
                  <button
                    className={`px-4 py-2 ${productionDirection === "OUT" ? "bg-black text-white font-bold" : "opacity-50"}`}
                    onClick={() => setProductionDirection("OUT")}
                  >◀ Sortie atelier</button>
                </div>
              </div>

              {/* Scan steps indicator */}
              <div className="flex gap-3 text-sm">
                <span className={`rounded-full px-3 py-1 border ${productionScanStep === "order" ? "font-bold ring-2" : "opacity-40"}`}>1 · Commande</span>
                <span className={`rounded-full px-3 py-1 border ${productionScanStep === "product" ? "font-bold ring-2" : "opacity-40"}`}>2 · Produit</span>
              </div>

              <p className="text-sm opacity-60">
                {productionScanStep === "order"
                  ? "Scannez le numéro de commande Shopify"
                  : <span>Commande <span className="font-mono font-semibold text-black">{productionOrderId}</span> — scannez le produit</span>
                }
              </p>

              {/* Batch queue */}
              {productionBatch.length > 0 && (
                <div className="space-y-2">
                  {productionBatch.map((item) => (
                    <div key={item.localId} className="rounded-xl border p-3">
                      {item.status === "analyzing" && (
                        <div className="flex items-center gap-2 text-sm opacity-60">
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>{item.stepName} {item.direction === "IN" ? "▶" : "◀"} — Commande {item.orderId}</span>
                        </div>
                      )}
                      {item.status === "error" && (
                        <div className="text-sm text-red-600">{item.stepName} — Commande {item.orderId} · {item.error}</div>
                      )}
                      {item.status === "ready" && item.result && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold mr-2 ${item.direction === "IN" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                                {item.direction === "IN" ? "▶ Entrée" : "◀ Sortie"} {item.stepName}
                              </span>
                              <span className="font-semibold">{item.result.order.name}</span>
                              <span className="opacity-60"> · {item.result.order.customer.firstName} {item.result.order.customer.lastName}</span>
                            </div>
                            <span className="text-xs text-green-600 font-semibold">Envoyé ✓</span>
                          </div>
                          <div className="text-xs opacity-40">{item.result.product.productTitle} · {item.result.order.customer.email}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {productionBatch.length > 0 && (
                <button className="text-sm opacity-40 hover:opacity-80" onClick={() => setProductionBatch([])}>
                  Vider la liste
                </button>
              )}
            </div>
          )}

          {/* ── STEPS SETTINGS VIEW ── */}
          {productionView === "steps" && (
            <div className="space-y-3">
              <p className="text-sm opacity-60">Durée estimée par étape — utilisée dans les emails clients.</p>
              {productionStepsLoading && productionSteps.length === 0 && <p className="opacity-60">Chargement…</p>}
              {productionSteps.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left opacity-60">
                      <th className="py-2 pr-4">Étape</th>
                      <th className="py-2 pr-4">Minimum</th>
                      <th className="py-2 pr-4">Maximum</th>
                      <th className="py-2 pr-4">Unité</th>
                      <th className="py-2 text-xs font-normal">Modifié</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionSteps.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium">{s.name}</td>
                        {editingStepId === s.id ? (
                          <>
                            <td className="py-2 pr-2">
                              <input type="number" min="0" placeholder="min" className="w-16 rounded border px-2 py-1 text-sm"
                                value={editingStepMin} autoFocus
                                onChange={(e) => setEditingStepMin(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") void saveProductionStep(s.id); if (e.key === "Escape") setEditingStepId(null); }}
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <input type="number" min="0" placeholder="max" className="w-16 rounded border px-2 py-1 text-sm"
                                value={editingStepMax}
                                onChange={(e) => setEditingStepMax(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") void saveProductionStep(s.id); if (e.key === "Escape") setEditingStepId(null); }}
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <select className="rounded border px-2 py-1 text-sm" value={editingStepUnit}
                                onChange={(e) => setEditingStepUnit(e.target.value as "hours" | "days")}
                                onBlur={() => void saveProductionStep(s.id)}
                              >
                                <option value="hours">heures</option>
                                <option value="days">jours</option>
                              </select>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 pr-2">
                              <button className="rounded px-2 py-1 hover:bg-gray-100 min-w-[3rem] text-left"
                                onClick={() => { setEditingStepId(s.id); setEditingStepMin(s.lead_time_min != null ? String(s.lead_time_min) : ""); setEditingStepMax(s.lead_time_max != null ? String(s.lead_time_max) : ""); setEditingStepUnit(s.lead_time_unit); }}>
                                {s.lead_time_min != null ? <span className="font-semibold">{s.lead_time_min}</span> : <span className="opacity-30">—</span>}
                              </button>
                            </td>
                            <td className="py-2 pr-2">
                              <button className="rounded px-2 py-1 hover:bg-gray-100 min-w-[3rem] text-left"
                                onClick={() => { setEditingStepId(s.id); setEditingStepMin(s.lead_time_min != null ? String(s.lead_time_min) : ""); setEditingStepMax(s.lead_time_max != null ? String(s.lead_time_max) : ""); setEditingStepUnit(s.lead_time_unit); }}>
                                {s.lead_time_max != null ? <span className="font-semibold">{s.lead_time_max}</span> : <span className="opacity-30">—</span>}
                              </button>
                            </td>
                            <td className="py-2 pr-4 opacity-60">{s.lead_time_unit === "hours" ? "heures" : "jours"}</td>
                          </>
                        )}
                        <td className="py-2 text-xs opacity-40">{s.updated_at ? new Date(s.updated_at).toLocaleDateString("fr-CH") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      )}

      {mode === "suppliers" && (
        <section className="rounded-2xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Délais fournisseurs par défaut</h2>
            <button
              onClick={loadSuppliers}
              disabled={suppliersLoading}
              className="text-sm opacity-50 hover:opacity-100 disabled:opacity-30"
            >
              {suppliersLoading ? "Chargement..." : "Actualiser"}
            </button>
          </div>

          <p className="text-sm opacity-60">
            Délai utilisé en fallback quand aucun PO ouvert n'est trouvé pour ce fournisseur.
          </p>

          {suppliersLoading && suppliers.length === 0 && (
            <p className="opacity-60">Chargement des fournisseurs Katana...</p>
          )}

          {suppliers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left opacity-60">
                    <th className="py-2 pr-6">Fournisseur</th>
                    <th className="py-2 pr-6">Délai minimum</th>
                    <th className="py-2 pr-6">Délai maximum</th>
                    <th className="py-2 text-xs font-normal">Modifié</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.supplier_id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-6 font-medium">{s.supplier_name}</td>
                      {editingId === s.supplier_id ? (
                        <>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min="0"
                              placeholder="ex: 15"
                              className="w-20 rounded border px-2 py-1 text-sm"
                              value={editingMin}
                              autoFocus
                              onChange={(e) => setEditingMin(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveLeadTime(s.supplier_id, s.supplier_name);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="ex: 20"
                                className="w-20 rounded border px-2 py-1 text-sm"
                                value={editingMax}
                                onChange={(e) => setEditingMax(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void saveLeadTime(s.supplier_id, s.supplier_name);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                onBlur={() => void saveLeadTime(s.supplier_id, s.supplier_name)}
                              />
                              <span className="text-xs opacity-50">jours</span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-3">
                            <button
                              className="rounded px-2 py-1 hover:bg-gray-100 min-w-[4rem] text-left"
                              onClick={() => {
                                setEditingId(s.supplier_id);
                                setEditingMin(s.lead_time_min != null ? String(s.lead_time_min) : "");
                                setEditingMax(s.lead_time_max != null ? String(s.lead_time_max) : "");
                              }}
                            >
                              {s.lead_time_min != null ? (
                                <span className="font-semibold">{s.lead_time_min}j</span>
                              ) : (
                                <span className="opacity-30">—</span>
                              )}
                            </button>
                          </td>
                          <td className="py-2 pr-3">
                            <button
                              className="rounded px-2 py-1 hover:bg-gray-100 min-w-[4rem] text-left"
                              onClick={() => {
                                setEditingId(s.supplier_id);
                                setEditingMin(s.lead_time_min != null ? String(s.lead_time_min) : "");
                                setEditingMax(s.lead_time_max != null ? String(s.lead_time_max) : "");
                              }}
                            >
                              {s.lead_time_max != null ? (
                                <span className="font-semibold">{s.lead_time_max}j</span>
                              ) : (
                                <span className="opacity-30">—</span>
                              )}
                            </button>
                          </td>
                        </>
                      )}
                      <td className="py-2 text-xs opacity-40">
                        {s.updated_at ? new Date(s.updated_at).toLocaleDateString("fr-CH") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {mode === "recipe" && (
        <section className="rounded-2xl border p-4">
          <h2 className="mb-4 text-xl font-semibold">Recette de fabrication</h2>

          {recipeLoading && <p className="opacity-60">Chargement...</p>}

          {!recipeLoading && !recipeResult && (
            <p className="opacity-60">Scannez un code-barres produit Shopify</p>
          )}

          {recipeResult && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-sm opacity-70">Produit Shopify</div>
                <div className="font-semibold">{recipeResult.shopify.productTitle}</div>
                <div className="font-mono text-sm opacity-70">
                  SKU : {recipeResult.shopify.sku || "—"} · Taille : {recipeResult.shopify.variantTitle}
                </div>
              </div>

              {!recipeResult.recipe ? (
                <p className="opacity-60">Aucune recette Katana trouvée pour ce SKU</p>
              ) : (
                <div>
                  <div className="mb-2 text-sm font-semibold opacity-70">
                    Matériaux ({recipeResult.recipe.ingredients.length})
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left opacity-60">
                        <th className="py-1 pr-4">Matière</th>
                        <th className="py-1 pr-4">SKU</th>
                        <th className="py-1 pr-4">Qté</th>
                        <th className="py-1">Fournisseur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeResult.recipe.ingredients.map((ing) => (
                        <tr key={ing.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{ing.name}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{ing.sku ?? "—"}</td>
                          <td className="py-2 pr-4">{ing.quantity}{ing.unit ? ` ${ing.unit}` : ""}</td>
                          <td className="py-2">{ing.supplier?.name ?? <span className="opacity-40">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

