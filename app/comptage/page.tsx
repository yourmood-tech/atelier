"use client";

// Comptage physique du stock — un vrai comptage Katana rempli en scannant (demande de Philippe, 14.11.2026).
// Produit par produit : chaque scan = +1 dans la taille (ou on tape le nombre). En scannant un autre produit,
// on valide la mise à zéro des tailles non scannées qui ont encore du stock dans Katana, puis le scan compte déjà 1.
import { useCallback, useEffect, useRef, useState } from "react";

type Seance = { id: number; numero: string; statut: string; creeLe: string; raison: string | null };
type Taille = { variantId: number; sku: string; taille: string; aDuStock: boolean; deja: number | null; codes: string[]; compte: number | null };
type Produit = { produit: { type: string; id: number; nom: string }; tailles: Taille[] };
type Ecarts = { lignes: number; avecEcart: number; pieces: { comptees: number; katana: number }; ecarts: { variantId: number; nom: string; katana: number; compte: number | null; ecart: number | null }[] };

const STATUTS: Record<string, { nom: string; couleur: string }> = {
  NOT_STARTED: { nom: "Pas commencé", couleur: "bg-gray-200 text-gray-800" },
  IN_PROGRESS: { nom: "En cours", couleur: "bg-yellow-300 text-yellow-950" },
  COUNTED: { nom: "Compté", couleur: "bg-yellow-100 text-yellow-900" },
  COMPLETED: { nom: "Terminé", couleur: "bg-green-200 text-green-900" },
};

