"use client";

// Pilotage des boutiques — achats en réassort (valeur au prix du site) face aux ventes en caisse, boutique par boutique.
// Réservé à Philippe, Stéphanie et Fabienne (demande de Philippe, 25.11.2026).
import { useEffect, useMemo, useState } from "react";

type LigneJour = { jour: string; boutique: string; achat: number; achatPieces: number; ventes: number; ventesPieces: number };
type Reassort = { jour: string; boutique: string; valeur: number; pieces: number; commande: string };
type Periode = { cle: string; label: string; achat: number; ventes: number; achatPieces: number; ventesPieces: number };

const BOUTIQUES = ["Orbe", "Carouge", "Martigny", "Fribourg", "Zürich", "Zermatt", "Réassort stand"];
const C_ACHAT = "#2a78d6", C_VENTE = "#eb6834";
const chf = (n: number) => `${Math.round(n).toLocaleString("fr-CH").replace(/ | /g, "'")} CHF`;
const court = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("fr-CH", { maximumFractionDigits: n >= 10000 ? 0 : 1 })}k` : String(Math.round(n)));

async function appel<T>(corps: Record<string, unknown>): Promise<T> {
  const r = await fetch("/api/pilotage-boutiques", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erreur || "Erreur");
  return j as T;
}

// lundi de la semaine (heure locale du jour donné)
function lundi(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`);
  const k = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - k);
  return d.toISOString().slice(0, 10);
}
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function periodes(lignes: LigneJour[], boutique: string, mode: "semaine" | "mois", jusquau: string, n: number): Periode[] {
  const cles: string[] = [];
  const fin = new Date(`${jusquau}T12:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    if (mode === "semaine") { const d = new Date(fin); d.setUTCDate(d.getUTCDate() - 7 * i); cles.push(lundi(d.toISOString().slice(0, 10))); }
    else { const d = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - i, 1)); cles.push(d.toISOString().slice(0, 7)); }
  }
  const m = new Map(cles.map((c) => [c, { cle: c, label: "", achat: 0, ventes: 0, achatPieces: 0, ventesPieces: 0 }]));
  for (const l of lignes) {
    if (l.boutique !== boutique) continue;
    const c = mode === "semaine" ? lundi(l.jour) : l.jour.slice(0, 7);
    const p = m.get(c);
    if (!p) continue;
    p.achat += l.achat; p.ventes += l.ventes; p.achatPieces += l.achatPieces; p.ventesPieces += l.ventesPieces;
  }
  return cles.map((c) => {
    const p = m.get(c)!;
    p.label = mode === "semaine" ? `${c.slice(8, 10)}.${c.slice(5, 7)}` : `${MOIS[Number(c.slice(5, 7)) - 1]} ${c.slice(2, 4)}`;
    return p;
  });
}

// barres groupées : deux séries sur un seul axe, survol = détail
function Barres({ data, a, b, nomA, nomB, unite }: { data: Periode[]; a: (p: Periode) => number; b: (p: Periode) => number; nomA: string; nomB: string; unite: (n: number) => string }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const W = 640, H = 170, G = 34, B = 18;
  const max = Math.max(1, ...data.map((p) => Math.max(a(p), b(p))));
  const pas = (W - G) / data.length;
  const bw = Math.max(3, Math.min(16, pas / 2 - 3));
  const y = (v: number) => H - B - (v / max) * (H - B - 12);
  const graduations = [0, 0.5, 1].map((t) => t * max);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setSurvol(null)} role="img" aria-label={`${nomA} et ${nomB} par période`}>
        {graduations.map((g, i) => (
          <g key={i}>
            <line x1={G} x2={W} y1={y(g)} y2={y(g)} stroke="var(--grille)" strokeWidth={1} />
            <text x={G - 4} y={y(g) + 3} textAnchor="end" fontSize={9} fill="var(--texte-2)">{court(g)}</text>
          </g>
        ))}
        {data.map((p, i) => {
          const x = G + i * pas + pas / 2;
          const va = a(p), vb = b(p);
          return (
            <g key={p.cle} onMouseEnter={() => setSurvol(i)}>
              <rect x={G + i * pas} y={0} width={pas} height={H} fill={survol === i ? "var(--survol)" : "transparent"} />
              {va > 0 && <rect x={x - bw - 1} y={y(va)} width={bw} height={H - B - y(va)} rx={3} fill={C_ACHAT} />}
              {vb > 0 && <rect x={x + 1} y={y(vb)} width={bw} height={H - B - y(vb)} rx={3} fill={C_VENTE} />}
              {(data.length <= 14 || i % 2 === data.length % 2) && <text x={x} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--texte-2)">{p.label}</text>}
            </g>
          );
        })}
      </svg>
      {survol != null && (
        <div className="pointer-events-none absolute top-0 rounded-lg border px-3 py-2 text-xs shadow-sm"
          style={{ left: `${Math.min(70, (survol / data.length) * 100)}%`, background: "var(--carte)", borderColor: "var(--bord)", color: "var(--texte)" }}>
          <div className="mb-1 font-semibold">{data[survol].label}</div>
          <div><span className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: C_ACHAT }} />{nomA} : {unite(a(data[survol]))}</div>
          <div><span className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: C_VENTE }} />{nomB} : {unite(b(data[survol]))}</div>
        </div>
      )}
    </div>
  );
}

export default function PilotageBoutiques() {
  const [lignes, setLignes] = useState<LigneJour[]>([]);
  const [reassorts, setReassorts] = useState<Reassort[]>([]);
  const [jusquau, setJusquau] = useState("");
  const [mode, setMode] = useState<"semaine" | "mois">("semaine");
  const [etat, setEtat] = useState<string | null>("Chargement…");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let fini = false;
    (async () => {
      try {
        // l'historique des ventes se construit petit à petit la première fois, puis seuls les derniers jours sont relus
        for (let tour = 0; tour < 60 && !fini; tour++) {
          const r = await appel<{ faits: number; reste: number }>({ action: "rattraper", max: 15 });
          if (r.reste <= 0) break;
          setEtat(`Lecture de l'historique des ventes… encore ${r.reste} jour(s)`);
          const d = await appel<{ lignes: LigneJour[]; reassorts: Reassort[]; jusquau: string }>({ action: "donnees" });
          setLignes(d.lignes); setReassorts(d.reassorts); setJusquau(d.jusquau);
        }
        const d = await appel<{ lignes: LigneJour[]; reassorts: Reassort[]; jusquau: string }>({ action: "donnees" });
        setLignes(d.lignes); setReassorts(d.reassorts); setJusquau(d.jusquau); setEtat(null);
      } catch (e) { setErreur((e as Error).message); setEtat(null); }
    })();
    return () => { fini = true; };
  }, []);

  const n = mode === "semaine" ? 12 : 12;
  const parBoutique = useMemo(() => (jusquau ? BOUTIQUES.map((b) => ({ b, p: periodes(lignes, b, mode, jusquau, n) })) : []), [lignes, mode, jusquau, n]);

  // depuis le premier réassort de chaque boutique : pièces reçues face aux pièces vendues
  const depuis = useMemo(() => {
    const r: Record<string, { debut: string | null; recues: number; vendues: number; achat: number; ventes: number }> = {};
    for (const b of BOUTIQUES) {
      const debut = reassorts.filter((x) => x.boutique === b).map((x) => x.jour).sort()[0] ?? null;
      const ls = debut ? lignes.filter((l) => l.boutique === b && l.jour >= debut) : [];
      r[b] = { debut, recues: ls.reduce((s, l) => s + l.achatPieces, 0), vendues: ls.reduce((s, l) => s + l.ventesPieces, 0),
        achat: ls.reduce((s, l) => s + l.achat, 0), ventes: ls.reduce((s, l) => s + l.ventes, 0) };
    }
    return r;
  }, [lignes, reassorts]);

  return (
    <main className="pilotage min-h-screen" style={{ background: "var(--fond)", color: "var(--texte)" }}>
      <style>{`
        .pilotage { --fond:#f6f5f2; --carte:#fcfcfb; --texte:#0b0b0b; --texte-2:#52514e; --bord:#e4e2dc; --grille:#ebe9e4; --survol:rgba(0,0,0,.04); }
        @media (prefers-color-scheme: dark) { .pilotage { --fond:#121211; --carte:#1a1a19; --texte:#f0efec; --texte-2:#c3c2b7; --bord:#2f2e2b; --grille:#2a2927; --survol:rgba(255,255,255,.05); } }
      `}</style>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Pilotage des boutiques</h1>
            <p className="text-sm" style={{ color: "var(--texte-2)" }}>
              Ce que chaque boutique se fait envoyer en réassort (valeur au prix du site) face à ce qu&apos;elle vend en caisse (retours déduits).
            </p>
          </div>
          <div className="flex rounded-lg border p-1 text-sm" style={{ borderColor: "var(--bord)", background: "var(--carte)" }}>
            {(["semaine", "mois"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className="rounded-md px-4 py-1.5 font-medium"
                style={mode === m ? { background: "var(--texte)", color: "var(--fond)" } : { color: "var(--texte-2)" }}>
                {m === "semaine" ? "Par semaine" : "Par mois"}
              </button>
            ))}
          </div>
        </header>

        {erreur && <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900">{erreur}</div>}
        {etat && <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{etat}</div>}

        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm" style={{ color: "var(--texte-2)" }}>
          <span><span className="mr-1.5 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: C_ACHAT }} />Achats en réassort</span>
          <span><span className="mr-1.5 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: C_VENTE }} />Ventes en caisse</span>
          <span>· {mode === "semaine" ? "12 dernières semaines" : "12 derniers mois"} · survole une barre pour le détail</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {parBoutique.map(({ b, p }) => {
            const achat = p.reduce((s, x) => s + x.achat, 0), ventes = p.reduce((s, x) => s + x.ventes, 0);
            const d = depuis[b];
            const ecart = d.recues - d.vendues;
            const alerte = d.debut && d.achat > d.ventes;
            return (
              <section key={b} className="rounded-xl border p-4" style={{ background: "var(--carte)", borderColor: "var(--bord)" }}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{b}</h2>
                  {d.debut && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${alerte ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900"}`}>
                      {alerte ? "⚠ achète plus qu'elle ne vend" : "✓ vend plus qu'elle n'achète"}
                    </span>
                  )}
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                  <div><div style={{ color: "var(--texte-2)" }}>Achats ({mode === "semaine" ? "12 sem." : "12 mois"})</div><div className="text-xl font-bold">{chf(achat)}</div></div>
                  <div><div style={{ color: "var(--texte-2)" }}>Ventes ({mode === "semaine" ? "12 sem." : "12 mois"})</div><div className="text-xl font-bold">{chf(ventes)}</div></div>
                </div>
                <Barres data={p} a={(x) => x.achat} b={(x) => x.ventes} nomA="Achats" nomB="Ventes" unite={chf} />
                <div className="mt-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--texte-2)" }}>Pièces reçues / pièces vendues</div>
                <Barres data={p} a={(x) => x.achatPieces} b={(x) => x.ventesPieces} nomA="Reçues" nomB="Vendues" unite={(n) => `${n} pièce(s)`} />
                <p className="mt-2 text-sm" style={{ color: "var(--texte-2)" }}>
                  {d.debut
                    ? <>Depuis le premier réassort ({d.debut.split("-").reverse().join(".")}) : <strong style={{ color: "var(--texte)" }}>{d.recues}</strong> pièces reçues, <strong style={{ color: "var(--texte)" }}>{d.vendues}</strong> vendues → {ecart > 0 ? <>le stock a grossi d&apos;environ <strong style={{ color: "var(--texte)" }}>{ecart}</strong> pièces</> : <>le stock a baissé d&apos;environ <strong style={{ color: "var(--texte)" }}>{-ecart}</strong> pièces</>}.</>
                    : "Pas encore de réassort commandé avec l'outil."}
                </p>
              </section>
            );
          })}
        </div>

        <section className="mt-6 rounded-xl border p-4" style={{ background: "var(--carte)", borderColor: "var(--bord)" }}>
          <h2 className="mb-2 text-lg font-semibold">Dernières commandes de réassort</h2>
          {!reassorts.length ? <p className="text-sm" style={{ color: "var(--texte-2)" }}>Aucune pour l&apos;instant.</p> : (
            <table className="w-full text-sm">
              <thead><tr style={{ color: "var(--texte-2)" }} className="text-left"><th className="py-1">Date</th><th>Boutique</th><th>Commande</th><th className="text-right">Pièces</th><th className="text-right">Valeur</th></tr></thead>
              <tbody>
                {reassorts.slice(0, 30).map((r) => (
                  <tr key={r.commande} className="border-t" style={{ borderColor: "var(--bord)" }}>
                    <td className="py-1">{r.jour.split("-").reverse().join(".")}</td><td>{r.boutique}</td><td>{r.commande}</td>
                    <td className="text-right">{r.pieces}</td><td className="text-right">{chf(r.valeur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <p className="mt-4 text-xs" style={{ color: "var(--texte-2)" }}>
          « Réassort stand » = les réassorts pour les stands, comparés aux ventes de toutes les autres caisses (salons, Manor…). Les pièces vendues comptent aussi le stock que la boutique avait déjà avant l&apos;outil.
        </p>
      </div>
    </main>
  );
}
