"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Direction, ScanApiResponse } from "@/lib/types";

type ScanLine = {
  sku: string;
  ts: number;
};

export default function ScannerPage() {
  const [direction, setDirection] = useState<Direction>("OUT");
  const [buffer, setBuffer] = useState("");
  const [status, setStatus] = useState("Prêt");
  const [lastScan, setLastScan] = useState<string>("-");
  const [scanLines, setScanLines] = useState<ScanLine[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastVariantName, setLastVariantName] = useState<string>("-");

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

      <div className="mb-6 flex gap-3">
        <button
          className={`rounded-xl border px-5 py-3 ${direction === "IN" ? "font-bold ring-2" : ""}`}
          onClick={() => setDirection("IN")}
        >
          Entrée
        </button>
        <button
          className={`rounded-xl border px-5 py-3 ${direction === "OUT" ? "font-bold ring-2" : ""}`}
          onClick={() => setDirection("OUT")}
        >
          Sortie
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
    </main>
  );
}

