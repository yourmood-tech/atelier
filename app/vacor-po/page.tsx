"use client";

// Commande Vacor : scanner les commandes clientes → les articles → un bon Katana par couleur
// (Black, Pink Gold) avec les traitements Vacor de leurs recettes. Même geste que « Commande Icelea ».
import { useEffect, useRef, useState } from "react";

type Colour = "BLACK" | "PINKGOLD" | "YELLOWGOLD" | "AUTRE";
const COLOUR_LABEL: Record<Colour, string> = { BLACK: "Black", PINKGOLD: "Pink Gold", YELLOWGOLD: "Yellow Gold", AUTRE: "Autre" };
const COLOUR_BG: Record<Colour, string> = { BLACK: "#111", PINKGOLD: "#b76e79", YELLOWGOLD: "#b8860b", AUTRE: "#666" };

type VacorIng = { variantId: number; name: string; sku: string | null; perUnit: number; purchasePrice: number; colour: Colour };
type ScannedVariant = { title: string; sku: string };
type LinkedOrder = { id: number; name: string };

type Item = {
  localId: string;
  orderId: number | null;
  productName: string;
  productSku: string | null;
  variants: ScannedVariant[];
  vacor: VacorIng[];
  excluded: number[];
  quantity: number;
  status: "loading" | "selecting_size" | "resolving" | "ok" | "error";
  error?: string;
  selectedSize?: string;
};

type PoLine = { variantId: number; variantName: string; variantSku: string | null; quantity: number; pricePerUnit: number; colour: Colour; orderIds: number[] };
type CreatedPo = { colour: Colour; label: string; poNumber: string; qty: number; total: number; orderNames: string[] };

const SIZES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];
const variantsForSize = (vs: ScannedVariant[], size: number) =>
  vs.filter((v) => v.title.split(/[\s\/\-]+/).some((p) => p === String(size)));

