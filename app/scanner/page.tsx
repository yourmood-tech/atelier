"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Direction, ScanApiResponse, RecipeLookupApiResponse, RecipeLookupResult, BackorderApiResponse, BackorderAnalysis } from "@/lib/types";

type ScanLine = {
  sku: string;
  ts: number;
};

type AppMode = "scan" | "recipe" | "backorder";
type BackorderStep = "order" | "product";

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
  const [backorderResult, setBackorderResult] = useState<BackorderAnalysis | null>(null);
  const [backorderLoading, setBackorderLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const lastAcceptedRef = useRef<{ sku: string; ts: number } | null>(null);

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

  useEffect(() => {
    inputRef.current?.focus();

    const interval = window.setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 300);

    return () => window.clearInterval(interval);
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

  async function submitBackorderScan(id: string) {
    if (backorderStep === "order") {
      setBackorderOrderId(id);
      setBackorderStep("product");
      setStatus(`Commande ${id} enregistrée — scannez le produit`);
      return;
    }

    // step === "product"
    if (!backorderOrderId) return;
    setBackorderLoading(true);
    setBackorderResult(null);
    setEmailSent(false);
    setStatus("Analyse en cours...");

    try {
      const res = await fetch(
        `/api/backorder-notify?order_id=${encodeURIComponent(backorderOrderId)}&product_id=${encodeURIComponent(id)}`
      );
      const data = (await res.json()) as BackorderApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || "Erreur API");
      setBackorderResult(data.result ?? null);
      setStatus(`Analyse complète · ${data.result?.order.name ?? ""}`);
      playBeep();
    } catch (error) {
      setStatus(`Erreur · ${error instanceof Error ? error.message : "inconnue"}`);
    } finally {
      setBackorderLoading(false);
    }
  }

  async function sendBackorderEmail() {
    if (!backorderResult?.emailDraft || !backorderResult.order.customer.email) return;
    setEmailSending(true);

    const lines = backorderResult.emailDraft.split("\n");
    const subject = lines[0].replace(/^Subject:\s*/i, "");
    const body = lines.slice(2).join("\n");

    try {
      const res = await fetch("/api/backorder-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: backorderResult.order.customer.email,
          subject,
          body,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Erreur envoi");
      setEmailSent(true);
      setStatus("Email envoyé");
    } catch (error) {
      setStatus(`Erreur envoi · ${error instanceof Error ? error.message : "inconnue"}`);
    } finally {
      setEmailSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const current = buffer;
      setBuffer("");
      void submitScan(current);
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      setBuffer((prev) => prev.slice(0, -1));
      return;
    }

    if (e.key.length === 1) {
      setBuffer((prev) => prev + e.key);
    }
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
          onClick={() => { setMode("backorder"); setBackorderStep("order"); setBackorderOrderId(null); setBackorderResult(null); setEmailSent(false); setStatus("Scannez le numéro de commande"); }}
        >
          Mode Suivi
        </button>
        <button className="rounded-xl border px-5 py-3" onClick={undoLastLocal}>
          Annuler local
        </button>
        <button className="rounded-xl border px-5 py-3" onClick={resetSession}>
          Nouvelle session
        </button>
      </div>

      <input
        ref={inputRef}
        value=""
        onChange={() => {}}
        onKeyDown={onKeyDown}
        autoFocus
        className="pointer-events-none absolute opacity-0"
      />

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

      <div className="mb-6 rounded-2xl border p-4">
        <div className="mb-2 text-sm opacity-70">Buffer scanner</div>
        <div className="font-mono text-lg">{buffer || "—"}</div>
      </div>

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
          <h2 className="text-xl font-semibold">Suivi commande — rupture de stock</h2>

          <div className="flex gap-3 text-sm">
            <span className={`rounded-full px-3 py-1 border ${backorderStep === "order" && !backorderOrderId ? "font-bold ring-2" : "opacity-50"}`}>
              1 · Commande
            </span>
            <span className={`rounded-full px-3 py-1 border ${backorderStep === "product" ? "font-bold ring-2" : "opacity-50"}`}>
              2 · Produit
            </span>
          </div>

          {backorderOrderId && (
            <div className="text-sm opacity-70">Commande : <span className="font-mono font-semibold text-black">{backorderOrderId}</span></div>
          )}

          {backorderLoading && <p className="opacity-60">Analyse en cours...</p>}

          {!backorderLoading && !backorderResult && (
            <p className="opacity-60">
              {backorderStep === "order" ? "Scannez le numéro de commande Shopify" : "Scannez le produit en rupture de stock"}
            </p>
          )}

          {backorderResult && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-3 space-y-1">
                <div className="font-semibold">{backorderResult.order.name} · {backorderResult.order.customer.firstName} {backorderResult.order.customer.lastName}</div>
                <div className="text-sm opacity-70">{backorderResult.order.customer.email} · langue : {backorderResult.order.customer.locale.toUpperCase()}</div>
                <div className="text-sm">Produit : <span className="font-semibold">{backorderResult.product.productTitle}</span></div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3 space-y-1">
                <div className="text-sm font-semibold opacity-70">Fournisseur & délai</div>
                {backorderResult.purchaseOrder ? (
                  <>
                    <div className="text-sm">PO <span className="font-mono">{backorderResult.purchaseOrder.number}</span> · {backorderResult.purchaseOrder.supplierName}</div>
                    <div className="text-sm">ETA : <span className="font-semibold">{backorderResult.estimatedDelivery ? new Date(backorderResult.estimatedDelivery).toLocaleDateString("fr-CH") : "—"}</span></div>
                  </>
                ) : (
                  <div className="text-sm opacity-60">Aucun PO ouvert trouvé{backorderResult.leadTimeDays ? ` · délai standard : ${backorderResult.leadTimeDays}j` : ""}</div>
                )}
              </div>

              {backorderResult.emailDraft && (
                <div className="rounded-xl border p-3 space-y-2">
                  <div className="text-sm font-semibold opacity-70">Email généré</div>
                  <pre className="text-sm whitespace-pre-wrap font-sans">{backorderResult.emailDraft}</pre>
                  <button
                    disabled={emailSent || emailSending}
                    onClick={sendBackorderEmail}
                    className="rounded-xl bg-black text-white px-5 py-2 text-sm disabled:opacity-40"
                  >
                    {emailSent ? "Envoyé ✓" : emailSending ? "Envoi..." : `Envoyer à ${backorderResult.order.customer.email}`}
                  </button>
                </div>
              )}

              <button
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => { setBackorderStep("order"); setBackorderOrderId(null); setBackorderResult(null); setEmailSent(false); setStatus("Scannez le numéro de commande"); }}
              >
                Nouvelle analyse
              </button>
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

