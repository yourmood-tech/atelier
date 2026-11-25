"use client";

// Réassort boutique — la boutique commande son stock en écrivant ou en dictant (demande de Philippe, 25.11.2026).
import { useCallback, useEffect, useRef, useState } from "react";
import { choisirVersion, delai, repartir, type Proposition } from "@/lib/reassort-boutique-commun";

type Boutique = { id: number; nom: string };
type Ligne = { variantId: number; productId: number; titre: string; taille: string; version?: string; sku: string; image: string | null; quantite: number; pretes: number | null; alerte: string | null };
type Brouillon = { id: string; boutique: Boutique; creePar: string; creeLe: string; majLe: string; lignes: Ligne[]; historique: string[] };
type Valide = { commande: string; boutique: string; par: string; pieces: number; le: string };

async function appel<T>(corps: Record<string, unknown>): Promise<T> {
  const r = await fetch("/api/reassort-boutique", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erreur || "Erreur");
  return j as T;
}
const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* rien */ } };
const date = (iso: string) => new Date(iso).toLocaleString("fr-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const pieces = (l: Ligne[]) => l.reduce((s, x) => s + x.quantite, 0);
const COULEUR = { vert: "text-green-700", orange: "text-amber-700", gris: "text-stone-400" } as const;
const PASTILLE = { vert: "bg-green-100", orange: "bg-amber-100", gris: "bg-stone-100" } as const;
const court = (pretes: number | null, q: number) => (pretes == null ? "?" : pretes >= q ? "72 h" : pretes > 0 ? `${pretes} prête(s)` : "4 sem.");
// répartition prêtes / à fabriquer d'une liste de lignes
const bilan = (l: Ligne[]) => {
  let pretes = 0, fab = 0, inconnu = 0;
  for (const x of l) {
    if (x.pretes == null) inconnu += x.quantite;
    else { const p = Math.min(x.pretes, x.quantite); pretes += p; fab += x.quantite - p; }
  }
  return { pretes, fab, inconnu };
};

type Reco = { start: () => void; stop: () => void; lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export default function ReassortBoutique() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [boutiqueId, setBoutiqueId] = useState<number | null>(null);
  const [liste, setListe] = useState<Brouillon[]>([]);
  const [valides, setValides] = useState<Valide[]>([]);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [phrase, setPhrase] = useState("");
  const [props, setProps] = useState<Proposition[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState<{ texte: string; type: "ok" | "erreur" } | null>(null);
  const [recap, setRecap] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const [voixDispo, setVoixDispo] = useState(false);
  const reco = useRef<Reco | null>(null);
  const baseDictee = useRef("");

  const dire = (texte: string, type: "ok" | "erreur" = "ok") => setMessage({ texte, type });
  const boutique = boutiques.find((b) => b.id === boutiqueId) ?? null;

  const charger = useCallback(async (bid: number | null) => {
    try {
      const j = await appel<{ boutiques: Boutique[]; brouillons: Brouillon[]; valides: Valide[] }>({ action: "accueil", boutiqueId: bid });
      setBoutiques(j.boutiques); setListe(j.brouillons); setValides(j.valides);
    } catch (e) { dire((e as Error).message, "erreur"); }
  }, []);

  useEffect(() => {
    const b = lsGet("rb-boutique");
    const bid = b ? Number(b) : null;
    setBoutiqueId(bid);
    charger(bid);
    const enCours = lsGet("rb-brouillon");
    if (enCours) appel<{ brouillon: Brouillon }>({ action: "lire", id: enCours }).then((j) => setBrouillon(j.brouillon)).catch(() => lsSet("rb-brouillon", null));
    const w = window as unknown as { SpeechRecognition?: new () => Reco; webkitSpeechRecognition?: new () => Reco };
    setVoixDispo(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, [charger]);

  const choisirBoutique = (id: number) => {
    setBoutiqueId(id); lsSet("rb-boutique", String(id)); charger(id);
  };

  const ouvrir = (b: Brouillon) => { setBrouillon(b); lsSet("rb-brouillon", b.id); setProps([]); setQuestion(null); setMessage(null); setRecap(false); };
  const fermer = () => { setBrouillon(null); lsSet("rb-brouillon", null); setProps([]); setRecap(false); charger(boutiqueId); };

  const nouveau = async () => {
    if (!boutique) return;
    setOccupe("Création…");
    try { ouvrir((await appel<{ brouillon: Brouillon }>({ action: "creer", boutique })).brouillon); }
    catch (e) { dire((e as Error).message, "erreur"); } finally { setOccupe(null); }
  };

  const sauver = async (lignes: Ligne[], texte?: string) => {
    if (!brouillon) return;
    try { setBrouillon((await appel<{ brouillon: Brouillon }>({ action: "lignes", id: brouillon.id, lignes, phrase: texte })).brouillon); }
    catch (e) { dire((e as Error).message, "erreur"); }
  };

  // ── voix ──
  const dicter = () => {
    if (ecoute) { reco.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Reco; webkitSpeechRecognition?: new () => Reco };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "fr-CH"; r.continuous = true; r.interimResults = true;
    baseDictee.current = phrase ? phrase.trimEnd() + " " : "";
    r.onresult = (e) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setPhrase(baseDictee.current + txt);
    };
    r.onend = () => setEcoute(false);
    r.onerror = (e) => { setEcoute(false); if (e.error === "not-allowed") dire("Autorise le micro dans le navigateur pour dicter.", "erreur"); };
    reco.current = r; r.start(); setEcoute(true);
  };

  const comprendre = async () => {
    if (ecoute) reco.current?.stop();
    if (!phrase.trim()) return;
    setOccupe("Je cherche les articles…"); setMessage(null); setQuestion(null);
    try {
      const j = await appel<{ propositions: Proposition[]; question: string | null }>({ action: "interpreter", phrase });
      setProps((p) => [...p, ...j.propositions]);
      setQuestion(j.question);
      if (j.propositions.length) setPhrase("");
    } catch (e) { dire((e as Error).message, "erreur"); } finally { setOccupe(null); }
  };

  const majProp = (i: number, p: Partial<Proposition>) => setProps((all) => all.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const choisirCandidat = (i: number, idx: number) => {
    const p = props[i];
    const c = p.candidats[idx];
    const version = choisirVersion(c, `${p.demande.texte} ${p.demande.recherche}`);
    if (version == null) { majProp(i, { choisi: idx, version: null, quantites: {}, remarque: "Cet article existe en plusieurs versions : choisis laquelle." }); return; }
    const rep = repartir(c, p.demande, version);
    majProp(i, { choisi: idx, version, quantites: rep.quantites, remarque: rep.remarque });
  };
  const choisirVersionProp = (i: number, version: string) => {
    const p = props[i];
    if (p.choisi == null) return;
    const rep = repartir(p.candidats[p.choisi], p.demande, version);
    majProp(i, { version, quantites: rep.quantites, remarque: rep.remarque });
  };
  const ajouter = async (i: number) => {
    const p = props[i];
    if (p.choisi == null || !brouillon) return;
    const c = p.candidats[p.choisi];
    const nouvelles: Ligne[] = c.tailles.filter((t) => (p.quantites[String(t.variantId)] ?? 0) > 0).map((t) => ({
      variantId: t.variantId, productId: c.productId, titre: c.titre, taille: t.taille, version: t.autres || undefined, sku: t.sku, image: c.image,
      quantite: p.quantites[String(t.variantId)], pretes: t.pretes, alerte: c.alerte,
    }));
    if (!nouvelles.length) { majProp(i, { remarque: "Mets au moins une quantité." }); return; }
    await sauver([...brouillon.lignes, ...nouvelles], p.texte);
    setProps((all) => all.filter((_, k) => k !== i));
  };

  const changerQte = (variantId: number, delta: number) => {
    if (!brouillon) return;
    sauver(brouillon.lignes.map((l) => (l.variantId === variantId ? { ...l, quantite: Math.max(0, l.quantite + delta) } : l)));
  };

  const valider = async () => {
    if (!brouillon) return;
    setOccupe("Envoi de la commande…");
    try {
      const j = await appel<{ commande: string; pieces: number }>({ action: "valider", id: brouillon.id });
      dire(`Commande ${j.commande} envoyée à l'atelier (${j.pieces} pièces). Elle sort à l'impression avec « RÉASSORT BOUTIQUE ».`);
      fermer();
    } catch (e) { dire((e as Error).message, "erreur"); } finally { setOccupe(null); }
  };

  const [aEffacer, setAEffacer] = useState(false);
  const effacer = async () => {
    if (!brouillon) return;
    if (!aEffacer) { setAEffacer(true); return; }
    setAEffacer(false);
    try { await appel({ action: "supprimer", id: brouillon.id }); fermer(); } catch (e) { dire((e as Error).message, "erreur"); }
  };

  // panier regroupé par article
  const groupes = brouillon ? Object.values(brouillon.lignes.reduce<Record<number, Ligne[]>>((acc, l) => {
    (acc[l.productId] ??= []).push(l); return acc;
  }, {})) : [];

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Réassort boutique</h1>
            <p className="text-sm text-stone-600">Écris ou dicte ce que tu veux recevoir de l&apos;atelier.</p>
          </div>
          <select className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" value={boutiqueId ?? ""}
            onChange={(e) => choisirBoutique(Number(e.target.value))} disabled={!!brouillon}>
            <option value="" disabled>Choisis ta boutique</option>
            {boutiques.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        </header>

        {message && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.type === "ok" ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}>{message.texte}</div>
        )}
        {occupe && <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{occupe}</div>}

        {!brouillon && (
          <section className="space-y-4">
            {!boutique ? (
              <p className="rounded-lg bg-white p-4 text-sm shadow-sm">Choisis d&apos;abord ta boutique en haut à droite.</p>
            ) : (
              <>
                <button onClick={nouveau} className="w-full rounded-xl bg-stone-900 px-4 py-4 text-base font-semibold text-white">+ Nouvelle commande de stock pour {boutique.nom}</button>
                {liste.length > 0 && (
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <h2 className="mb-2 font-semibold">Commandes en cours (pas encore envoyées)</h2>
                    <ul className="divide-y divide-stone-100">
                      {liste.map((b) => (
                        <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                          <span>{pieces(b.lignes)} pièce(s) · commencée par {b.creePar.split("@")[0]} · modifiée le {date(b.majLe)}</span>
                          <button onClick={() => ouvrir(b)} className="rounded-lg border border-stone-300 px-3 py-1">Reprendre</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {valides.length > 0 && (
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <h2 className="mb-2 font-semibold">Dernières commandes envoyées</h2>
                    <ul className="text-sm text-stone-700">
                      {valides.map((v) => <li key={v.commande} className="py-1">{v.commande} · {v.pieces} pièce(s) · {v.par.split("@")[0]} · {date(v.le)}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {brouillon && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Commande pour {brouillon.boutique.nom}</span>
              <button onClick={fermer} className="text-stone-600 underline">Garder pour plus tard</button>
            </div>

            {/* saisie */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <textarea value={phrase} onChange={(e) => setPhrase(e.target.value)} rows={3}
                placeholder="Ex. : 10 medium aura doré, 2 par taille entre 54 et 62"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); comprendre(); } }}
                className="w-full resize-none rounded-lg border border-stone-300 p-3 text-base" />
              <div className="mt-2 flex gap-2">
                {voixDispo && (
                  <button onClick={dicter} className={`rounded-lg px-4 py-3 text-base font-semibold ${ecoute ? "animate-pulse bg-red-600 text-white" : "border border-stone-300 bg-white"}`}>
                    {ecoute ? "⏹ Stop" : "🎤 Dicter"}
                  </button>
                )}
                <button onClick={comprendre} disabled={!phrase.trim() || !!occupe} className="flex-1 rounded-lg bg-stone-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-40">Chercher les articles</button>
              </div>
              {question && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{question}</p>}
            </div>

            {/* propositions à confirmer */}
            {props.map((p, i) => {
              const c = p.choisi != null ? p.candidats[p.choisi] : null;
              return (
                <div key={i} className="rounded-xl border-2 border-amber-300 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm text-stone-500">« {p.texte} »</p>
                  {p.candidats.length > 0 && (
                    <select value={p.choisi ?? ""} onChange={(e) => choisirCandidat(i, Number(e.target.value))}
                      className="mb-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                      <option value="" disabled>— choisis l&apos;article —</option>
                      {p.candidats.map((cd, k) => <option key={cd.productId} value={k}>{cd.titre}</option>)}
                    </select>
                  )}
                  {c && c.versions.length > 1 && (
                    <select value={p.version ?? ""} onChange={(e) => choisirVersionProp(i, e.target.value)}
                      className="mb-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                      <option value="" disabled>— choisis la version —</option>
                      {c.versions.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  )}
                  {p.remarque && <p className="mb-2 text-sm text-amber-800">{p.remarque}</p>}
                  {c?.alerte && <p className="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-900">⚠ {c.alerte}</p>}
                  {c && <p className="mb-2 text-xs text-stone-500">Délai habituel sous chaque taille : <span className="text-green-700">72 h</span> = prête à partir · <span className="text-amber-700">4 sem.</span> = fabriquée, environ 4 semaines · <span className="text-stone-400">?</span> = à confirmer par l&apos;atelier</p>}
                  {c && p.version != null && (
                    <div className="flex gap-3">
                      {c.image && <img src={`${c.image}${c.image.includes("?") ? "&" : "?"}width=160`} alt="" className="h-20 w-20 rounded-lg object-cover" />}
                      <div className="grid flex-1 grid-cols-4 gap-2 sm:grid-cols-6">
                        {c.tailles.filter((t) => t.autres === p.version).map((t) => (
                          <label key={t.variantId} className="text-center text-xs">
                            <span className="block text-stone-500">{c.sansTaille ? "Qté" : t.taille}</span>
                            <input type="number" min={0} inputMode="numeric" value={p.quantites[String(t.variantId)] ?? ""}
                              onChange={(e) => majProp(i, { quantites: { ...p.quantites, [String(t.variantId)]: Math.max(0, Number(e.target.value) || 0) } })}
                              className={`w-full rounded border px-1 py-1 text-center text-sm ${(p.quantites[String(t.variantId)] ?? 0) > 0 ? "border-stone-900 font-bold" : "border-stone-200"}`} />
                            <span className={`block text-[10px] ${COULEUR[delai(t.pretes, Math.max(1, p.quantites[String(t.variantId)] ?? 0)).couleur]}`}>{court(t.pretes, Math.max(1, p.quantites[String(t.variantId)] ?? 0))}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => ajouter(i)} disabled={!c} className="flex-1 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
                      Ajouter {c ? `(${Object.values(p.quantites).reduce((s, n) => s + (n || 0), 0)} pièces)` : ""}
                    </button>
                    <button onClick={() => setProps((all) => all.filter((_, k) => k !== i))} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Ignorer</button>
                  </div>
                </div>
              );
            })}

            {/* panier */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Dans la commande : {pieces(brouillon.lignes)} pièce(s)</h2>
              {groupes.length > 0 && (() => { const b = bilan(brouillon.lignes); return (
                <p className="mb-2 text-sm">
                  <span className="text-green-700">{b.pretes} prête(s) à partir — environ 72 h</span>
                  {b.fab > 0 && <> · <span className="text-amber-700">{b.fab} à fabriquer — environ 4 semaines</span></>}
                  {b.inconnu > 0 && <> · <span className="text-stone-500">{b.inconnu} délai à confirmer par l&apos;atelier</span></>}
                </p>); })()}
              {!groupes.length && <p className="text-sm text-stone-500">Rien encore. Écris ou dicte ta première demande.</p>}
              <ul className="space-y-3">
                {groupes.map((g) => (
                  <li key={g[0].productId} className="border-t border-stone-100 pt-2">
                    <p className="text-sm font-medium">{g[0].titre}</p>
                    {g[0].alerte && <p className="text-xs text-amber-800">⚠ {g[0].alerte}</p>}
                    <div className="mt-1 flex flex-wrap gap-2">
                      {g.sort((a, b) => (a.version ?? "").localeCompare(b.version ?? "") || a.taille.localeCompare(b.taille, "fr", { numeric: true })).map((l) => (
                        <span key={l.variantId} title={delai(l.pretes, l.quantite).texte} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm ${PASTILLE[delai(l.pretes, l.quantite).couleur]}`}>
                          <button onClick={() => changerQte(l.variantId, -1)} className="px-1 font-bold">−</button>
                          {l.taille !== "—" && <span className="text-stone-500">T{l.taille}</span>}{l.version && <span className="text-stone-500">{l.version}</span>}<strong>×{l.quantite}</strong><span className={`text-xs ${COULEUR[delai(l.pretes, l.quantite).couleur]}`}>{court(l.pretes, l.quantite)}</span>
                          <button onClick={() => changerQte(l.variantId, 1)} className="px-1 font-bold">+</button>
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              {groupes.length > 0 && !recap && (
                <button onClick={() => setRecap(true)} className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white">Valider la commande…</button>
              )}
              {recap && (
                <div className="mt-4 rounded-xl border-2 border-stone-900 p-4">
                  <p className="mb-2 font-semibold">On envoie à l&apos;atelier {pieces(brouillon.lignes)} pièce(s) pour {brouillon.boutique.nom} ?</p>
                  <ul className="mb-3 text-sm">
                    {groupes.map((g) => (
                      <li key={g[0].productId}>• {g[0].titre} : {g.map((l) => `${l.taille !== "—" ? `T${l.taille}` : ""}${l.version ? ` ${l.version}` : ""} ×${l.quantite} (${court(l.pretes, l.quantite)})`).join(", ")}</li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button onClick={valider} disabled={!!occupe} className="flex-1 rounded-lg bg-green-700 px-3 py-3 font-semibold text-white disabled:opacity-40">Oui, envoyer</button>
                    <button onClick={() => setRecap(false)} className="rounded-lg border border-stone-300 px-3 py-3">Pas encore</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={effacer} className="text-sm text-red-700 underline">{aEffacer ? "Sûr ? Clique encore pour supprimer définitivement" : "Supprimer ce brouillon"}</button>
          </section>
        )}
      </div>
    </main>
  );
}