async function appel<T>(corps: Record<string, unknown>): Promise<T> {
  const r = await fetch("/api/comptage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erreur || "Erreur");
  return j as T;
}
const norme = (s: string) => s.trim().toUpperCase();

export default function Comptage() {
  const [seances, setSeances] = useState<Seance[]>([]);
  const [seance, setSeance] = useState<Seance | null>(null);
  const [raison, setRaison] = useState("");
  const [courant, setCourant] = useState<Produit | null>(null);
  const [derniere, setDerniere] = useState<number | null>(null);
  const [attente, setAttente] = useState<{ suivant: Produit | null; scanne: number | null; zeros: Taille[] } | null>(null);
  const [code, setCode] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ texte: string; type: "ok" | "erreur" } | null>(null);
  const [ecarts, setEcarts] = useState<Ecarts | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  const dire = (texte: string, type: "ok" | "erreur" = "ok") => setMessage({ texte, type });
  const charger = useCallback(async () => {
    try { setSeances((await appel<{ seances: Seance[] }>({ action: "seances" })).seances); } catch (e) { dire(String((e as Error).message), "erreur"); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  // le produit en cours survit à un rechargement de la page
  useEffect(() => {
    if (!seance) return;
    try { const s = localStorage.getItem(`comptage-${seance.id}`); setCourant(s ? JSON.parse(s) : null); } catch { setCourant(null); }
  }, [seance]);
  useEffect(() => {
    if (!seance) return;
    try { if (courant) localStorage.setItem(`comptage-${seance.id}`, JSON.stringify(courant)); else localStorage.removeItem(`comptage-${seance.id}`); } catch { /* rien */ }
  }, [courant, seance]);
  useEffect(() => { if (!attente && !confirmer) champ.current?.focus(); }, [attente, confirmer, courant, seance]);

  const ouvrir = (p: { produit: Produit["produit"]; tailles: Omit<Taille, "compte">[] }, scanne: number | null): Produit => ({
    produit: p.produit,
    tailles: p.tailles.map((t) => ({ ...t, compte: t.variantId === scanne ? (t.deja ?? 0) + 1 : t.deja })),
  });

  const enregistrer = async (p: Produit, zeros: Taille[]) => {
    const lignes = p.tailles.filter((t) => t.compte != null || zeros.some((z) => z.variantId === t.variantId))
      .map((t) => ({ variantId: t.variantId, taille: t.taille, compte: t.compte ?? 0 }));
    if (!lignes.length) return;
    await appel({ action: "enregistrer", sid: seance!.id, nom: p.produit.nom, lignes });
  };

  // fin d'un produit : s'il reste des tailles non scannées avec du stock Katana → demande de validation
  const terminerProduit = (suivant: Produit | null, scanne: number | null) => {
    if (!courant) { if (suivant) { setCourant(suivant); setDerniere(scanne); } return; }
    const zeros = courant.tailles.filter((t) => t.compte == null && t.aDuStock);
    if (zeros.length) { setAttente({ suivant, scanne, zeros }); return; }
    valider(suivant, scanne, []);
  };
  const valider = async (suivant: Produit | null, scanne: number | null, zeros: Taille[]) => {
    if (!courant) return;
    setOccupe(true);
    try {
      await enregistrer(courant, zeros);
      dire(`${courant.produit.nom} enregistré${zeros.length ? ` — ${zeros.length} taille${zeros.length > 1 ? "s" : ""} mise${zeros.length > 1 ? "s" : ""} à zéro` : ""}`);
      setCourant(suivant); setDerniere(scanne); setAttente(null);
    } catch (e) { dire(String((e as Error).message), "erreur"); } finally { setOccupe(false); }
  };

  const scanner = async (brut: string) => {
    const c = norme(brut);
    if (!c || !seance) return;
    setCode("");
    // même produit : on compte sans rien demander à Katana
    const t = courant?.tailles.find((x) => x.codes.some((k) => norme(k) === c));
    if (t && courant) {
      setCourant({ ...courant, tailles: courant.tailles.map((x) => x.variantId === t.variantId ? { ...x, compte: (x.compte ?? 0) + 1 } : x) });
      setDerniere(t.variantId);
      return;
    }
    setOccupe(true);
    try {
      const r = await appel<{ produit: Produit["produit"]; scanne: number; tailles: Omit<Taille, "compte">[] }>({ action: "produit", sid: seance.id, code: c });
      if (courant && r.produit.id === courant.produit.id) {
        setCourant({ ...courant, tailles: courant.tailles.map((x) => x.variantId === r.scanne ? { ...x, compte: (x.compte ?? 0) + 1, codes: [...new Set([...x.codes, c])] } : x) });
        setDerniere(r.scanne);
        return;
      }
      const suivant = ouvrir(r, r.scanne);
      if (seance.statut === "NOT_STARTED") setSeance({ ...seance, statut: "IN_PROGRESS" });
      terminerProduit(suivant, r.scanne);
    } catch (e) { dire(String((e as Error).message), "erreur"); } finally { setOccupe(false); }
  };

  const nouvelle = async () => {
    setOccupe(true);
    try { const r = await appel<{ seance: Seance }>({ action: "creer", raison }); setRaison(""); setSeance(r.seance); setEcarts(null); await charger(); }
    catch (e) { dire(String((e as Error).message), "erreur"); } finally { setOccupe(false); }
  };
  const statut = async (s: string) => {
    if (!seance) return;
    setOccupe(true);
    try {
      const r = await appel<{ seance: Seance }>({ action: "statut", sid: seance.id, statut: s });
      setSeance(r.seance);
      if (s === "COUNTED") setEcarts(await appel<Ecarts>({ action: "ecarts", sid: seance.id }));
      if (s === "IN_PROGRESS") setEcarts(null);
      if (s === "COMPLETED") { dire("Comptage terminé : Katana a corrigé le stock."); setConfirmer(false); await charger(); }
    } catch (e) { dire(String((e as Error).message), "erreur"); } finally { setOccupe(false); }
  };
  useEffect(() => {
    if (seance?.statut === "COUNTED" && !ecarts) appel<Ecarts>({ action: "ecarts", sid: seance.id }).then(setEcarts).catch((e) => dire(String(e.message), "erreur"));
  }, [seance, ecarts]);

  // ── écran 1 : choisir ou créer une séance ──
  if (!seance) return (
    <main className="mx-auto max-w-3xl p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Comptage du stock</h1>
      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-medium">Nouveau comptage</h2>
        <input id="raison" value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="Ce qu'on compte (ex. tiroir anneaux argent A–C)" className="w-full rounded-lg border px-3 py-2" />
        <button onClick={nouvelle} disabled={occupe} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">Créer le comptage</button>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Comptages ouverts</h2>
        {!seances.length && <p className="text-sm text-gray-500">Aucun comptage ouvert.</p>}
        {seances.map((s) => (
          <button key={s.id} onClick={() => { setSeance(s); setEcarts(null); }} className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-gray-50">
            <span><span className="font-medium">{s.numero}</span><span className="block text-sm text-gray-500">{s.raison ?? ""} · {new Date(s.creeLe).toLocaleString("fr-CH")}</span></span>
            <span className={`rounded-full px-3 py-1 text-sm ${STATUTS[s.statut]?.couleur}`}>{STATUTS[s.statut]?.nom ?? s.statut}</span>
          </button>
        ))}
      </section>
      {message && <p className={message.type === "erreur" ? "text-red-600" : "text-green-700"}>{message.texte}</p>}
    </main>
  );

  // ── écran 2 : la séance ──
  const st = STATUTS[seance.statut] ?? { nom: seance.statut, couleur: "bg-gray-200" };
  const comptees = courant?.tailles.reduce((s, t) => s + (t.compte ?? 0), 0) ?? 0;
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <button onClick={() => { setSeance(null); charger(); }} className="text-sm text-gray-500 underline">← Tous les comptages</button>
          <h1 className="text-2xl font-semibold">{seance.numero}</h1>
          {seance.raison && <p className="text-sm text-gray-500">{seance.raison}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-sm ${st.couleur}`}>{st.nom}</span>
      </div>

      {message && <p role="status" className={`rounded-lg px-3 py-2 ${message.type === "erreur" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{message.texte}</p>}

      {(seance.statut === "NOT_STARTED" || seance.statut === "IN_PROGRESS") && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); scanner(code); }} className="flex gap-2">
            <input id="scan" ref={champ} value={code} onChange={(e) => setCode(e.target.value)} disabled={!!attente || occupe} autoComplete="off"
              placeholder="Scanne une pièce…" className="flex-1 rounded-lg border-2 border-black px-3 py-3 text-lg" />
            <button type="submit" disabled={occupe} className="rounded-lg bg-black px-4 text-white disabled:opacity-50">OK</button>
          </form>

          {courant ? (
            <section className="rounded-xl border p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-medium">{courant.produit.nom}</h2>
                <span className="text-sm text-gray-500 tabular-nums">{comptees} pièce{comptees > 1 ? "s" : ""} comptée{comptees > 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {courant.tailles.map((t) => (
                  <label key={t.variantId} className={`rounded-lg border p-2 ${derniere === t.variantId ? "border-black ring-2 ring-black" : t.compte == null ? "border-dashed" : ""}`}>
                    <span className="block text-sm text-gray-500">Taille {t.taille}</span>
                    <input id={`t-${t.variantId}`} type="number" inputMode="numeric" min={0} value={t.compte ?? ""} placeholder="—"
                      onChange={(e) => { const v = e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))); setCourant({ ...courant, tailles: courant.tailles.map((x) => x.variantId === t.variantId ? { ...x, compte: v } : x) }); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); champ.current?.focus(); } }}
                      className="w-full bg-transparent text-2xl font-semibold tabular-nums outline-none" />
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500">Rescanner la même pièce ajoute 1. Tu peux aussi taper le nombre dans la case. Une case vide = pas comptée.</p>
              <button onClick={() => terminerProduit(null, null)} disabled={occupe} className="rounded-lg border px-4 py-2 disabled:opacity-50">Produit terminé</button>
            </section>
          ) : <p className="text-gray-500">Scanne la première pièce d&apos;un produit pour commencer.</p>}

          {!courant && seance.statut === "IN_PROGRESS" && (
            <button onClick={() => statut("COUNTED")} disabled={occupe} className="rounded-lg bg-yellow-300 px-4 py-2 font-medium disabled:opacity-50">Comptage terminé — voir les écarts</button>
          )}
        </>
      )}

      {seance.statut === "COUNTED" && (
        <section className="space-y-3">
          {!ecarts ? <p>Calcul des écarts…</p> : (
            <>
              <p><b className="tabular-nums">{ecarts.lignes}</b> tailles comptées · <b className="tabular-nums">{ecarts.pieces.comptees}</b> pièces trouvées contre <b className="tabular-nums">{ecarts.pieces.katana}</b> dans Katana · <b className="tabular-nums">{ecarts.avecEcart}</b> tailles avec un écart.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="border-b text-left text-gray-500"><th className="py-1">Pièce · taille</th><th className="text-right">Katana</th><th className="text-right">Compté</th><th className="text-right">Écart</th></tr></thead>
                  <tbody>{ecarts.ecarts.map((r) => (
                    <tr key={r.variantId} className="border-b"><td className="py-1">{r.nom}</td><td className="text-right">{r.katana}</td><td className="text-right">{r.compte}</td>
                      <td className={`text-right font-medium ${(r.ecart ?? 0) < 0 ? "text-red-600" : "text-green-700"}`}>{(r.ecart ?? 0) > 0 ? "+" : ""}{r.ecart}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => statut("IN_PROGRESS")} disabled={occupe} className="rounded-lg border px-4 py-2">Reprendre le comptage</button>
                <button onClick={() => setConfirmer(true)} disabled={occupe} className="rounded-lg bg-green-700 px-4 py-2 text-white">Valider et corriger le stock</button>
              </div>
            </>
          )}
        </section>
      )}

      {seance.statut === "COMPLETED" && <p className="rounded-lg bg-green-50 px-3 py-2 text-green-800">Ce comptage est terminé. Katana a corrigé le stock.</p>}

      {attente && courant && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">{courant.produit.nom}</h2>
            <p>Ces tailles n&apos;ont pas été scannées mais ont encore du stock dans Katana :</p>
            <p className="text-2xl font-semibold">{attente.zeros.map((z) => z.taille).join(" · ")}</p>
            <p>Les mettre à <b>zéro</b> ?</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => valider(attente.suivant, attente.scanne, attente.zeros)} disabled={occupe} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">Oui, mettre à zéro et continuer</button>
              <button onClick={() => setAttente(null)} disabled={occupe} className="rounded-lg border px-4 py-2">Non, revenir au produit</button>
            </div>
          </div>
        </div>
      )}

      {confirmer && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Corriger le stock dans Katana ?</h2>
            <p>Katana remplacera le stock de toutes les tailles comptées par les quantités comptées{ecarts ? ` (${ecarts.avecEcart} tailles changent)` : ""}. On ne peut pas revenir en arrière.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => statut("COMPLETED")} disabled={occupe} className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50">Oui, corriger le stock</button>
              <button onClick={() => setConfirmer(false)} disabled={occupe} className="rounded-lg border px-4 py-2">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
