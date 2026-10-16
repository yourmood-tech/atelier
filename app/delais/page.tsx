"use client";

import { useEffect, useMemo, useState } from "react";

// Assistant des délais — page de validation de Philippe.
// Chaque demande de délai arrive ici avec un brouillon écrit à partir des seuls faits Shopify.
// Philippe relit, corrige si besoin, et envoie d'un clic (la réponse part de contact@yourmood.net).

type Envoi = { date: string; transporteur: string | null; numero: string | null; lien: string | null; articles: string[] };
type Faits = {
  statut: string; commande: string | null; passeeLe: string | null; langue: string;
  articlesEnAttente: string[]; envois: Envoi[]; iceleaLivraison: string | null;
  iceleaArrivee: { date: string; complet: boolean } | null;
  etape: { nom: string; entree: boolean; date: string } | null; rupture: string | null; etiquettesUtilisees: string[];
  estimation?: { fournisseur: string; delaiMin: number; delaiMax: number; du: string; au: string; depassee: boolean } | null;
};
type Brouillon = {
  ticketId: number; recuLe: string; client: string; email: string; sujet: string; message: string;
  faits: Faits; brouillon: string; etat: "a_valider" | "envoye" | "ecarte"; envoyeLe?: string; retouche?: boolean;
};

const STATUT: Record<string, { txt: string; couleur: string }> = {
  expediee: { txt: "Déjà expédiée", couleur: "bg-emerald-100 text-emerald-800" },
  expediee_partiel: { txt: "En partie expédiée", couleur: "bg-emerald-50 text-emerald-700" },
  piece_arrivee: { txt: "Pièce arrivée à l'atelier", couleur: "bg-sky-100 text-sky-800" },
  attente_icelea: { txt: "Attente pièce Icelea (date connue)", couleur: "bg-sky-50 text-sky-700" },
  etape: { txt: "Étape d'atelier connue", couleur: "bg-amber-100 text-amber-800" },
  estimation_fournisseur: { txt: "Estimation d'après le fournisseur", couleur: "bg-violet-100 text-violet-800" },
  rien: { txt: "Rien de précis — à compléter", couleur: "bg-rose-100 text-rose-800" },
  introuvable: { txt: "Commande introuvable", couleur: "bg-rose-100 text-rose-800" },
  annulee: { txt: "Commande annulée", couleur: "bg-neutral-200 text-neutral-700" },
};
const GORGIAS = (id: number) => `https://yourmood.gorgias.com/app/ticket/${id}`;

