"use client";

import { useEffect, useMemo, useState } from "react";

// Assistant des délais — page de validation de Philippe.
// Chaque demande de délai arrive ici avec un brouillon écrit à partir des seuls faits Shopify.
// Philippe relit, corrige si besoin, et envoie d'un clic (la réponse part de contact@yourmood.net).

type Envoi = { date: string; transporteur: string | null; numero: string | null; lien: string | null; articles: string[] };
type Faits = {
  statut: string; commande: string | null; commandeId?: number | null; passeeLe: string | null; langue: string;
  articlesEnAttente: string[]; envois: Envoi[]; iceleaLivraison: string | null;
  iceleaArrivee: { date: string; complet: boolean } | null;
  iceleaPO?: { po: string; commandeLe: string | null; arriveePrevue: string | null } | null;
  etape: { nom: string; entree: boolean; date: string } | null; rupture: string | null; etiquettesUtilisees: string[];
  boites?: string[];
  notes?: Note[];
  estimation?: { fournisseur: string; delaiMin: number; delaiMax: number; du: string; au: string; depassee: boolean } | null;
};
type Taille = {
  commande: string | null; commandeId?: number | null; passeeLe: string | null; langue: string; partie: boolean; envoyeeLe: string | null;
  joursDepuisEnvoi: number | null; dansLes15Jours: boolean | null; pays: string | null; suisse: boolean;
  articles: { lineItemId: number; titre: string; taille: string | null; aExpedier: boolean }[];
  tailleVoulue: string | null; tailleImpaire: boolean; proposition: string | null; aFaire: string | null;
  notes?: Note[];
};
type Note = { date: string | null; texte: string; source: "note" | "commentaire" };
type Brouillon = {
  ticketId: number; recuLe: string; client: string; email: string; sujet: string; message: string;
  type?: "delai" | "taille"; taille?: Taille | null;
  canal?: "email" | "whatsapp";
  historique?: { recuLe: string; message: string; etat: "envoye" | "ecarte"; envoyeLe?: string; texteEnvoye?: string; retouche?: boolean; ferme?: boolean }[];
  faits: Faits | null; brouillon: string; echange?: { commande: string; orderId: number; creeLe: string }; ticketFerme?: boolean; etat: "a_valider" | "envoye" | "ecarte"; envoyeLe?: string; retouche?: boolean;
};

const STATUT: Record<string, { txt: string; couleur: string }> = {
  expediee: { txt: "Déjà expédiée", couleur: "bg-emerald-100 text-emerald-800" },
  expediee_partiel: { txt: "En partie expédiée", couleur: "bg-emerald-50 text-emerald-700" },
  piece_arrivee: { txt: "Pièce arrivée à l'atelier", couleur: "bg-sky-100 text-sky-800" },
  attente_icelea: { txt: "Attente pièce Icelea (date connue)", couleur: "bg-sky-50 text-sky-700" },
  etape: { txt: "Étape d'atelier connue", couleur: "bg-amber-100 text-amber-800" },
  estimation_fournisseur: { txt: "Estimation d'après le fournisseur", couleur: "bg-violet-100 text-violet-800" },
  boite: { txt: "Boîte de rangement — date à compléter", couleur: "bg-teal-100 text-teal-800" },
  rien: { txt: "Rien de précis — à compléter", couleur: "bg-rose-100 text-rose-800" },
  introuvable: { txt: "Commande introuvable", couleur: "bg-rose-100 text-rose-800" },
  annulee: { txt: "Commande annulée", couleur: "bg-neutral-200 text-neutral-700" },
};
const GORGIAS = (id: number) => `https://yourmood.gorgias.com/app/ticket/${id}`;
const SHOPIFY = (id: number) => `https://admin.shopify.com/store/yourmood/orders/${id}`;

