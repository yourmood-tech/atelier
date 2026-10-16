"use client";

import { useEffect, useState } from "react";

// Outil SAV — retours clients. On scanne / tape le n° de commande, on choisit le type de retour,
// la commande est marquée dans Shopify. Liste des retours à traiter + échanges orphelins.
type Retour = { orderId: number; commande: string; client: string; type: 1 | 2 | 3; date: string; etat: string; tag: string; par?: string; traiteLe?: string };
type Orpheline = { orderId: number; commande: string; original: string; client: string; depuis: string };
const TYPES: Record<number, string> = { 1: "Échange de taille", 2: "Problème de qualité", 3: "Annulation" };
const SHOP = (n: string) => `https://admin.shopify.com/store/yourmood/orders?query=${encodeURIComponent(n)}`;

export default function Sav() {
  const [commande, setCommande] = useState("");
  const [type, setType] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);
  const [data, setData] = useState<{ nonTraites: Retour[]; traites: Retour[]; orphelines: Orpheline[] } | null>(null);

  async function charger() { const r = await fetch("/api/sav", { cache: "no-store" }); setData(await r.json()); }
  useEffect(() => { charger(); }, []);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!commande.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/sav", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retour", commande, type }) });
      const j = await r.json();
      if (!r.ok) setMsg({ ok: false, txt: j.error ?? "Erreur" });
      else { setMsg({ ok: true, txt: `${j.retour.commande} (${j.retour.client}) : ${TYPES[type]} enregistré — ${j.retour.tag}` }); setCommande(""); await charger(); }
    } finally { setBusy(false); }
  }
  async function traite(r: Retour) {
    if (!confirm(`Marquer le retour ${r.commande} (${TYPES[r.type]}) comme traité ?`)) return;
    await fetch("/api/sav", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "traite", orderId: r.orderId, tag: r.tag }) });
    await charger();
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">SAV — retours clients</h1>

      <form onSubmit={enregistrer} className="mt-4 rounded-xl border border-neutral-200 p-4">
        <label className="block text-sm font-medium">N° de commande</label>
        <input autoFocus value={commande} onChange={(e) => setCommande(e.target.value)} placeholder="ex. 401359"
          className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-lg" />
        <label className="mt-3 block text-sm font-medium">Type de retour</label>
        <select value={type} onChange={(e) => setType(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-neutral-300 p-2">
          {[1, 2, 3].map((t) => <option key={t} value={t}>{t}. {TYPES[t]}</option>)}
        </select>
        <button disabled={busy || !commande.trim()} className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">
          {busy ? "Enregistrement…" : "✓ Enregistrer le retour"}
        </button>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.txt}</p>}
      </form>

      {data && data.orphelines.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-rose-700">⚠️ Échanges orphelins ({data.orphelines.length})</h2>
          <p className="text-sm text-neutral-500">Commande d&apos;échange expédiée alors que la bague d&apos;origine n&apos;est pas revenue.</p>
          <ul className="mt-2 divide-y rounded-xl border border-rose-200">
            {data.orphelines.map((o) => (
              <li key={o.orderId} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <a href={SHOP(o.commande)} target="_blank" rel="noreferrer" className="font-medium underline">{o.commande}</a>
                <span>{o.client}</span>
                <span className="text-neutral-500">original {o.original} pas revenu · expédiée le {o.depuis}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Retours à traiter ({data?.nonTraites.length ?? "…"})</h2>
        <ul className="mt-2 divide-y rounded-xl border border-neutral-200">
          {(data?.nonTraites ?? []).map((r) => (
            <li key={r.tag} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <a href={SHOP(r.commande)} target="_blank" rel="noreferrer" className="font-medium underline">{r.commande}</a>
              <span>{r.client}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{TYPES[r.type]}</span>
              <span className="text-neutral-500">reçu le {r.date}</span>
              <button onClick={() => traite(r)} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-white">Traité</button>
            </li>
          ))}
          {data && data.nonTraites.length === 0 && <li className="p-3 text-sm text-neutral-500">Aucun retour en attente.</li>}
        </ul>
      </section>

      {data && data.traites.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-neutral-500">Traités récemment</h2>
          <ul className="mt-2 divide-y rounded-xl border border-neutral-100 text-sm text-neutral-500">
            {data.traites.map((r) => <li key={r.tag} className="p-2">{r.commande} · {r.client} · {TYPES[r.type]} · reçu le {r.date} · traité le {r.traiteLe}</li>)}
          </ul>
        </section>
      )}
    </main>
  );
}