export default function Delais() {
  const [list, setList] = useState<Brouillon[] | null>(null);
  const [texte, setTexte] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [vue, setVue] = useState<"a_valider" | "traites">("a_valider");

  async function charger() {
    const r = await fetch("/api/delais", { cache: "no-store" });
    const j = await r.json();
    setList(j.brouillons ?? []);
  }
  useEffect(() => { charger(); const t = setInterval(charger, 60000); return () => clearInterval(t); }, []);

  const stats = useMemo(() => {
    const l = list ?? [];
    const env = l.filter((b) => b.etat === "envoye");
    return { attente: l.filter((b) => b.etat === "a_valider").length, envoyes: env.length,
      tels: env.filter((b) => !b.retouche).length, retouches: env.filter((b) => b.retouche).length, ecartes: l.filter((b) => b.etat === "ecarte").length };
  }, [list]);

  async function envoyer(b: Brouillon) {
    const t = (texte[b.ticketId] ?? b.brouillon).trim();
    if (!confirm(`Envoyer cette réponse à ${b.client} (${b.email}) ?`)) return;
    setBusy(b.ticketId);
    try {
      const r = await fetch("/api/delais/envoyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: b.ticketId, texte: t }) });
      const j = await r.json();
      if (!r.ok) alert(`Pas envoyé : ${j.error ?? r.status}`);
      await charger();
    } finally { setBusy(null); }
  }
  async function ecarter(b: Brouillon) {
    setBusy(b.ticketId);
    try { await fetch("/api/delais", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: b.ticketId, action: "ecarter" }) }); await charger(); }
    finally { setBusy(null); }
  }

  const affiches = (list ?? []).filter((b) => (vue === "a_valider" ? b.etat === "a_valider" : b.etat !== "a_valider"));

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Demandes de délai</h1>
      <p className="mt-1 text-sm text-neutral-500">Chaque demande arrive sur ton compte Gorgias avec un brouillon écrit à partir de Shopify et des étiquettes d&apos;atelier. Rien ne part sans ton clic.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Case titre="À valider" val={stats.attente} />
        <Case titre="Envoyés tels quels" val={stats.tels} sous={stats.envoyes ? `${Math.round((100 * stats.tels) / stats.envoyes)} % des envois` : "—"} />
        <Case titre="Envoyés retouchés" val={stats.retouches} />
        <Case titre="Écartés" val={stats.ecartes} />
      </div>

      <div className="mt-5 flex gap-2">
        {(["a_valider", "traites"] as const).map((v) => (
          <button key={v} onClick={() => setVue(v)} className={`rounded-full px-4 py-1.5 text-sm ${vue === v ? "bg-neutral-900 text-white" : "bg-neutral-100"}`}>
            {v === "a_valider" ? `À valider (${stats.attente})` : "Déjà traités"}
          </button>
        ))}
      </div>

      {list === null && <p className="mt-6 text-neutral-500">Chargement…</p>}
      {list && affiches.length === 0 && <p className="mt-6 text-neutral-500">{vue === "a_valider" ? "Aucune demande en attente." : "Rien pour l'instant."}</p>}

      <div className="mt-4 space-y-4">
        {affiches.map((b) => {
          const s = STATUT[b.faits.statut] ?? STATUT.rien;
          return (
            <section key={b.ticketId} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{b.client}</span>
                <span className="text-sm text-neutral-500">{b.email}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.couleur}`}>{s.txt}</span>
                <span className="text-xs text-neutral-400">{new Date(b.recuLe).toLocaleString("fr-CH")} · langue {b.faits.langue}</span>
                <a href={GORGIAS(b.ticketId)} target="_blank" rel="noreferrer" className="ml-auto text-xs text-sky-700 underline">ouvrir dans Gorgias</a>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase text-neutral-400">La cliente</div>
                  <div className="mt-1 text-sm font-medium">{b.sujet}</div>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 text-sm">{b.message}</pre>
                  <div className="mt-3 text-xs font-medium uppercase text-neutral-400">Ce que Shopify sait</div>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    <li>Commande {b.faits.commande ?? "—"} du {b.faits.passeeLe ?? "—"}</li>
                    {b.faits.envois.map((e, k) => <li key={k}>📦 envoyé le {e.date}{e.transporteur ? ` · ${e.transporteur}` : ""}{e.numero ? ` · ${e.numero}` : ""}</li>)}
                    {b.faits.articlesEnAttente.length > 0 && <li>⏳ encore à expédier : {b.faits.articlesEnAttente.join(", ")}</li>}
                    {b.faits.iceleaArrivee && <li>✅ pièce Icelea arrivée le {b.faits.iceleaArrivee.date}{b.faits.iceleaArrivee.complet ? " (tout reçu)" : " (en partie)"}</li>}
                    {b.faits.iceleaLivraison && <li>🚚 pièce Icelea attendue le {b.faits.iceleaLivraison}</li>}
                    {b.faits.etape && <li>🔧 {b.faits.etape.entree ? "entrée" : "sortie"} « {b.faits.etape.nom} » le {b.faits.etape.date}</li>}
                    {b.faits.rupture && <li>⚠️ rupture signalée le {b.faits.rupture}</li>}
                    {b.faits.estimation && <li>{b.faits.estimation.depassee ? "🔴" : "🗓️"} {b.faits.estimation.fournisseur} : {b.faits.estimation.delaiMin}–{b.faits.estimation.delaiMax} j après la commande → entre le {b.faits.estimation.du} et le {b.faits.estimation.au}{b.faits.estimation.depassee ? " — DÉLAI DÉPASSÉ, aucune date donnée à la cliente" : ""}</li>}
                  </ul>
                  {b.faits.etiquettesUtilisees.length > 0 && <div className="mt-1 text-xs text-neutral-400">étiquettes : {b.faits.etiquettesUtilisees.join(" · ")}</div>}
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-neutral-400">{b.etat === "a_valider" ? "Brouillon (modifiable)" : b.etat === "envoye" ? `Envoyé le ${new Date(b.envoyeLe!).toLocaleString("fr-CH")}${b.retouche ? " · retouché" : " · tel quel"}` : "Écarté"}</div>
                  <textarea
                    className="mt-1 h-72 w-full rounded border border-neutral-300 p-2 text-sm"
                    value={texte[b.ticketId] ?? b.brouillon}
                    readOnly={b.etat !== "a_valider"}
                    onChange={(e) => setTexte((x) => ({ ...x, [b.ticketId]: e.target.value }))}
                  />
                  {b.etat === "a_valider" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button disabled={busy === b.ticketId} onClick={() => envoyer(b)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
                        {busy === b.ticketId ? "Envoi…" : "✓ Envoyer à la cliente"}
                      </button>
                      <button disabled={busy === b.ticketId} onClick={() => ecarter(b)} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm">
                        Je réponds moi-même dans Gorgias
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Case({ titre, val, sous }: { titre: string; val: number; sous?: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <div className="text-xs text-neutral-500">{titre}</div>
      <div className="text-2xl font-semibold">{val}</div>
      {sous && <div className="text-xs text-neutral-400">{sous}</div>}
    </div>
  );
}
