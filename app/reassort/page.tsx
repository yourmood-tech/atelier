"use client";

import { useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "volatile" | "continuous";

interface Params {
  mode: Mode;
  leadTimeDays: number;
  reviewPeriodDays: number;
  safetyDays: number;
  minOrderQty: number;
  roundToPack: number;
  positive30dOr90dOnly: boolean;
  continuousSalesOnly: boolean;
}

interface PeriodRow {
  sku: string;
  name: string;
  supplier: string;
  inStock: number;
  expected: number;
  totalQty: number;
  avgDemandReported: number;
  daysOfInventory: number;
  dailyDemand: number;
}

interface MergedRow {
  sku: string;
  name: string;
  supplier: string;
  inStock7: number; inStock30: number; inStock90: number;
  expected7: number; expected30: number; expected90: number;
  totalQty7: number; totalQty30: number; totalQty90: number;
  dailyDemand7: number; dailyDemand30: number; dailyDemand90: number;
  avgDemandReported7: number; avgDemandReported30: number; avgDemandReported90: number;
  currentStock: number;
  incomingStock: number;
  stockPosition: number;
  salesShare7in30: number;
  salesShare30in90: number;
  demandVolatility: number;
  planningDailyDemandVolatile: number;
  planningDailyDemandContinuous: number;
  continuousSalesFlag: boolean;
  continuityNote: string;
}

interface ResultRow {
  sku: string;
  name: string;
  supplier: string;
  currentStock: number;
  incomingStock: number;
  stockPosition: number;
  totalQty7: number;
  totalQty30: number;
  totalQty90: number;
  dailyDemand7: number;
  dailyDemand30: number;
  dailyDemand90: number;
  continuousSalesFlag: boolean;
  continuityNote: string;
  planningDailyDemand: number;
  demandVolatility: number;
  estimatedCoverDays: number;
  protectionDays: number;
  targetStock: number;
  recommendedQty: number;
  riskNote: string;
}

// ─── Aliases colonnes ─────────────────────────────────────────────────────────

const COLUMN_ALIASES: Record<string, string[]> = {
  Sku: ["Sku", "SKU", "Product SKU"],
  Name: ["Products - Name", "Name", "Product Name", "Products Name"],
  "Quantity In Stock": ["Quantity In Stock", "In Stock", "Qty In Stock"],
  "Quantity Expected": ["Quantity Expected", "Expected", "Qty Expected"],
  "Total Qty": ["Total Qty", "Total Quantity", "Qty Sold", "Quantity Sold"],
  "Average Demand per Day in Sales Period": [
    "Average Demand per Day in Sales Period",
    "Average Demand per Day",
    "Avg Demand per Day",
  ],
  "Days of Inventory": ["Days of Inventory", "Inventory Days", "Days Inventory"],
};

const PERIOD_DAYS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

// ─── Parsing CSV ──────────────────────────────────────────────────────────────

function detectSeparator(text: string): string {
  const sample = text.slice(0, 4096);
  return sample.split(";").length > sample.split(",").length ? ";" : ",";
}

function parseCSV(text: string): Record<string, string>[] {
  const sep = detectSeparator(text);
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^﻿/, "").replace(/^"|"$/g, ""));

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