export default function Delais() {
  const [list, setList] = useState<Brouillon[] | null>(null);
  const [texte, setTexte] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [vue, setVue] = useState<"a_valider" | "traites">("a_valider");
  const [choix, setChoix] = useState<Record<string, string>>({});   // `${ticketId}:${lineItemId}` → nouvelle taille ("" = pas échangé)

  async function creerEchange(b: Brouillon) {
    const lignes = (b.taille?.articles ?? []).map((a) => ({ lineItemId: a.lineItemId, taille: choix[`${b.ticketId}:${a.lineItemId}`] ?? "" })).filter((x) => x.taille);
    if (!lignes.length) { alert("Indique la nouvelle taille d'au moins un article."); return; }
    if (!confirm(`Créer la commande d'échange (0 CHF, production immédiate) pour ${lignes.length} article(s) ?`)) return;
    setBusy(b.ticketId);
    try {
      const r = await fetch("/api/delais/echange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: b.ticketId, lignes }) });
      const j = await r.json();
      alert(r.ok ? `Commande d'échange ${j.commande} créée.${j.ferme ? " Le ticket est fermé." : j.erreurFermeture ? ` Ticket PAS fermé : ${j.erreurFermeture}` : " Le ticket se fermera dès que la réponse sera envoyée."}` : `Pas créée : ${j.error ?? r.status}`);
      await charger();
    } finally { setBusy(null); }
  }

  async function charger() {
    const r = await fetch("/api/delais", { cache: "no-store" });
    const j = await r.json();
    setList(j.brouillons ?? []);
  }
  useEffect(() => { charger(); const t = setInterval(charger, 60000); return () => clearInterval(t); }, []);

  const stats = useMemo(() => {
    const l = list ?? [];
    // chaque tour compte (un ticket où la cliente a répondu après coup a plusieurs tours)
    const tours = [...l.filter((b) => b.etat !== "a_valider"), ...l.flatMap((b) => b.historique ?? [])];
    const env = tours.filter((b) => b.etat === "envoye");
    return { attente: l.filter((b) => b.etat === "a_valider").length, envoyes: env.length,
      tels: env.filter((b) => !b.retouche).length, retouches: env.filter((b) => b.retouche).length, ecartes: tours.filter((b) => b.etat === "ecarte").length };
  }, [list]);

  async function envoyer(b: Brouillon) {
    const t = (texte[b.ticketId] ?? b.brouillon).trim();
    if (t.includes("[DATE À COMPLÉTER]")) { alert("Il reste « [DATE À COMPLÉTER] » dans le texte : remplace-le par la date de livraison avant d'envoyer."); return; }
    if (!confirm(`Envoyer cette réponse à ${b.client} (${b.email}) ?`)) return;
    setBusy(b.ticketId);
    try {
      const r = await fetch("/api/delais/envoyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: b.ticketId, texte: t }) });
      const j = await r.json();
      if (!r.ok) alert(`Pas envoyé : ${j.error ?? r.status}`);
      else if (j.erreurFermeture) alert(`Réponse envoyée, mais le ticket n'a pas pu être fermé : ${j.erreurFermeture}`);
      else if (j.attendEchange) alert("Réponse envoyée. Le ticket reste ouvert jusqu'à la création de la commande d'échange.");
      await charger();
    } finally { setBusy(null); }
  }
  // « ecarter » : Philippe répond lui-même dans Gorgias (ticket laissé ouvert) ; « fermer » : rien à répondre, ticket clos
  // relire la commande et refaire le brouillon (une carte, ou toutes celles à valider l'une après l'autre)
  async function refaire(bs: Brouillon[]) {
    for (const b of bs) {
      setBusy(b.ticketId);
      try {
        const r = await fetch("/api/delais", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: b.ticketId, action: "refaire" }) });
        if (!r.ok) alert(`${b.client} : pas refait (${(await r.json().catch(() => ({}))).error ?? r.status})`);
        setTexte((x) => { const y = { ...x }; delete y[b.ticketId]; return y; });
      } finally { setBusy(null); }
    }
    await charger();
  }
  async function ecarter(b: Brouillon, action: "ecarter" | "fermer") {
    setBusy(b.ticketId);
    try {
      const r = await fetch("/api/delais", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: b.ticketId, action }) });
      const j = await r.json();
      if (!r.ok) alert(`Pas fait : ${j.error ?? r.status}`);
      else if (j.erreurFermeture) alert(`Le ticket n'a pas pu être fermé : ${j.erreurFermeture}`);
      await charger();
    } finally { setBusy(null); }
  }

  // à valider : le plus ancien en haut (ordre reçu) ; déjà traités : le plus récent en haut
  const affiches = (list ?? []).filter((b) => (vue === "a_valider" ? b.etat === "a_valider" : b.etat !== "a_valider"));
  if (vue !== "a_valider") affiches.reverse();

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Demandes clientes — délais et tailles</h1>
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
        {vue === "a_valider" && stats.attente > 0 && (
          <button disabled={busy !== null} onClick={() => { if (confirm(`Relire les ${stats.attente} commandes et refaire tous les brouillons à valider ? (tes retouches non envoyées seront perdues)`)) refaire((list ?? []).filter((b) => b.etat === "a_valider")); }}
            className="ml-auto rounded-full bg-sky-100 px-4 py-1.5 text-sm text-sky-900 disabled:opacity-50">
            {busy !== null ? "Relecture en cours…" : "↻ Tout relire"}
          </button>
        )}
      </div>

      {list === null && <p className="mt-6 text-neutral-500">Chargement…</p>}
      {list && affiches.length === 0 && <p className="mt-6 text-neutral-500">{vue === "a_valider" ? "Aucune demande en attente." : "Rien pour l'instant."}</p>}

      <div className="mt-4 space-y-4">
        {affiches.map((b) => {
          const s = b.type === "taille" ? { txt: "Changement de taille", couleur: "bg-fuchsia-100 text-fuchsia-800" } : (STATUT[b.faits?.statut ?? "rien"] ?? STATUT.rien);
          const tl = b.taille;
          return (
            <section key={b.ticketId} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{b.client}</span>
                <span className="text-sm text-neutral-500">{b.email}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.couleur}`}>{s.txt}</span>
                {b.canal === "whatsapp" && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">WhatsApp</span>}
                <span className="text-xs text-neutral-400">{new Date(b.recuLe).toLocaleString("fr-CH")} · langue {b.faits?.langue ?? tl?.langue ?? "?"}</span>
                {(b.faits?.commandeId ?? tl?.commandeId) ? (
                  <a href={SHOPIFY((b.faits?.commandeId ?? tl?.commandeId)!)} target="_blank" rel="noreferrer" className="ml-auto text-xs text-emerald-700 underline">ouvrir la commande {b.faits?.commande ?? tl?.commande ?? ""} dans Shopify</a>
                ) : <span className="ml-auto text-xs text-neutral-400">commande non trouvée</span>}
                <a href={GORGIAS(b.ticketId)} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline">ouvrir dans Gorgias</a>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  {(b.historique ?? []).length > 0 && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <div className="text-xs font-medium uppercase text-amber-800">Déjà échangé sur ce ticket — la cliente a répondu</div>
                      {b.historique!.map((h, k) => (
                        <details key={k} className="mt-1 text-sm">
                          <summary className="cursor-pointer">
                            {new Date(h.recuLe).toLocaleDateString("fr-CH")} · {h.etat === "envoye" ? `réponse envoyée le ${new Date(h.envoyeLe!).toLocaleString("fr-CH")}` : "pas de réponse depuis la page (écarté)"}
                          </summary>
                          <div className="mt-1 text-xs text-neutral-500">Elle avait écrit :</div>
                          <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs">{h.message}</pre>
                          {h.texteEnvoye && <><div className="mt-1 text-xs text-neutral-500">On lui a répondu :</div>
                          <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs">{h.texteEnvoye}</pre></>}
                        </details>
                      ))}
                    </div>
                  )}
                  {b.echange && !(b.type === "taille" && tl?.partie) && (
                    <div className="mb-3 rounded bg-fuchsia-50 p-2 text-sm text-fuchsia-900">✅ Commande d&apos;échange déjà créée : {b.echange.commande} (le {new Date(b.echange.creeLe).toLocaleDateString("fr-CH")})</div>
                  )}
                  <div className="text-xs font-medium uppercase text-neutral-400">{(b.historique ?? []).length > 0 ? "Sa nouvelle réponse" : "La cliente"}</div>
                  <div className="mt-1 text-sm font-medium">{b.sujet}</div>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 text-sm">{b.message}</pre>
                  {b.type === "taille" && (
                    <>
                      <div className="mt-3 text-xs font-medium uppercase text-neutral-400">Ce que Shopify sait</div>
                      {!tl ? <p className="mt-1 text-sm text-rose-700">Commande introuvable — le brouillon demande le numéro.</p> : (
                        <ul className="mt-1 space-y-0.5 text-sm">
                          <li>Commande {tl.commande} du {tl.passeeLe} · livraison {tl.suisse ? "Suisse" : `hors de Suisse (${tl.pays ?? "?"}) → étiquette retour du colis`}</li>
                          <li>{tl.partie ? `📦 envoyée le ${tl.envoyeeLe} (il y a ${tl.joursDepuisEnvoi} j) — ${tl.dansLes15Jours ? "dans les 15 jours : échange sans condition" : "plus de 15 jours : gratuit si non portée et comme neuve"}` : "⏳ pas encore partie : taille à modifier dans la commande"}</li>
                          {tl.articles.map((a, k) => <li key={k}>• {a.titre}{a.taille ? ` — taille ${a.taille}` : ""}</li>)}
                          <li>Taille voulue : {tl.tailleVoulue ?? "non précisée (le brouillon la demande)"}{tl.tailleImpaire ? ` — impaire, proposer ${tl.proposition}` : ""}</li>
                        </ul>
                      )}
                      <Notes notes={tl?.notes} />
                      {tl?.aFaire && <div className="mt-2 rounded bg-yellow-50 p-2 text-sm text-yellow-900">👉 À faire avant d&apos;envoyer : {tl.aFaire}</div>}
                      {tl?.partie && (
                        <div className="mt-3 rounded-lg border border-fuchsia-200 p-2">
                          <div className="text-xs font-medium uppercase text-fuchsia-700">Commande d&apos;échange (0 CHF, production immédiate)</div>
                          {b.echange ? <p className="mt-1 text-sm">✅ {b.echange.commande} créée le {new Date(b.echange.creeLe).toLocaleDateString("fr-CH")} — étiquette ECHANGE-{(tl.commande ?? "").replace("#", "")}</p> : (
                            <>
                              {tl.articles.filter((a) => a.taille).map((a) => {
                                const k = `${b.ticketId}:${a.lineItemId}`;
                                return (
                                  <label key={k} className="mt-1 flex items-center gap-2 text-sm">
                                    <span className="flex-1">{a.titre} <span className="text-neutral-400">({a.taille})</span></span>
                                    → <input value={choix[k] ?? ""} onChange={(e) => setChoix((x) => ({ ...x, [k]: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                                      placeholder={tl.tailleVoulue && !tl.tailleImpaire ? tl.tailleVoulue : "taille"} className="w-16 rounded border border-neutral-300 p-1 text-center" />
                                  </label>
                                );
                              })}
                              <button disabled={busy === b.ticketId} onClick={() => creerEchange(b)} className="mt-2 rounded-lg bg-fuchsia-700 px-3 py-1.5 text-sm text-white disabled:opacity-50">Créer la commande d&apos;échange</button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {b.faits && <>
                  <div className="mt-3 text-xs font-medium uppercase text-neutral-400">Ce que Shopify sait</div>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    <li>Commande {b.faits.commande ?? "—"} du {b.faits.passeeLe ?? "—"}</li>
                    {b.faits.envois.map((e, k) => <li key={k}>📦 envoyé le {e.date}{e.transporteur ? ` · ${e.transporteur}` : ""}{e.numero ? ` · ${e.numero}` : ""}</li>)}
                    {b.faits.articlesEnAttente.length > 0 && <li>⏳ encore à expédier : {b.faits.articlesEnAttente.join(", ")}</li>}
                    {b.faits.iceleaArrivee && <li>✅ pièce Icelea arrivée le {b.faits.iceleaArrivee.date}{b.faits.iceleaArrivee.complet ? " (tout reçu)" : " (en partie)"}</li>}
                    {b.faits.iceleaPO && <li>🧾 pièce commandée chez Icelea · bon {b.faits.iceleaPO.po}{b.faits.iceleaPO.commandeLe ? ` du ${b.faits.iceleaPO.commandeLe}` : ""}{b.faits.iceleaPO.arriveePrevue ? "" : " · aucune date d'arrivée à venir (pas de date donnée à la cliente)"}</li>}
                    {b.faits.iceleaLivraison && <li>🚚 pièce Icelea attendue le {b.faits.iceleaLivraison}</li>}
                    {b.faits.etape && <li>🔧 {b.faits.etape.entree ? "entrée" : "sortie"} « {b.faits.etape.nom} » le {b.faits.etape.date}</li>}
                    {b.faits.rupture && <li>⚠️ rupture signalée le {b.faits.rupture}</li>}
                    {(b.faits.boites ?? []).length > 0 && <li>🎁 attend la boîte : {b.faits.boites!.join(", ")} → <b>date à compléter</b></li>}
                    {b.faits.estimation && <li>{b.faits.estimation.depassee ? "🔴" : "🗓️"} {b.faits.estimation.fournisseur} : {b.faits.estimation.delaiMin}–{b.faits.estimation.delaiMax} j après la commande → entre le {b.faits.estimation.du} et le {b.faits.estimation.au}{b.faits.estimation.depassee ? " — DÉLAI DÉPASSÉ, aucune date donnée à la cliente" : ""}</li>}
                  </ul>
                  <Notes notes={b.faits.notes} />
                  {b.faits.etiquettesUtilisees.length > 0 && <div className="mt-1 text-xs text-neutral-400">étiquettes : {b.faits.etiquettesUtilisees.join(" · ")}</div>}
                  </>}
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-neutral-400">{b.etat === "a_valider" ? "Brouillon (modifiable)" : b.etat === "envoye" ? `Envoyé le ${new Date(b.envoyeLe!).toLocaleString("fr-CH")}${b.retouche ? " · retouché" : " · tel quel"}${b.ticketFerme ? " · ticket fermé" : " · ticket encore ouvert"}` : b.ticketFerme ? "Écarté · ticket fermé" : "Écarté · à traiter dans Gorgias"}</div>
                  <textarea
                    className="mt-1 h-72 w-full rounded border border-neutral-300 p-2 text-sm"
                    value={texte[b.ticketId] ?? b.brouillon}
                    readOnly={b.etat !== "a_valider"}
                    onChange={(e) => setTexte((x) => ({ ...x, [b.ticketId]: e.target.value }))}
                  />
                  {b.etat === "a_valider" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button disabled={busy === b.ticketId} onClick={() => envoyer(b)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
                        {busy === b.ticketId ? "Envoi…" : b.canal === "whatsapp" ? "✓ Envoyer sur WhatsApp" : "✓ Envoyer à la cliente"}
                      </button>
                      <button disabled={busy === b.ticketId} onClick={() => refaire([b])} className="rounded-lg bg-sky-100 px-4 py-2 text-sm text-sky-900">
                        ↻ Relire la commande
                      </button>
                      <button disabled={busy === b.ticketId} onClick={() => ecarter(b, "ecarter")} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm">
                        Je réponds moi-même dans Gorgias
                      </button>
                      <button disabled={busy === b.ticketId} onClick={() => { if (confirm("Rien à répondre : on ferme le ticket dans Gorgias ?")) ecarter(b, "fermer"); }} className="rounded-lg bg-neutral-100 px-4 py-2 text-sm">
                        Rien à répondre — fermer le ticket
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

// note de la commande + commentaires de l'équipe dans son historique Shopify (lus par le brouillon)
function Notes({ notes }: { notes?: Note[] }) {
  if (!notes?.length) return null;
  return (
    <div className="mt-2 rounded bg-sky-50 p-2 text-sm">
      <div className="text-xs font-medium uppercase text-sky-800">Notes de l&apos;équipe sur la commande</div>
      <ul className="mt-1 space-y-0.5">
        {notes.map((n, k) => <li key={k}>📝 {n.date ? `${n.date} — ` : "note de la commande — "}{n.texte}</li>)}
      </ul>
    </div>
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
