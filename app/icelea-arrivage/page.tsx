"use client";

import { useRef, useState } from "react";
import { code128Svg } from "@/lib/icelea/barcode";
import { rowSig } from "@/lib/icelea/arrivage";

type ReceptionRow = {
  code: string | null; label: string; size: string | null; invoiceQty: number;
  sku: string | null; name: string | null; variantId: number | null; barcode: string | null;
  pos: { po: string; line: number; rowId: number; qty: number; created: string }[];
  openQty: number; match: "code" | "nom" | "approx" | "manuel" | "corrige" | "aucun";
};
type InvoiceCheck = {
  footerPieces: number | null; footerPairs: number | null; footerTotal: number | null; footerCif: number | null;
  charges: number; discount: number; pieces: number; pairs: number; total: number;
  lineIssues: { ref: string; page: number; issues: string[] }[]; orphans: { page: number; text: string }[]; ok: boolean;
};
type Summary = {
  invoiceLines: number; invoicePieces: number; receptionRows: number;
  matchedRows: number; approxRows: number; manualRows: number; noAssocRows?: number; iceleaVariants: number;
};
type CatalogEntry = { vid: number; sku: string; name: string | null; size: string | null; barcode: string | null; pos: { po: string; line: number; qty: number; created: string }[] };
type ReceiveResult = { receivedOnPO: { po: string; line: number; qty: number }[]; totalReceivedPO: number; surplus: number; forcedNoPO: number; picked: number };