function normalizeColumns(rows: Record<string, string>[], fileName: string): Record<string, string>[] {
  if (rows.length === 0) return [];
  const availableCols = Object.keys(rows[0]);
  const renameMap: Record<string, string> = {};
  const missing: string[] = [];

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = aliases.find((a) => availableCols.includes(a));
    if (!found) {
      missing.push(canonical);
    } else {
      renameMap[found] = canonical;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Le fichier "${fileName}" manque ces colonnes : ${missing.join(", ")}\n\nColonnes détectées : ${availableCols.join(", ")}`
    );
  }

  return rows.map((row) => {
    const newRow: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      newRow[renameMap[k] ?? k] = v;
    }
    return newRow;
  });
}

function toNum(v: string | undefined): number {
  const n = parseFloat((v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function loadPeriodRows(rows: Record<string, string>[], label: string): Map<string, PeriodRow> {
  const days = PERIOD_DAYS[label];
  const map = new Map<string, PeriodRow>();
  for (const row of rows) {
    const sku = (row["Sku"] ?? "").trim();
    if (!sku) continue;
    const totalQty = toNum(row["Total Qty"]);
    map.set(sku, {
      sku,
      name: (row["Name"] ?? "").trim(),
      supplier: (row["Suppliers - Name"] ?? row["Supplier"] ?? row["Supplier Name"] ?? "").trim(),
      inStock: toNum(row["Quantity In Stock"]),
      expected: toNum(row["Quantity Expected"]),
      totalQty,
      avgDemandReported: toNum(row["Average Demand per Day in Sales Period"]),
      daysOfInventory: toNum(row["Days of Inventory"]),
      dailyDemand: totalQty / days,
    });
  }
  return map;
}

// ─── Merge & calcul ───────────────────────────────────────────────────────────

function safeRatio(num: number, den: number, fallback = 0): number {
  if (den > 0) return num / den;
  return num > 0 ? fallback : 0;
}

function stddev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
}

function mergeSources(
  map7: Map<string, PeriodRow>,
  map30: Map<string, PeriodRow>,
  map90: Map<string, PeriodRow>
): MergedRow[] {
  const allSkus = new Set([...map7.keys(), ...map30.keys(), ...map90.keys()]);
  const result: MergedRow[] = [];

  for (const sku of allSkus) {
    const r7 = map7.get(sku);
    const r30 = map30.get(sku);
    const r90 = map90.get(sku);

    const name = r7?.name || r30?.name || r90?.name || "";
    const supplier = r7?.supplier || r30?.supplier || r90?.supplier || "";

    const inStock7 = r7?.inStock ?? 0;
    const inStock30 = r30?.inStock ?? 0;
    const inStock90 = r90?.inStock ?? 0;
    const expected7 = r7?.expected ?? 0;
    const expected30 = r30?.expected ?? 0;
    const expected90 = r90?.expected ?? 0;
    const totalQty7 = r7?.totalQty ?? 0;
    const totalQty30 = r30?.totalQty ?? 0;
    const totalQty90 = r90?.totalQty ?? 0;
    const dailyDemand7 = r7?.dailyDemand ?? 0;
    const dailyDemand30 = r30?.dailyDemand ?? 0;
    const dailyDemand90 = r90?.dailyDemand ?? 0;

    const currentStock = Math.max(inStock7, inStock30, inStock90);
    const incomingStock = Math.max(expected7, expected30, expected90);
    const stockPosition = currentStock + incomingStock;

    const salesShare7in30 = safeRatio(totalQty7, totalQty30, 1.0);
    const salesShare30in90 = safeRatio(totalQty30, totalQty90, 1.0);
    const demandVolatility = stddev([dailyDemand7, dailyDemand30, dailyDemand90]);

    const planningDailyDemandVolatile = Math.max(
      0.80 * dailyDemand7 + 0.15 * dailyDemand30 + 0.05 * dailyDemand90,
      dailyDemand7
    );
    const raw = 0.15 * dailyDemand7 + 0.50 * dailyDemand30 + 0.35 * dailyDemand90;
    const planningDailyDemandContinuous = Math.max(raw, dailyDemand30);

    const continuousSalesFlag =
      totalQty7 > 0 &&
      totalQty30 > 0 &&
      totalQty90 > 0 &&
      salesShare7in30 <= 0.70 &&
      salesShare30in90 <= 0.80;

    let continuityNote: string;
    if (continuousSalesFlag) {
      continuityNote = "Ventes continues sur 7j / 30j / 90j";
    } else if (totalQty7 > 0 && salesShare7in30 > 0.70) {
      continuityNote = "Trop concentré sur les 7 derniers jours";
    } else if (totalQty30 > 0 && salesShare30in90 > 0.80) {
      continuityNote = "Trop concentré sur les 30 derniers jours";
    } else {
      continuityNote = "Historique insuffisant ou discontinu";
    }

    result.push({
      sku, name, supplier,
      inStock7, inStock30, inStock90,
      expected7, expected30, expected90,
      totalQty7, totalQty30, totalQty90,
      dailyDemand7, dailyDemand30, dailyDemand90,
      avgDemandReported7: r7?.avgDemandReported ?? 0,
      avgDemandReported30: r30?.avgDemandReported ?? 0,
      avgDemandReported90: r90?.avgDemandReported ?? 0,
      currentStock, incomingStock, stockPosition,
      salesShare7in30, salesShare30in90,
      demandVolatility,
      planningDailyDemandVolatile,
      planningDailyDemandContinuous,
      continuousSalesFlag,
      continuityNote,
    });
  }
  return result;
}

function roundUp(value: number, multiple: number): number {
  if (value <= 0) return 0;
  if (multiple <= 1) return Math.ceil(value);
  return Math.ceil(value / multiple) * multiple;
}

function computeRecommendations(params: Params, merged: MergedRow[]): ResultRow[] {
  let rows = [...merged];

  if (params.positive30dOr90dOnly) {
    rows = rows.filter((r) => r.totalQty30 > 0 || r.totalQty90 > 0);
  }

  const results: ResultRow[] = [];

  for (const r of rows) {
    let planningDailyDemand: number;
    let protectionDays: number;
    let targetStock: number;

    if (params.mode === "volatile") {
      if (params.continuousSalesOnly && !r.continuousSalesFlag) continue;
      planningDailyDemand = r.planningDailyDemandVolatile;
      protectionDays = params.leadTimeDays + params.reviewPeriodDays;
      targetStock = Math.ceil(
        planningDailyDemand * protectionDays + r.demandVolatility * params.safetyDays
      );
    } else {
      planningDailyDemand = r.planningDailyDemandContinuous;
      protectionDays = params.leadTimeDays + params.safetyDays;
      targetStock = Math.ceil(planningDailyDemand * protectionDays);
    }

    const estimatedCoverDays =
      planningDailyDemand > 0
        ? r.stockPosition / planningDailyDemand
        : r.stockPosition > 0
        ? 9999
        : 0;

    const rawQty = Math.max(0, targetStock - r.stockPosition);
    let recommendedQty = roundUp(rawQty, params.roundToPack);

    if (params.minOrderQty > 0 && recommendedQty > 0 && recommendedQty < params.minOrderQty) {
      recommendedQty = params.minOrderQty;
    }

    if (recommendedQty <= 0) continue;

    let riskNote = "";
    if (r.stockPosition <= 0) riskNote = "Aucun stock disponible / entrant";
    else if (estimatedCoverDays <= 7) riskNote = "Couverture critique ≤ 7 jours";
    else if (estimatedCoverDays <= 21) riskNote = "Couverture courte ≤ 21 jours";
    else if (estimatedCoverDays <= 45) riskNote = "Couverture à surveiller ≤ 45 jours";

    results.push({
      sku: r.sku,
      name: r.name,
      supplier: r.supplier,
      currentStock: r.currentStock,
      incomingStock: r.incomingStock,
      stockPosition: r.stockPosition,
      totalQty7: r.totalQty7,
      totalQty30: r.totalQty30,
      totalQty90: r.totalQty90,
      dailyDemand7: r.dailyDemand7,
      dailyDemand30: r.dailyDemand30,
      dailyDemand90: r.dailyDemand90,
      continuousSalesFlag: r.continuousSalesFlag,
      continuityNote: r.continuityNote,
      planningDailyDemand,
      demandVolatility: r.demandVolatility,
      estimatedCoverDays,
      protectionDays,
      targetStock,
      recommendedQty,
      riskNote,
    });
  }

  return results.sort((a, b) => {
    if (b.recommendedQty !== a.recommendedQty) return b.recommendedQty - a.recommendedQty;
    if (b.planningDailyDemand !== a.planningDailyDemand) return b.planningDailyDemand - a.planningDailyDemand;
    return a.estimatedCoverDays - b.estimatedCoverDays;
  });
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function f2(n: number): string { return n.toFixed(2); }
function fi(n: number): string { return Math.round(n).toString(); }

function exportCSV(rows: ResultRow[]): void {
  const headers = [
    "sku", "name", "supplier", "current_stock", "incoming_stock", "stock_position",
    "total_qty_7", "total_qty_30", "total_qty_90",
    "daily_demand_7", "daily_demand_30", "daily_demand_90",
    "continuous_sales_flag", "continuity_note",
    "planning_daily_demand", "demand_volatility",
    "estimated_cover_days", "protection_days", "target_stock",
    "recommended_qty", "risk_note",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.sku, `"${r.name}"`, `"${r.supplier}"`,
      fi(r.currentStock), fi(r.incomingStock), fi(r.stockPosition),
      fi(r.totalQty7), fi(r.totalQty30), fi(r.totalQty90),
      f2(r.dailyDemand7), f2(r.dailyDemand30), f2(r.dailyDemand90),
      r.continuousSalesFlag ? "true" : "false",
      `"${r.continuityNote}"`,
      f2(r.planningDailyDemand), f2(r.demandVolatility),
      f2(r.estimatedCoverDays), fi(r.protectionDays), fi(r.targetStock),
      fi(r.recommendedQty),
      `"${r.riskNote}"`,
    ].join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  a.href = url;
  a.download = `recommandations_reassort_${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function FileInput({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs font-semibold text-zinc-400 shrink-0">{label}</span>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors shrink-0"
      >
        Parcourir
      </button>
      <span className="text-xs text-zinc-400 truncate min-w-0">
        {file ? file.name : <span className="text-zinc-600 italic">aucun fichier</span>}
      </span>
      <input
        ref={ref}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
      />
    </div>
  );
}

function SpinInput({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-44 text-xs font-semibold text-zinc-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= min && v <= max) onChange(v);
          }}
          className="w-20 text-sm text-right bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-zinc-500"
        />
        {suffix && <span className="text-xs text-zinc-500">{suffix}</span>}
      </div>
    </div>
  );
}