function buildLines(items: Item[]): PoLine[] {
  const map = new Map<number, PoLine>();
  for (const it of items) {
    if (it.status !== "ok") continue;
    for (const ing of it.vacor) {
      if (it.excluded.includes(ing.variantId)) continue;
      const q = ing.perUnit * it.quantity;
      const cur = map.get(ing.variantId);
      if (cur) {
        cur.quantity += q;
        if (it.orderId !== null && !cur.orderIds.includes(it.orderId)) cur.orderIds.push(it.orderId);
      } else {
        map.set(ing.variantId, { variantId: ing.variantId, variantName: ing.name, variantSku: ing.sku, quantity: q, pricePerUnit: ing.purchasePrice, colour: ing.colour, orderIds: it.orderId !== null ? [it.orderId] : [] });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.colour.localeCompare(b.colour) || (a.variantSku ?? "").localeCompare(b.variantSku ?? ""));
}

export default function VacorPOPage() {
  const [phase, setPhase] = useState<"setup" | "scanning" | "closed">("setup");
  const [items, setItems] = useState<Item[]>([]);
  const [buffer, setBuffer] = useState("");
  const [status, setStatus] = useState("Scannez une commande client");
  const [expectedArrival, setExpectedArrival] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPo[]>([]);
  const [taggedOrders, setTaggedOrders] = useState(0);
  const [manualOrder, setManualOrder] = useState("");
  const [currentOrder, setCurrentOrderState] = useState<LinkedOrder | null>(null);
  const [orders, setOrders] = useState<LinkedOrder[]>([]);

  const currentOrderRef = useRef<LinkedOrder | null>(null);
  const lastRef = useRef<{ code: string; ts: number } | null>(null);
  const scanRef = useRef<(code: string) => void>(() => {});
  const tabRef = useRef<() => void>(() => {});

  function setCurrentOrder(o: LinkedOrder | null) {
    currentOrderRef.current = o;
    setCurrentOrderState(o);
  }

  function beep(freq = 880) {
    try {
      const ctx = new window.AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  const patch = (localId: string, p: Partial<Item>) => setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, ...p } : i)));

  async function resolveSku(localId: string, sku: string, label: string) {
    patch(localId, { status: "resolving", productSku: sku });
    setStatus(`Lecture de la recette ${label}…`);
    try {
      const res = await fetch("/api/vacor-po/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku }) });
      const data = (await res.json()) as { ok?: boolean; vacor?: VacorIng[]; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Introuvable");
      patch(localId, { status: "ok", vacor: data.vacor ?? [], excluded: [] });
      setStatus(`✓ ${label} → ${(data.vacor ?? []).map((x) => `${x.perUnit > 1 ? `${x.perUnit} × ` : ""}${x.name}`).join(", ")}`);
      beep();
    } catch (err) {
      patch(localId, { status: "error", error: err instanceof Error ? err.message : "Erreur" });
      setStatus(`✗ ${err instanceof Error ? err.message : "Erreur"}`);
      beep(300);
    }
  }

  function pickSize(item: Item, size: number) {
    const m = variantsForSize(item.variants, size);
    if (!m.length) return patch(item.localId, { status: "error", error: `Taille ${size} introuvable` });
    if (m.length === 1) return void resolveSku(item.localId, m[0].sku, m[0].title);
    patch(item.localId, { selectedSize: String(size) });
    setStatus(`Taille ${size} — choisissez la variante`);
  }

  useEffect(() => {
    tabRef.current = () => {
      if (currentOrderRef.current) {
        setCurrentOrder(null);
        setStatus("Commande suivante — scannez une commande client");
      }
    };
    scanRef.current = async (code: string) => {
      if (phase !== "scanning") return;
      const now = Date.now();
      if (lastRef.current && lastRef.current.code === code && now - lastRef.current.ts < 200) return;
      lastRef.current = { code, ts: now };

      if (!currentOrderRef.current) {
        setStatus(`Recherche commande ${code}…`);
        try {
          const isId = /^\d{10,}$/.test(code);
          const res = await fetch(`/api/icelea-po/order?${isId ? "id" : "name"}=${encodeURIComponent(code)}`);
          const data = (await res.json()) as { ok?: boolean; orderId?: number; orderName?: string; error?: string };
          if (!res.ok || !data.ok) throw new Error(data.error ?? "Commande introuvable");
          const o = { id: data.orderId!, name: data.orderName! };
          setCurrentOrder(o);
          setOrders((prev) => (prev.some((x) => x.id === o.id) ? prev : [...prev, o]));
          setStatus(`✓ ${o.name} — scannez les articles noirs / rose gold`);
          beep();
        } catch (err) {
          setStatus(`✗ ${err instanceof Error ? err.message : "Commande introuvable"}`);
          beep(300);
        }
        return;
      }

      const localId = crypto.randomUUID();
      setItems((prev) => [{ localId, orderId: currentOrderRef.current?.id ?? null, productName: code, productSku: null, variants: [], vacor: [], excluded: [], quantity: 1, status: "loading" }, ...prev]);
      setStatus(`Recherche ${code}…`);
      try {
        const res = await fetch("/api/icelea-po/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barcode: code }) });
        const data = (await res.json()) as { ok?: boolean; type?: "product" | "variant"; productName?: string; variants?: ScannedVariant[]; variantTitle?: string; sku?: string; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Introuvable");
        if (data.type === "product") {
          patch(localId, { status: "selecting_size", productName: data.productName ?? code, variants: data.variants ?? [] });
          setStatus(`${data.productName} — choisissez la taille`);
        } else if (data.sku) {
          patch(localId, { productName: data.productName ?? code, productSku: data.sku });
          await resolveSku(localId, data.sku, data.variantTitle ?? data.sku);
        }
      } catch (err) {
        patch(localId, { status: "error", error: err instanceof Error ? err.message : "Erreur" });
        setStatus(`✗ ${err instanceof Error ? err.message : "Erreur"}`);
        beep(300);
      }
    };
  });

  useEffect(() => {
    if (phase !== "scanning") return;
    const buf = { v: "" };
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Tab") { e.preventDefault(); buf.v = ""; setBuffer(""); tabRef.current(); return; }
      if (e.key === "Enter") {
        if (buf.v) { e.preventDefault(); const v = buf.v; buf.v = ""; setBuffer(""); void scanRef.current(v); }
      } else if (e.key === "Backspace") { buf.v = buf.v.slice(0, -1); setBuffer(buf.v); }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { buf.v += e.key; setBuffer(buf.v); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  const lines = buildLines(items);
  const colours = [...new Set(lines.map((l) => l.colour))];
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const pending = items.some((i) => i.status === "loading" || i.status === "selecting_size" || i.status === "resolving");

  async function close() {
    if (!lines.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vacor-po/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, orders, expectedArrival: expectedArrival || null }),
      });
      const data = (await res.json()) as { ok?: boolean; pos?: CreatedPo[]; taggedOrders?: number; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Erreur à la création du bon");
      setCreated(data.pos ?? []);
      setTaggedOrders(data.taggedOrders ?? 0);
      setPhase("closed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setPhase("setup");
    setItems([]);
    setOrders([]);
    setCurrentOrder(null);
    setCreated([]);
    setError(null);
  }

  // ── TERMINÉ ──
  if (phase === "closed") {
    return (
      <div style={s.container}>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 48 }}>✓</div>
          <h2 style={{ margin: "8px 0 16px" }}>{created.length > 1 ? `${created.length} bons Vacor créés` : "Bon Vacor créé"}</h2>
          {created.map((c) => (
            <div key={c.poNumber} style={{ border: "1px solid #eee", borderLeft: `6px solid ${COLOUR_BG[c.colour]}`, borderRadius: 6, padding: "10px 14px", margin: "0 auto 10px", maxWidth: 420, textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>{c.label} — {c.poNumber}</div>
              <div style={{ color: "#555", fontSize: 13 }}>{c.qty} pièce(s) · CHF {c.total.toFixed(2)}</div>
              {c.orderNames.length > 0 && <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>{c.orderNames.join(", ")}</div>}
            </div>
          ))}
          {taggedOrders > 0 && <p style={{ color: "#2e7d32", fontSize: 13 }}>✓ Étiquette « Vacor-PO » ajoutée sur {taggedOrders} commande(s)</p>}
          <p style={{ color: "#888", fontSize: 13 }}>Récapitulatif envoyé à philippe@yourmood.net</p>
          <button style={{ ...s.btn, marginTop: 16 }} onClick={reset}>Nouvelle commande Vacor</button>
        </div>
      </div>
    );
  }

  // ── SCAN ──
  if (phase === "scanning") {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <div>
            <div style={s.title}>🎨 Commande Vacor</div>
            <div style={{ color: "#555", fontSize: 13 }}>
              {totalQty} pièce(s) · {colours.length ? colours.map((c) => COLOUR_LABEL[c]).join(" + ") : "aucun traitement"}
            </div>
          </div>
          <button
            style={{ ...s.btn, background: lines.length && !pending ? "#111" : "#ccc", cursor: lines.length && !pending ? "pointer" : "not-allowed", flexShrink: 0 }}
            disabled={!lines.length || pending || submitting}
            onClick={close}
          >
            {submitting ? "En cours…" : colours.length > 1 ? `Créer les ${colours.length} bons` : "Créer le bon"}
          </button>
        </div>

        <div style={{ ...s.banner, background: currentOrder ? "#e8f5e9" : "#fff8e1", borderColor: currentOrder ? "#a5d6a7" : "#ffe082", color: currentOrder ? "#2e7d32" : "#856404" }}>
          {currentOrder ? `📋 ${currentOrder.name} — scannez les articles` : "📋 Scannez une commande client"}
          {currentOrder && <span style={{ float: "right", fontSize: 11, opacity: 0.7 }}>Tab = commande suivante</span>}
        </div>

        {orders.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {orders.map((o) => (
              <span key={o.id} style={{ ...s.chip, background: o.id === currentOrder?.id ? "#111" : "#eee", color: o.id === currentOrder?.id ? "#fff" : "#555" }}>{o.name}</span>
            ))}
          </div>
        )}

        {!currentOrder && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Taper le n° de commande"
              value={manualOrder}
              onChange={(e) => setManualOrder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualOrder.trim()) { e.preventDefault(); const v = manualOrder.trim(); setManualOrder(""); void scanRef.current(v); }
              }}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }}
            />
          </div>
        )}

        <div style={s.statusBar}>{buffer ? `> ${buffer}` : status}</div>
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Récapitulatif par bon */}
        {colours.map((c) => {
          const ls = lines.filter((l) => l.colour === c);
          return (
            <div key={c} style={{ border: "1px solid #eee", borderLeft: `6px solid ${COLOUR_BG[c]}`, borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Bon {COLOUR_LABEL[c]} · {ls.reduce((s2, l) => s2 + l.quantity, 0)} pièce(s)</div>
              {ls.map((l) => (
                <div key={l.variantId} style={{ display: "flex", fontSize: 13, color: "#333", padding: "2px 0" }}>
                  <span style={{ flex: 1 }}>{l.variantName} <span style={{ color: "#999" }}>{l.variantSku}</span></span>
                  <strong>{l.quantity}</strong>
                </div>
              ))}
            </div>
          );
        })}

        {items.length === 0 && <div style={s.empty}>Scannez une commande client puis ses articles noirs ou rose gold</div>}

        {items.map((item) => (
          <div key={item.localId} style={s.itemRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {item.status === "loading" && <div style={{ color: "#888", fontSize: 14 }}>Recherche…</div>}
              {item.status === "resolving" && <div style={{ color: "#888", fontSize: 14 }}>{item.productName} — lecture de la recette…</div>}
              {item.status === "error" && (
                <div style={{ color: "#c62828", fontSize: 13 }}><strong>{item.productName}</strong><br /><em>{item.error}</em></div>
              )}
              {item.status === "selecting_size" && (
                <>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{item.productName}</div>
                  {!item.selectedSize ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {SIZES.map((size) => {
                        const ok = variantsForSize(item.variants, size).length > 0;
                        return (
                          <button key={size} disabled={!ok} style={{ ...s.sizeBtn, opacity: ok ? 1 : 0.25 }} onClick={() => pickSize(item, size)}>{size}</button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
                        Taille {item.selectedSize}
                        <button style={{ marginLeft: 8, fontSize: 11, color: "#888", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }} onClick={() => patch(item.localId, { selectedSize: undefined })}>← retour</button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {variantsForSize(item.variants, Number(item.selectedSize)).map((v) => (
                          <button key={v.sku} style={s.sizeBtn} onClick={() => resolveSku(item.localId, v.sku, v.title)}>{v.title}</button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {item.status === "ok" && (
                <>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{item.productName}{item.productSku ? ` · ${item.productSku}` : ""}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {item.vacor.map((ing) => {
                      const off = item.excluded.includes(ing.variantId);
                      return (
                        <button
                          key={ing.variantId}
                          title="Cliquer pour retirer / remettre cette pièce"
                          onClick={() => patch(item.localId, { excluded: off ? item.excluded.filter((x) => x !== ing.variantId) : [...item.excluded, ing.variantId] })}
                          style={{ padding: "5px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${off ? "#ddd" : COLOUR_BG[ing.colour]}`, background: off ? "#f5f5f5" : COLOUR_BG[ing.colour], color: off ? "#bbb" : "#fff", textDecoration: off ? "line-through" : "none" }}
                        >
                          {ing.perUnit > 1 ? `${ing.perUnit} × ` : ""}{ing.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {item.status === "ok" && (
              <div style={s.qty}>
                <button style={s.qtyBtn} onClick={() => item.quantity > 1 && patch(item.localId, { quantity: item.quantity - 1 })}>−</button>
                <span style={{ minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                <button style={s.qtyBtn} onClick={() => patch(item.localId, { quantity: item.quantity + 1 })}>+</button>
              </div>
            )}
            <button style={s.removeBtn} onClick={() => setItems((prev) => prev.filter((i) => i.localId !== item.localId))}>✕</button>
          </div>
        ))}
      </div>
    );
  }

  // ── DÉPART ──
  return (
    <div style={s.container}>
      <div style={s.title}>🎨 Commande Vacor</div>
      <p style={{ color: "#555", fontSize: 14, lineHeight: 1.5 }}>
        Traitement de surface des pièces Black et Pink Gold. Scannez les commandes clientes et leurs articles :
        l&apos;écran prépare un bon par couleur avec les pièces à traiter.
      </p>
      <div style={{ marginTop: 24 }}>
        <label style={s.label}>Date de retour estimée (optionnel)</label>
        <input type="date" style={{ ...s.select, width: "auto", minWidth: 160 }} value={expectedArrival} onChange={(e) => setExpectedArrival(e.target.value)} />
      </div>
      <div style={{ color: "#888", fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
        Flux : scanner la commande client → scanner les articles → Tab pour la commande suivante → Créer le(s) bon(s)
      </div>
      <button
        style={{ ...s.btn, marginTop: 16, width: "100%", fontSize: 17, padding: "14px 0" }}
        onClick={() => { setItems([]); setOrders([]); setCurrentOrder(null); setStatus("Scannez une commande client"); setPhase("scanning"); }}
      >
        Commencer à scanner
      </button>
    </div>
  );
}

const s = {
  container: { fontFamily: "sans-serif", maxWidth: 520, margin: "0 auto", padding: "24px 16px", color: "#111" } as React.CSSProperties,
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 } as React.CSSProperties,
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 } as React.CSSProperties,
  banner: { border: "1px solid", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 500, marginBottom: 10 } as React.CSSProperties,
  statusBar: { background: "#f5f5f5", borderRadius: 6, padding: "10px 14px", fontSize: 14, color: "#333", marginBottom: 12, minHeight: 40 } as React.CSSProperties,
  errorBox: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 12 } as React.CSSProperties,
  empty: { textAlign: "center" as const, color: "#aaa", fontSize: 15, padding: "40px 0" },
  itemRow: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #f0f0f0" } as React.CSSProperties,
  sizeBtn: { padding: "6px 14px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600 } as React.CSSProperties,
  qty: { display: "flex", alignItems: "center", gap: 6, fontSize: 15, flexShrink: 0 } as React.CSSProperties,
  qtyBtn: { width: 28, height: 28, border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 16 } as React.CSSProperties,
  removeBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, padding: "4px 6px", flexShrink: 0 } as React.CSSProperties,
  btn: { padding: "10px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer" } as React.CSSProperties,
  label: { display: "block", fontSize: 13, color: "#555", marginBottom: 6 } as React.CSSProperties,
  select: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 15, background: "#fff" } as React.CSSProperties,
  chip: { padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 500 } as React.CSSProperties,
};