export default function IceleaArrivagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ReceptionRow[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [editRows, setEditRows] = useState<Record<number, boolean>>({});
  const [recv, setRecv] = useState<Record<number, string>>({}); // quantité reçue saisie (vide = qté facture)
  const [done, setDone] = useState<Record<number, ReceiveResult>>({}); // réceptions validées
  const [comments, setComments] = useState<Record<number, string>>({}); // commentaire par article (ex. livré faux) → rapport
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null); // validation de tout l'arrivage en cours
  const [invoiceNo, setInvoiceNo] = useState<string | null>(null);
  // Lot 3 — rapport de fin d'arrivage
  type RemainingPo = { po: string; created: string; lines: { sku: string; name: string | null; size: string | null; qty: number; line: number }[] };
  type Report = {
    neverScanned: { label: string; size: string | null; qty: number }[];
    qtyDiffs: { label: string; size: string | null; invoiceQty: number; receivedQty: number }[];
    itemRemarks: { sku: string | null; name: string | null; label: string; size: string | null; fr: string; en: string }[];
    remaining: { pos: RemainingPo[]; totalLines: number; totalQty: number };
  };
  const [report, setReport] = useState<Report | null>(null);
  const [reportLang, setReportLang] = useState<"fr" | "en">("fr");
  const [remarksFr, setRemarksFr] = useState("");
  const [remarksEn, setRemarksEn] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [check, setCheck] = useState<InvoiceCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  // Lecture défensive : si le serveur renvoie du HTML (timeout Vercel…), on affiche
  // le vrai texte au lieu d'un « Unexpected token » cryptique.
  async function readJson(res: Response): Promise<Record<string, unknown>> {
    const t = await res.text();
    try { return JSON.parse(t); } catch { return { error: t.slice(0, 300) || `HTTP ${res.status}` }; }
  }

  // Clé de reprise par ligne : rowSig + indice d'occurrence quand 2 lignes de la
  // facture portent le même article (2 PO livrés) → pas de collision de progression.
  function sigForRow(list: ReceptionRow[], i: number): string {
    const base = rowSig(list[i].label, list[i].size);
    let occ = 0;
    for (let k = 0; k < i; k++) if (rowSig(list[k].label, list[k].size) === base) occ++;
    return occ === 0 ? base : `${base}#${occ}`;
  }
  async function prepare() {
    if (!file) { setError("Choisis d'abord la facture PDF."); return; }
    setLoading(true); setError(null); setRows(null); setSummary(null); setCheck(null);
    try {
      const fd = new FormData(); fd.append("pdf", file);
      const res = await fetch("/api/icelea-arrivage/prepare", { method: "POST", body: fd });
      const data = await readJson(res);
      if (!res.ok) { setError((data.error as string) || "Erreur"); setLoading(false); return; }
      const newRows = data.rows as ReceptionRow[];
      setRows(newRows); setSummary(data.summary as Summary); setCheck((data.check as InvoiceCheck) ?? null);
      setCatalog((data.catalog as CatalogEntry[]) ?? []);
      // reprise : restaure les réceptions déjà faites pour cette facture
      setInvoiceNo((data.invoiceNo as string) ?? null);
      const prog = (data.progress as Record<string, ReceiveResult>) ?? {};
      const restored: Record<number, ReceiveResult> = {};
      newRows.forEach((_, i) => { const s = sigForRow(newRows, i); if (prog[s]) restored[i] = prog[s]; });
      setDone(restored); setRecv({}); setComments({}); setReport(null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  function updateRow(i: number, c: CatalogEntry) {
    setRows((prev) => prev ? prev.map((r, idx) => idx === i ? {
      ...r, sku: c.sku, name: c.name, variantId: c.vid, barcode: c.barcode, size: c.size ?? r.size,
      pos: c.pos.map((p) => ({ po: p.po, line: p.line, rowId: 0, qty: p.qty, created: p.created })),
      openQty: c.pos.reduce((s, p) => s + p.qty, 0), match: "corrige",
    } : r) : prev);
  }
  // mémorise la correction côté serveur → réappliquée aux prochaines factures
  // (sku null = mémorise "sans association Katana")
  function learnPick(label: string, sku: string | null) {
    fetch("/api/icelea-arrivage/learn", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, sku }),
    }).catch(() => {});
  }
  // valide le choix proposé d'une ligne "à vérifier" → confirmé + mémorisé
  function confirmRow(i: number, label: string, sku: string | null) {
    if (!sku) return;
    setRows((prev) => prev ? prev.map((r, idx) => idx === i ? { ...r, match: "corrige" } : r) : prev);
    learnPick(label, sku);
  }
  // marque une ligne comme "sans association Katana" (article hors Katana) + mémorise
  function markNoAssoc(i: number, label: string) {
    setRows((prev) => prev ? prev.map((r, idx) => idx === i
      ? { ...r, sku: null, name: null, variantId: null, barcode: null, pos: [], openQty: 0, match: "aucun" } : r) : prev);
    learnPick(label, null);
    setEditRows((e) => ({ ...e, [i]: false }));
  }

  // quantité reçue d'une ligne : celle saisie, sinon celle de la facture (pré-remplie)
  const recvQtyOf = (i: number, r: ReceptionRow) => Math.max(0, Math.floor(Number(recv[i] ?? r.invoiceQty) || 0));

  // valide tout l'arrivage en une fois : chaque ligne associée à Katana et pas encore reçue
  // passe par la même réception (imputation FIFO PO + surplus), une ligne après l'autre.
  // La progression est sauvegardée ligne par ligne → si ça coupe, on relance et seules
  // les lignes restantes partent. Qté 0 = non reçu (ressort dans le rapport).
  async function validateAll() {
    if (!rows) return;
    // tout part d'un coup : on n'envoie pas un article proposé mais pas encore confirmé
    const unsure = rows.filter((r, i) => !done[i] && (r.match === "approx" || r.match === "manuel")).length;
    if (unsure > 0) { alert(`${unsure} ligne(s) encore « à vérifier » ou « SKU à confirmer » : confirme-les (ou retire l'association) avant de valider l'arrivage.`); return; }
    const todo = rows.map((r, i) => ({ r, i })).filter(({ r, i }) => r.variantId && !done[i] && recvQtyOf(i, r) > 0);
    if (todo.length === 0) { alert("Rien à valider : toutes les lignes associées sont déjà reçues."); return; }
    const pieces = todo.reduce((s, { r, i }) => s + recvQtyOf(i, r), 0);
    if (!confirm(`Réceptionner ${todo.length} ligne(s), ${pieces} pièce(s) dans Katana ?\nUne réception ne peut pas être annulée depuis l'outil.`)) return;
    setBulk({ done: 0, total: todo.length });
    const seen = new Set<number>();
    const recues: { po: string; variantId: number; qty: number }[] = [];   // pièces reçues pendant ce passage
    try {
      for (let k = 0; k < todo.length; k++) {
        const { r, i } = todo[k];
        // même article sur 2 lignes de facture : Katana met un instant à fermer la ligne de PO
        // déjà reçue → petite pause pour que l'imputation FIFO relise un état à jour
        if (seen.has(r.variantId!)) await new Promise((res) => setTimeout(res, 4000));
        seen.add(r.variantId!);
        // Katana limite les appels par minute : on espace les lignes, et si Katana est saturé
        // (429 = appel refusé, rien d'écrit — sauf message « PARTIELLE ») on patiente et on refait.
        let res: Response, data: Record<string, unknown>;
        for (let attempt = 0; ; attempt++) {
          if (k > 0 || attempt > 0) await new Promise((w) => setTimeout(w, attempt === 0 ? 1500 : 20000));
          res = await fetch("/api/icelea-arrivage/receive", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variantId: r.variantId, receivedQty: recvQtyOf(i, r), pickQty: 0, invoiceNo, rowSig: sigForRow(rows, i) }),
          });
          data = await readJson(res);
          const err = String(data.error ?? "");
          const saturated = !res.ok && !err.includes("PARTIELLE") && (err.includes("429") || err.includes("saturé"));
          if (!saturated || attempt >= 3) break;
        }
        if (!res.ok) {
          alert(`Arrêt sur ${r.sku ?? r.label}${r.size ? ` (${r.size})` : ""} : ${(data.error as string) || "erreur réception"}\n${k} ligne(s) déjà reçue(s) avant. Relance « Valider tout l'arrivage » pour continuer avec les lignes restantes.`);
          return;
        }
        setDone((s) => ({ ...s, [i]: data.result as ReceiveResult }));
        (data.result as ReceiveResult).receivedOnPO.forEach((p) => recues.push({ po: p.po, variantId: r.variantId!, qty: p.qty }));
        setBulk({ done: k + 1, total: todo.length });
      }
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally {
      setBulk(null);
      // même après un arrêt : les commandes clientes dont une pièce vient d'arriver sont marquées
      // « Icelea-recu » (tout reçu) ou « Icelea-partiel » (en arrière-plan) → réponse aux demandes de délai
      if (recues.length) {
        try { await marquer(recues); }
        catch (e) { setMarquage(null); alert(`Réception faite, mais les commandes clientes n'ont pas toutes été marquées « reçu » : ${e instanceof Error ? e.message : String(e)}`); }
      }
    }
  }
  // marquage des commandes clientes, tranche après tranche (Katana est lent : plusieurs minutes pour un gros colis)
  const [marquage, setMarquage] = useState<string | null>(null);
  async function marquer(lines: { po: string; variantId: number; qty: number }[], enroute?: string): Promise<{ commandes: number; erreurs: number }> {
    let body: Record<string, unknown> = { lines, enroute };
    for (let tour = 0; tour < 40; tour++) {
      const t = await fetch("/api/icelea-arrivage/tag-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const tj = await readJson(t);
      if (!t.ok) throw new Error((tj.error as string) || String(t.status));
      const reps = (tj.reports as { recu: string[]; partiel: string[]; erreurs: string[] }[]) ?? [];
      const commandes = reps.reduce((n, r) => n + r.recu.length + r.partiel.length, 0);
      setMarquage(`Marquage des commandes clientes… ${tj.faits}/${tj.total} bon(s) Icelea traités, ${commandes} commande(s) marquée(s)`);
      if (tj.finished) { setMarquage(null); return { commandes, erreurs: reps.reduce((n, r) => n + r.erreurs.length, 0) }; }
      body = { jobId: tj.jobId };
    }
    throw new Error("marquage trop long : relance le bouton, ce qui est déjà fait est gardé");
  }

  // colis encore en route (facture d'envoi d'Icelea) : rien n'entre en stock ; les commandes clientes
  // qui attendaient ces pièces reçoivent « Icelea-enroute:<arrivée prévue> » → délais plus précis.
  // Seules les lignes sûres partent (pas « à vérifier » / « SKU à confirmer ») ; pièces réparties
  // sur les PO ouverts du plus ancien au plus récent, comme le fera la réception.
  const [enrouteMsg, setEnrouteMsg] = useState<string | null>(null);
  async function declareEnRoute() {
    if (!rows) return;
    const d = new Date(); d.setDate(d.getDate() + 4);
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = window.prompt("Arrivée prévue du colis à l'atelier (jj.mm.aaaa) :", `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`)?.trim();
    if (!date) return;
    if (!/^\d\d\.\d\d\.\d{4}$/.test(date)) { alert("Date au format jj.mm.aaaa, par exemple 23.10.2026."); return; }
    const pris = new Map<number, number>();   // ligne de PO → pièces déjà attribuées (même article sur 2 lignes de facture)
    const lines: { po: string; variantId: number; qty: number }[] = [];
    let ignorees = 0;
    rows.forEach((r) => {
      if (!r.variantId || r.match === "approx" || r.match === "manuel" || r.match === "aucun") { ignorees += r.invoiceQty; return; }
      let left = r.invoiceQty;
      for (const p of r.pos) {
        if (left <= 0) break;
        const give = Math.min(left, p.qty - (pris.get(p.rowId) ?? 0));
        if (give <= 0) continue;
        pris.set(p.rowId, (pris.get(p.rowId) ?? 0) + give); left -= give;
        lines.push({ po: p.po, variantId: r.variantId, qty: give });
      }
    });
    const pieces = lines.reduce((s, l) => s + l.qty, 0);
    if (!pieces) { alert("Aucune pièce sûre à déclarer en route."); return; }
    if (!confirm(`Déclarer ${pieces} pièce(s) en route, arrivée prévue le ${date} ?\nRien n'entre en stock. ${ignorees ? `${ignorees} pièce(s) à vérifier ou sans association sont laissées de côté.` : ""}`)) return;
    try {
      setEnrouteMsg(null);
      const r = await marquer(lines, date);
      setEnrouteMsg(`${pieces} pièce(s) déclarées en route (arrivée prévue le ${date}) : ${r.commandes} commande(s) cliente(s) marquée(s).${r.erreurs ? ` ${r.erreurs} erreur(s), voir le journal.` : ""}${ignorees ? ` ${ignorees} pièce(s) laissées de côté (à vérifier ou sans association).` : ""}`);
    } catch (e) { setMarquage(null); alert(`Pas fini : ${e instanceof Error ? e.message : String(e)}`); }
  }
  // fin d'arrivage → construit le rapport (jamais scanné · écarts · reste à livrer)
  async function buildReport() {
    if (!rows) return;
    setReportBusy(true);
    try {
      const neverScanned = rows
        .map((r, i) => ({ r, i }))
        .filter(({ i }) => !done[i])
        .map(({ r }) => ({ label: r.label, size: r.size, qty: r.invoiceQty }));
      const qtyDiffs = rows
        .map((r, i) => ({ r, d: done[i] }))
        .filter(({ d }) => d)
        .map(({ r, d }) => ({ label: r.label, size: r.size, invoiceQty: r.invoiceQty, receivedQty: d.totalReceivedPO + d.surplus + d.forcedNoPO }))
        .filter((x) => x.receivedQty !== x.invoiceQty);
      // commentaires par article (ex. article livré faux) → traduits FR→EN pour le fournisseur
      const commented = rows.map((r, i) => ({ r, c: (comments[i] || "").trim() })).filter((x) => x.c);
      const itemRemarks = await Promise.all(commented.map(async ({ r, c }) => ({
        sku: r.sku, name: r.name, label: r.label, size: r.size, fr: c, en: await translateText(c),
      })));
      const res = await fetch("/api/icelea-arrivage/open-remaining");
      const rem = await readJson(res);
      if (!res.ok) { alert((rem.error as string) || "Erreur reste à livrer"); return; }
      setReport({ neverScanned, qtyDiffs, itemRemarks, remaining: rem as Report["remaining"] });
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setReportBusy(false); }
  }
  // traduit un texte FR→EN via le service (rendu vide en cas d'échec)
  async function translateText(fr: string): Promise<string> {
    if (!fr.trim()) return "";
    try {
      const res = await fetch("/api/icelea-arrivage/translate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: fr }),
      });
      const data = await readJson(res);
      return (data.translation as string) || "";
    } catch { return ""; }
  }
  async function translateRemarks() {
    setReportBusy(true);
    try { setRemarksEn(await translateText(remarksFr)); }
    finally { setReportBusy(false); }
  }

  // scan code-barres → focalise la quantité de la 1re ligne encore à recevoir de cet article
  // (un même article peut figurer sur plusieurs lignes de la facture : 2 PO livrés).
  function onScan(code: string) {
    const c = code.trim(); if (!c || !rows) return;
    const matches = rows.map((r, idx) => ({ r, idx })).filter((m) => m.r.barcode === c);
    if (matches.length === 0) { alert(`Code-barres « ${c} » absent de la liste.`); return; }
    const idx = (matches.find((m) => !done[m.idx]) ?? matches[0]).idx;
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-recv="${idx}"]`);
      el?.scrollIntoView({ block: "center" }); el?.focus();
    }, 0);
  }

  const badge = (m: ReceptionRow["match"]) =>
    m === "manuel" ? "bg-red-100 text-red-800 border-red-300"
    : m === "approx" ? "bg-amber-100 text-amber-800 border-amber-300"
    : m === "corrige" ? "bg-violet-100 text-violet-800 border-violet-300"
    : m === "aucun" ? "bg-neutral-100 text-neutral-600 border-neutral-300"
    : m === "nom" ? "bg-sky-100 text-sky-800 border-sky-300"
    : "bg-emerald-100 text-emerald-800 border-emerald-300";

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <style>{`@media print { @page { margin: 8mm; } table { font-size: 10px; } tr { break-inside: avoid; } svg { max-height: 34px; } }`}</style>
      <div className="mx-auto max-w-6xl p-6 space-y-5">
        <div className="print:hidden space-y-4">
          <h1 className="text-2xl font-semibold">Arrivage marchandise Icelea</h1>
          <p className="text-sm text-neutral-600">
            Facture PDF → plan de réception (SKU + nom Katana + PO ouverts FIFO) imprimable avec code-barres.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-white" />
            <button onClick={prepare} disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "Préparation…" : "Préparer la liste de réception"}
            </button>
            {rows && (
              <button onClick={() => window.print()}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100">↧ Imprimer (avec code-barres)</button>
            )}
            {rows && (
              <input ref={scanRef} autoFocus placeholder="🔎 Scanner un code-barres…"
                onKeyDown={(e) => { if (e.key === "Enter") { onScan(e.currentTarget.value); e.currentTarget.value = ""; } }}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm w-56" />
            )}
            {rows && !report && (
              <button onClick={validateAll} disabled={!!bulk}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {bulk ? `Réception… ${bulk.done}/${bulk.total}` : "✓ Valider tout l'arrivage"}</button>
            )}
            {rows && !report && (
              <button onClick={declareEnRoute} disabled={!!bulk}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
                🚚 Colis en route…</button>
            )}
            {rows && !report && (
              <button onClick={buildReport} disabled={reportBusy}
                className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-50">
                {reportBusy ? "…" : "Terminer l'arrivage → rapport"}</button>
            )}
          </div>
          {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {marquage && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">⏳ {marquage} — laisse la page ouverte.</div>}
          {enrouteMsg && <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-800">🚚 {enrouteMsg}</div>}
          {summary && invoiceNo && (
            <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
              Facture <span className="font-mono font-medium">{invoiceNo}</span>
              {Object.keys(done).length > 0
                ? <> — <b>reprise</b> : {Object.keys(done).length} ligne(s) déjà reçue(s) ; « Valider tout l&apos;arrivage » ne reçoit que les lignes restantes.</>
                : <> — les quantités reçues sont pré-remplies avec celles de la facture : corrige les écarts, puis valide tout l&apos;arrivage en une fois.</>}
            </div>
          )}
          {check && (() => {
            const eq = (a: number | null, b: number) => a == null || Math.abs(a - b) <= 0.02;
            const money = (n: number | null) => n == null ? "—" : n.toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const cifOk = check.footerCif == null || check.footerTotal == null || eq(check.footerCif, check.footerTotal + check.charges - check.discount);
            return (
              <div className={`rounded-xl border p-3 text-sm ${check.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-400 bg-amber-50 text-amber-900"}`}>
                <div className="font-medium">{check.ok ? "✓ Facture lue et contrôlée : tout concorde" : "⚠ Facture lue, mais des écarts sont à vérifier avant de réceptionner"}</div>
                <div className="mt-1 grid gap-0.5 sm:grid-cols-3">
                  <div className={eq(check.footerPieces, check.pieces) ? "" : "font-semibold text-red-700"}>Pièces : {check.pieces} lues / {check.footerPieces ?? "—"} sur la facture</div>
                  <div className={eq(check.footerPairs, check.pairs) ? "" : "font-semibold text-red-700"}>Paires : {check.pairs} lues / {check.footerPairs ?? "—"} sur la facture</div>
                  <div className={eq(check.footerTotal, check.total) ? "" : "font-semibold text-red-700"}>Marchandise : {money(check.total)} lu / {money(check.footerTotal)} USD</div>
                </div>
                {(check.charges > 0 || check.discount > 0 || check.footerCif != null) && (
                  <div className={`mt-0.5 ${cifOk ? "" : "font-semibold text-red-700"}`}>
                    {check.charges > 0 && <>Frais {money(check.charges)} · </>}{check.discount > 0 && <>Remise −{money(check.discount)} · </>}Total à payer {money(check.footerCif)} USD
                  </div>
                )}
                {check.lineIssues.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 space-y-0.5">
                    {check.lineIssues.map((l, k) => <li key={k}><span className="font-mono">{l.ref}</span> <span className="text-neutral-500">(p.{l.page})</span> — {l.issues.join(" ; ")}</li>)}
                  </ul>
                )}
                {check.orphans.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 space-y-0.5">
                    {check.orphans.map((o, k) => <li key={k}>Texte non rattaché à une ligne (p.{o.page}) : <span className="font-mono">{o.text}</span></li>)}
                  </ul>
                )}
              </div>
            );
          })()}
          {summary && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-sm">
              <Stat k="Lignes facture" v={summary.invoiceLines} />
              <Stat k="Pièces facturées" v={summary.invoicePieces} />
              <Stat k="Lignes de réception" v={summary.receptionRows} />
              <Stat k="Matchées (sûres)" v={summary.matchedRows} />
              <Stat k="À vérifier" v={summary.approxRows} />
              <Stat k="À confirmer (manuel)" v={summary.manualRows} />
            </div>
          )}
        </div>

        {rows && !report && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="p-2">Code-barres</th>
                  <th className="p-2">Produit &amp; PO ouverts (FIFO — ligne dans le PO)</th>
                  <th className="p-2 w-14">Taille</th>
                  <th className="p-2 w-12">Qté</th>
                  <th className="p-2 w-16">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-200 align-top">
                    <td className="p-2">
                      {r.barcode && (
                        <div className="space-y-0.5">
                          <div dangerouslySetInnerHTML={{ __html: code128Svg(r.barcode) }} />
                          <div className="font-mono text-[10px] text-neutral-500">{r.barcode}</div>
                        </div>
                      )}
                      <div className="print:hidden mt-1 space-y-1">
                        {r.match === "approx" && <span className={`rounded border px-1.5 py-0.5 text-[10px] ${badge("approx")}`}>à vérifier</span>}
                        {r.match === "corrige" && <span className={`rounded border px-1.5 py-0.5 text-[10px] ${badge("corrige")}`}>corrigé (mémorisé)</span>}
                        {r.match === "aucun" && <span className={`rounded border px-1.5 py-0.5 text-[10px] ${badge("aucun")}`}>sans association</span>}
                        {r.match === "manuel" && <span className={`rounded border px-2 py-0.5 text-xs ${badge("manuel")}`}>SKU à confirmer</span>}
                        {(editRows[i] || r.match === "manuel") ? (
                          <div className="space-y-1">
                            <ManualPick catalog={catalog} onPick={(c) => { updateRow(i, c); learnPick(r.label, c.sku); setEditRows((e) => ({ ...e, [i]: false })); }} />
                            <button onClick={() => markNoAssoc(i, r.label)} className="block text-[11px] text-neutral-500 underline">∅ sans association Katana</button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {r.match === "approx" && (
                              <button onClick={() => confirmRow(i, r.label, r.sku)}
                                className="text-[11px] font-medium text-emerald-700 underline">✓ OK, c&apos;est correct</button>
                            )}
                            <button onClick={() => setEditRows((e) => ({ ...e, [i]: true }))}
                              className="text-[11px] text-sky-700 underline">{r.match === "aucun" ? "✎ associer un SKU" : "✎ changer le SKU"}</button>
                            {r.match !== "aucun" && (
                              <button onClick={() => markNoAssoc(i, r.label)}
                                className="text-[11px] text-neutral-500 underline">∅ retirer l&apos;association</button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="font-mono text-xs">{r.sku ?? r.label}</div>
                      {r.name && <div className="text-[11px] font-medium text-neutral-700">{r.name}</div>}
                      {r.sku && <div className="text-[11px] text-neutral-500">{r.label}</div>}
                      {r.pos.length
                        ? <div className="mt-0.5 text-[11px] text-neutral-500">
                            PO : {r.pos.map((p, j) => (
                              <span key={j}>{j > 0 ? " · " : ""}{p.po} <span className="text-neutral-400">(l.{p.line ?? "?"} ×{p.qty})</span></span>
                            ))}
                          </div>
                        : <div className="mt-0.5 text-[11px] text-amber-700">aucun PO ouvert</div>}
                      <div className="print:hidden mt-1">
                        <input value={comments[i] ?? ""} onChange={(e) => setComments((s) => ({ ...s, [i]: e.target.value }))}
                          placeholder="commentaire (ex. article livré faux)…"
                          className="w-full max-w-xs rounded border border-neutral-300 px-1.5 py-0.5 text-[11px]" />
                      </div>
                    </td>
                    <td className="p-2 font-medium">{r.size ?? "—"}</td>
                    <td className="p-2 font-semibold">{r.invoiceQty}</td>
                    <td className="p-2">
                      <div className="hidden h-6 w-14 border-b border-neutral-400 print:block" />
                      <div className="print:hidden">
                        {!r.variantId ? (
                          <span className="text-[11px] text-neutral-400">—</span>
                        ) : done[i] ? (
                          <div className="text-[11px] text-emerald-700">
                            <div className="font-medium">✓ reçu {done[i].totalReceivedPO + done[i].surplus + done[i].forcedNoPO}</div>
                            {done[i].receivedOnPO.map((p, k) => <div key={k} className="text-neutral-500">{p.po} l.{p.line} ×{p.qty}</div>)}
                            {done[i].surplus > 0 && <div className="text-amber-700">surplus stock +{done[i].surplus}</div>}
                            {done[i].forcedNoPO > 0 && <div className="text-amber-700">sans PO +{done[i].forcedNoPO}</div>}
                            {done[i].picked > 0 && <div className="text-sky-700">picking −{done[i].picked}</div>}
                          </div>
                        ) : (
                          <input type="number" min="0" data-recv={i} value={recv[i] ?? String(r.invoiceQty)} disabled={!!bulk}
                            onChange={(e) => setRecv((s) => ({ ...s, [i]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") scanRef.current?.focus(); }}
                            className={`w-14 rounded border px-1 py-0.5 text-xs ${recvQtyOf(i, r) !== r.invoiceQty ? "border-amber-500 bg-amber-50 font-semibold" : "border-neutral-300"}`} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {report && (() => {
          const fr = reportLang === "fr";
          return (
            <div className="space-y-5">
              <div className="print:hidden flex flex-wrap items-center gap-3">
                <button onClick={() => setReport(null)} className="rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100">← retour à la liste</button>
                <div className="inline-flex overflow-hidden rounded-xl border border-neutral-300 text-sm">
                  <button onClick={() => setReportLang("fr")} className={`px-3 py-2 ${fr ? "bg-neutral-800 text-white" : ""}`}>FR</button>
                  <button onClick={() => setReportLang("en")} className={`px-3 py-2 ${!fr ? "bg-neutral-800 text-white" : ""}`}>EN</button>
                </div>
                <button onClick={() => window.print()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">↧ Imprimer / PDF ({reportLang.toUpperCase()})</button>
              </div>

              <div className="space-y-5 text-sm">
                <h1 className="text-xl font-semibold">{fr ? "Rapport d'arrivage — Icelea" : "Goods receipt report — Icelea"}</h1>

                <section>
                  <h2 className="mb-1 border-b border-neutral-300 font-semibold">{fr ? "1. Pièces facturées non reçues" : "1. Invoiced items not received"}</h2>
                  {report.neverScanned.length === 0 ? <p className="text-neutral-500">{fr ? "Aucune." : "None."}</p> : (
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-neutral-500"><th className="py-1">{fr ? "Article" : "Item"}</th><th>{fr ? "Taille" : "Size"}</th><th>{fr ? "Qté facture" : "Invoice qty"}</th></tr></thead>
                      <tbody>{report.neverScanned.map((x, k) => <tr key={k} className="border-t border-neutral-100"><td className="py-0.5 font-mono">{x.label}</td><td>{x.size ?? "—"}</td><td>{x.qty}</td></tr>)}</tbody>
                    </table>
                  )}
                </section>

                <section>
                  <h2 className="mb-1 border-b border-neutral-300 font-semibold">{fr ? "2. Écarts de quantité (facture ≠ reçu)" : "2. Quantity discrepancies (invoice ≠ received)"}</h2>
                  {report.qtyDiffs.length === 0 ? <p className="text-neutral-500">{fr ? "Aucun." : "None."}</p> : (
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-neutral-500"><th className="py-1">{fr ? "Article" : "Item"}</th><th>{fr ? "Taille" : "Size"}</th><th>{fr ? "Facture" : "Invoice"}</th><th>{fr ? "Reçu" : "Received"}</th><th>{fr ? "Écart" : "Diff"}</th></tr></thead>
                      <tbody>{report.qtyDiffs.map((x, k) => <tr key={k} className="border-t border-neutral-100"><td className="py-0.5 font-mono">{x.label}</td><td>{x.size ?? "—"}</td><td>{x.invoiceQty}</td><td>{x.receivedQty}</td><td>{x.receivedQty - x.invoiceQty}</td></tr>)}</tbody>
                    </table>
                  )}
                </section>

                <section>
                  <h2 className="mb-1 border-b border-neutral-300 font-semibold">{fr ? "3. Articles signalés (commentaires)" : "3. Flagged items (comments)"}</h2>
                  {report.itemRemarks.length === 0 ? <p className="text-neutral-500">{fr ? "Aucun." : "None."}</p> : (
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-neutral-500"><th className="py-1">{fr ? "Article" : "Item"}</th><th className="w-14">{fr ? "Taille" : "Size"}</th><th>{fr ? "Commentaire" : "Comment"}</th></tr></thead>
                      <tbody>{report.itemRemarks.map((x, k) => (
                        <tr key={k} className="border-t border-neutral-100 align-top">
                          <td className="py-0.5"><span className="font-mono">{x.sku ?? x.label}</span>{x.name && <span className="text-neutral-500"> — {x.name}</span>}</td>
                          <td>{x.size ?? "—"}</td>
                          <td className="whitespace-pre-wrap">{fr ? x.fr : (x.en || x.fr)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </section>

                <section>
                  <h2 className="mb-1 border-b border-neutral-300 font-semibold">{fr ? "4. Reste à livrer — PO ouverts" : "4. Still to deliver — open POs"} ({report.remaining.totalQty} {fr ? "pièces" : "pcs"})</h2>
                  {report.remaining.pos.map((po) => (
                    <div key={po.po} className="mt-2">
                      <div className="font-medium">{po.po} <span className="text-neutral-400">({po.lines.reduce((s, l) => s + l.qty, 0)} {fr ? "pcs" : "pcs"})</span></div>
                      <table className="w-full text-xs">
                        <tbody>{po.lines.map((l, k) => <tr key={k} className="border-t border-neutral-100"><td className="py-0.5"><span className="font-mono">{l.sku}</span>{l.name && <span className="text-neutral-500"> — {l.name}</span>}</td><td className="w-14">{l.size ?? "—"}</td><td className="w-10">×{l.qty}</td></tr>)}</tbody>
                      </table>
                    </div>
                  ))}
                </section>

                <section>
                  <h2 className="mb-1 border-b border-neutral-300 font-semibold">{fr ? "Remarques" : "Remarks"}</h2>
                  <div className="print:hidden space-y-2">
                    <textarea value={remarksFr} onChange={(e) => setRemarksFr(e.target.value)} rows={3} placeholder="Remarques (FR)…" className="w-full rounded border border-neutral-300 p-2 text-sm" />
                    <button onClick={translateRemarks} disabled={reportBusy} className="rounded-xl border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50">{reportBusy ? "…" : "Traduire → EN"}</button>
                    <textarea value={remarksEn} onChange={(e) => setRemarksEn(e.target.value)} rows={3} placeholder="Remarks (EN, pour le fournisseur)…" className="w-full rounded border border-neutral-300 p-2 text-sm" />
                  </div>
                  <div className="hidden whitespace-pre-wrap print:block">{fr ? remarksFr : remarksEn}</div>
                </section>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function ManualPick({ catalog, onPick }: { catalog: CatalogEntry[]; onPick: (c: CatalogEntry) => void }) {
  const [q, setQ] = useState("");
  const toks = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); // découpe sur +, -, /, espace…
  const results = toks.length === 0 ? [] : catalog.filter((c) => {
    const s = `${c.sku} ${c.name ?? ""}`.toLowerCase(); // recherche sur SKU ET nom
    return toks.every((t) => s.includes(t));
  }).slice(0, 10);
  return (
    <div className="mt-1">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="chercher dans Katana (nom/SKU)…"
        className="w-52 rounded border border-neutral-300 px-2 py-1 text-[11px]" />
      {results.length > 0 && (
        <div className="mt-1 max-h-44 w-72 overflow-auto rounded border border-neutral-200 bg-white text-[11px] shadow-lg">
          {results.map((c) => (
            <button key={c.sku} onClick={() => { onPick(c); setQ(""); }}
              className="block w-full border-b border-neutral-100 px-2 py-1 text-left hover:bg-neutral-100">
              <div className="font-mono">{c.sku}</div>
              {c.name && <div className="text-neutral-600">{c.name}</div>}
              <div className="text-neutral-400">{c.pos.map((p) => `${p.po} l.${p.line}`).join(" · ")}</div>
            </button>
          ))}
        </div>
      )}
      {toks.length > 0 && results.length === 0 && <div className="mt-1 text-[11px] text-neutral-400">aucun résultat dans les PO ouverts</div>}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-lg border border-neutral-300 p-2">
      <div className="text-neutral-500">{k}</div>
      <div className="text-lg font-semibold">{v}</div>
    </div>
  );
}