function RiskBadge({ note }: { note: string }) {
  if (!note) return null;
  const color =
    note.includes("critique") ? "bg-red-900/60 text-red-300 border-red-800" :
    note.includes("courte") ? "bg-orange-900/60 text-orange-300 border-orange-800" :
    note.includes("surveiller") ? "bg-yellow-900/60 text-yellow-300 border-yellow-800" :
    "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${color} whitespace-nowrap`}>
      {note}
    </span>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const DEFAULT_PARAMS: Params = {
  mode: "volatile",
  leadTimeDays: 45,
  reviewPeriodDays: 30,
  safetyDays: 15,
  minOrderQty: 0,
  roundToPack: 1,
  positive30dOr90dOnly: true,
  continuousSalesOnly: true,
};

export default function ReassortPage() {
  const [file7, setFile7] = useState<File | null>(null);
  const [file30, setFile30] = useState<File | null>(null);
  const [file90, setFile90] = useState<File | null>(null);
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  type POResult = {
    pos: { supplierName: string; poNumber: string; poId: number; katanaUrl: string; lineCount: number; totalQty: number }[];
    unresolvedSkus: string[];
    unmatchedSuppliers: string[];
  };
  const [poResult, setPoResult] = useState<POResult | null>(null);
  const [poError, setPoError] = useState<string | null>(null);
  const [poLoading, setPoLoading] = useState(false);
  // Seuil : ne mettre dans le bon de commande que les articles avec PLUS de N pièces recommandées
  const [poMinQty, setPoMinQty] = useState(2);

  function set<K extends keyof Params>(key: K, value: Params[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  async function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file, "utf-8");
    });
  }

  async function generate() {
    if (!file7 || !file30 || !file90) {
      setError("Merci de sélectionner les 3 fichiers CSV.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setPoResult(null);
    setPoError(null);
    const lines: string[] = [];
    const addLog = (msg: string) => lines.push(msg);

    try {
      addLog("Lecture des fichiers...");

      const [text7, text30, text90] = await Promise.all([
        readFile(file7),
        readFile(file30),
        readFile(file90),
      ]);

      const parse = (text: string, name: string, label: string) => {
        const raw = parseCSV(text);
        const normalized = normalizeColumns(raw, name);
        return loadPeriodRows(normalized, label);
      };

      const map7 = parse(text7, file7.name, "7");
      const map30 = parse(text30, file30.name, "30");
      const map90 = parse(text90, file90.name, "90");

      addLog(`SKU trouvés — 7j: ${map7.size} | 30j: ${map30.size} | 90j: ${map90.size}`);

      const merged = mergeSources(map7, map30, map90);
      addLog(`SKU fusionnés (union): ${merged.length}`);

      if (params.mode === "volatile") {
        const continuous = merged.filter((r) => r.continuousSalesFlag).length;
        addLog(`SKU avec ventes continues: ${continuous}`);
        addLog("Mode volatil : 80% 7j + 15% 30j + 5% 90j");
      } else {
        addLog("Mode continu : 15% 7j + 50% 30j + 35% 90j");
        addLog("Stock cible = demande journalière × (délai + sécurité)");
      }

      const recs = computeRecommendations(params, merged);

      const totalUnits = recs.reduce((s, r) => s + r.recommendedQty, 0);
      addLog(`SKU recommandés : ${recs.length} | Unités totales : ${totalUnits}`);
      setResults(recs);
      setLog(lines);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLog(lines);
    } finally {
      setLoading(false);
    }
  }

  async function createPO() {
    if (!results || results.length === 0) return;
    // On ne garde que les articles avec PLUS de poMinQty pièces recommandées
    const eligible = results.filter((r) => r.recommendedQty > poMinQty);
    if (eligible.length === 0) {
      setPoError(`Aucun article avec plus de ${poMinQty} pièces recommandées.`);
      return;
    }
    setPoLoading(true);
    setPoError(null);
    setPoResult(null);
    try {
      const d = new Date();
      d.setDate(d.getDate() + params.leadTimeDays);
      const expectedArrival = d.toISOString().slice(0, 10);

      const res = await fetch("/api/reassort-po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: eligible.map((r) => ({
            sku: r.sku,
            name: r.name,
            quantity: r.recommendedQty,
            supplierName: r.supplier,
          })),
          expectedArrival,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du bon de commande");
      setPoResult(data as POResult);
    } catch (e) {
      setPoError(e instanceof Error ? e.message : String(e));
    } finally {
      setPoLoading(false);
    }
  }

  const totalUnits = results?.reduce((s, r) => s + r.recommendedQty, 0) ?? 0;
  const criticalCount = results?.filter((r) => r.riskNote.includes("critique")).length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <a href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Outils</a>
          <h1 className="text-2xl font-semibold text-zinc-50 mt-2">Réassort fournisseurs</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {params.mode === "volatile"
              ? "Mode volatil : forte pondération 7 derniers jours, filtre ventes continues."
              : "Mode continu : produits vendus régulièrement. Stock cible = délai + sécurité."}
          </p>
        </div>

        {/* Mode */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
          <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-500">Mode de calcul</h2>
          <div className="flex gap-3">
            {(["volatile", "continuous"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => set("mode", m)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  params.mode === m
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {m === "volatile" ? "Produits volatils / nouveautés" : "Produits à ventes continues"}
              </button>
            ))}
          </div>
        </div>

        {/* Fichiers */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-500">Fichiers source</h2>
          <FileInput label="Fichier 7 jours" file={file7} onFile={setFile7} />
          <FileInput label="Fichier 30 jours" file={file30} onFile={setFile30} />
          <FileInput label="Fichier 90 jours" file={file90} onFile={setFile90} />
        </div>

        {/* Paramètres */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-500">Paramètres</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SpinInput label="Délai de livraison" value={params.leadTimeDays} min={0} max={365} suffix="jours" onChange={(v) => set("leadTimeDays", v)} />
            <SpinInput label="Quantité minimum" value={params.minOrderQty} min={0} max={100000} onChange={(v) => set("minOrderQty", v)} />
            <SpinInput label="Période entre commandes" value={params.reviewPeriodDays} min={1} max={90} suffix="jours" disabled={params.mode === "continuous"} onChange={(v) => set("reviewPeriodDays", v)} />
            <SpinInput label="Arrondir au multiple" value={params.roundToPack} min={1} max={10000} onChange={(v) => set("roundToPack", v)} />
            <SpinInput label="Jours de sécurité" value={params.safetyDays} min={0} max={120} suffix="jours" onChange={(v) => set("safetyDays", v)} />
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.positive30dOr90dOnly}
                onChange={(e) => set("positive30dOr90dOnly", e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-xs text-zinc-300">Exclure les SKU sans ventes sur 30j et 90j</span>
            </label>
            <label className={`flex items-center gap-2 ${params.mode === "continuous" ? "opacity-40" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={params.continuousSalesOnly}
                disabled={params.mode === "continuous"}
                onChange={(e) => set("continuousSalesOnly", e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-xs text-zinc-300">Ne garder que les SKU avec ventes continues</span>
            </label>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-3">
          <button
            onClick={generate}
            disabled={loading || !file7 || !file30 || !file90}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {loading ? "Calcul en cours..." : "Générer les recommandations"}
          </button>
          {results && results.length > 0 && (
            <button
              onClick={() => exportCSV(results)}
              className="px-5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-colors"
            >
              ↓ Télécharger CSV
            </button>
          )}
          {results && results.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 whitespace-nowrap">
                Garder seulement plus de
              </label>
              <input
                type="number"
                min={0}
                max={1000}
                value={poMinQty}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 0) setPoMinQty(v);
                }}
                className="w-16 text-sm text-right bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
              <label className="text-xs text-zinc-400 whitespace-nowrap">pièces</label>
              <button
                onClick={createPO}
                disabled={poLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {poLoading ? "Création en cours..." : "Créer le bon de commande Katana"}
              </button>
            </div>
          )}
        </div>

        {/* Erreur bon de commande */}
        {poError && (
          <div className="rounded-xl border border-red-800 bg-red-900/30 p-4 text-sm text-red-300 whitespace-pre-wrap">
            {poError}
          </div>
        )}

        {/* Résultat bon de commande */}
        {poResult && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-900/20 p-5 space-y-3">
            <h2 className="text-sm font-bold text-emerald-300">
              {poResult.pos.length > 0
                ? `${poResult.pos.length} bon(s) de commande créé(s) dans Katana — ${poResult.pos.reduce((s, p) => s + p.lineCount, 0)} lignes au total (plus de ${poMinQty} pièces)`
                : "Aucun bon de commande créé"}
            </h2>
            {poResult.pos.map((po) => (
              <div key={po.poId} className="flex flex-wrap items-center gap-3 text-sm text-zinc-200">
                <span className="font-mono font-semibold text-emerald-300">{po.poNumber}</span>
                <span className="text-zinc-400">{po.supplierName}</span>
                <span className="text-zinc-500">{po.lineCount} réf. · {po.totalQty} unités</span>
                <a
                  href={po.katanaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                >
                  Ouvrir dans Katana →
                </a>
              </div>
            ))}
            {poResult.unmatchedSuppliers.length > 0 && (
              <p className="text-xs text-orange-300">
                Fournisseur(s) introuvable(s) dans Katana : {poResult.unmatchedSuppliers.join(", ")}
              </p>
            )}
            {poResult.unresolvedSkus.length > 0 && (
              <p className="text-xs text-orange-300">
                {poResult.unresolvedSkus.length} SKU non trouvé(s) dans Katana (ignorés) : {poResult.unresolvedSkus.slice(0, 20).join(", ")}{poResult.unresolvedSkus.length > 20 ? "…" : ""}
              </p>
            )}
            <p className="text-xs text-zinc-500">
              Les bons de commande sont créés en état « non reçu » — ajuste les quantités directement dans Katana avant de les envoyer.
            </p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="rounded-xl border border-red-800 bg-red-900/30 p-4 text-sm text-red-300 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-1">
            {log.map((l, i) => (
              <p key={i} className="text-xs font-mono text-zinc-400">{l}</p>
            ))}
          </div>
        )}

        {/* Résumé */}
        {results && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-zinc-500">SKU recommandés</p>
              <p className="text-2xl font-bold text-zinc-100">{results.length}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Unités totales</p>
              <p className="text-2xl font-bold text-zinc-100">{totalUnits.toLocaleString("fr-CH")}</p>
            </div>
            {criticalCount > 0 && (
              <div>
                <p className="text-xs text-zinc-500">Critiques ≤ 7 jours</p>
                <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
              </div>
            )}
          </div>
        )}

        {/* Tableau résultats */}
        {results && results.length > 0 && (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    <th className="px-3 py-2.5 text-left text-zinc-500 font-semibold tracking-wide">SKU</th>
                    <th className="px-3 py-2.5 text-left text-zinc-500 font-semibold tracking-wide">Nom</th>
                    <th className="px-3 py-2.5 text-right text-zinc-500 font-semibold tracking-wide">Stock</th>
                    <th className="px-3 py-2.5 text-right text-zinc-500 font-semibold tracking-wide">Entrant</th>
                    <th className="px-3 py-2.5 text-right text-zinc-500 font-semibold tracking-wide">Ventes 7j</th>
                    <th className="px-3 py-2.5 text-right text-zinc-500 font-semibold tracking-wide">Ventes 30j</th>
                    <th className="px-3 py-2.5 text-right text-zinc-500 font-semibold tracking-wide">Ventes 90j</th>
                    <th className="px-3 py-2.5 text-right text-zinc-500 font-semibold tracking-wide">Couverture</th>
                    <th className="px-3 py-2.5 text-right text-zinc-500 font-semibold tracking-wide">Cible</th>
                    <th className="px-3 py-2.5 text-right text-zinc-500 font-semibold tracking-wide font-mono">Qté</th>
                    <th className="px-3 py-2.5 text-left text-zinc-500 font-semibold tracking-wide">Risque</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={r.sku}
                      className={`border-b border-zinc-800/60 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/40"} hover:bg-zinc-800/40 transition-colors`}
                    >
                      <td className="px-3 py-2 font-mono text-zinc-300">{r.sku}</td>
                      <td className="px-3 py-2 text-zinc-300 max-w-[220px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-2 text-right text-zinc-300">{Math.round(r.currentStock)}</td>
                      <td className="px-3 py-2 text-right text-zinc-500">{Math.round(r.incomingStock)}</td>
                      <td className="px-3 py-2 text-right text-zinc-400">{Math.round(r.totalQty7)}</td>
                      <td className="px-3 py-2 text-right text-zinc-400">{Math.round(r.totalQty30)}</td>
                      <td className="px-3 py-2 text-right text-zinc-400">{Math.round(r.totalQty90)}</td>
                      <td className={`px-3 py-2 text-right ${r.estimatedCoverDays <= 7 ? "text-red-400 font-semibold" : r.estimatedCoverDays <= 21 ? "text-orange-400" : "text-zinc-400"}`}>
                        {r.estimatedCoverDays >= 9999 ? "∞" : Math.round(r.estimatedCoverDays) + "j"}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-500">{Math.round(r.targetStock)}</td>
                      <td className="px-3 py-2 text-right font-bold text-zinc-100 font-mono text-sm">{r.recommendedQty}</td>
                      <td className="px-3 py-2"><RiskBadge note={r.riskNote} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results && results.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            Aucun réassort nécessaire avec les paramètres actuels.
          </div>
        )}

      </div>
    </div>
  );
}
