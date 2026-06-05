import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QUESTIONS, BLOCS, type Question } from "../questions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APPS_SCRIPT_URL =
  process.env.GOOGLE_SHEETS_WEBHOOK_URL
  || "https://script.google.com/macros/s/AKfycbw062yGNVkwL2mSm5WtinJrx4nqu5pxvA5HAGLcdEQ25T4cY87adV74RgmDVCP4Dxw83g/exec";

const SHEET_URL =
  process.env.GOOGLE_SHEET_URL
  || "https://docs.google.com/spreadsheets/d/1JVAOQFcEUz4kgvF8LWFwk5VGYpSeX03lPc2zEi0JkRc/edit";

// Palette Mood : douce, harmonieuse, élégante
const MOOD_PALETTE = [
  "#C9A878", // or rose
  "#E8C5B5", // rose poudré
  "#B6A4D8", // lavande
  "#88B4DF", // bleu ciel
  "#A8C9A6", // vert menthe doux
  "#F4C430", // jaune soleil
  "#D88A8A", // rose corail
  "#7BA098", // vert sauge
  "#D4A574", // or chaud
  "#9966CC", // améthyste
  "#FBC2C2", // rose pâle
  "#E2C792", // champagne
];

type SheetData = { headers: string[]; rows: string[][] };

async function fetchSheetData(): Promise<{ data: SheetData | null; error: string | null }> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, { cache: "no-store", redirect: "follow" });
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` };
    const j = await res.json();
    if (!j.ok) return { data: null, error: j.error || "Erreur Apps Script" };
    return { data: { headers: j.headers || [], rows: j.rows || [] }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Erreur fetch" };
  }
}

export default async function SondageAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { data, error } = await fetchSheetData();

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] px-5 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl mb-6">Tableau de bord sondage</h1>
          <div className="border border-[#E8DFD3] bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-base text-[#C9A878] mb-2 font-medium">⚠️ Impossible de lire le Sheet pour l&apos;instant</p>
            <p className="text-sm text-[#6B6B6B] mb-4">{error || "Données non disponibles"}</p>
            <a href={SHEET_URL} target="_blank" className="inline-block bg-[#1A1A1A] hover:bg-[#C9A878] transition-colors text-white px-5 py-2.5 rounded-full text-sm">
              📊 Ouvrir le Sheet
            </a>
          </div>
        </div>
      </main>
    );
  }

  const total = data.rows.length;
  const headerToIndex = new Map(data.headers.map((h, i) => [h, i]));

  function getColumn(questionLabel: string): string[] {
    const idx = headerToIndex.get(questionLabel);
    if (idx === undefined) return [];
    return data!.rows.map((r) => r[idx] ?? "").filter((v) => v !== "");
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] px-5 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#C9A878] mb-3">
              Mood Collection · Sondage clientes
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl text-[#1A1A1A] mb-3">
              Tableau de bord <span className="italic text-[#C9A878]">💌</span>
            </h1>
            <p className="text-[#6B6B6B] text-base">
              <strong className="text-[#1A1A1A] font-serif text-xl">{total}</strong> participation{total > 1 ? "s" : ""} au total
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="bg-white border-2 border-[#E8DFD3] hover:border-[#C9A878] transition-colors text-[#1A1A1A] px-5 py-2.5 rounded-full text-sm font-medium">
              📊 Sheet brut
            </a>
            <a href="/sondage" target="_blank" className="bg-[#1A1A1A] hover:bg-[#C9A878] transition-colors text-white px-5 py-2.5 rounded-full text-sm font-medium">
              👁️ Voir le sondage
            </a>
          </div>
        </header>

        {total === 0 ? (
          <div className="border-2 border-[#E8DFD3] bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-5xl mb-4">🌸</p>
            <p className="text-[#1A1A1A] mb-2 font-medium">Pas encore de participation.</p>
            <p className="text-sm text-[#6B6B6B]">
              Partage le lien <code className="bg-[#FDF8F3] px-2 py-0.5 rounded text-[#C9A878]">/sondage</code> par Klaviyo, story Insta, QR boutique.
            </p>
          </div>
        ) : (
          <>
            <ChampsLibresSection data={data} headerToIndex={headerToIndex} />

            {BLOCS.map((bloc) => {
              const blocQuestions = QUESTIONS.filter(
                (q) => q.bloc === bloc.num && q.type !== "contact" && q.type !== "text" && q.type !== "longtext"
              );
              if (blocQuestions.length === 0) return null;
              return (
                <section key={bloc.num} className="mb-14">
                  <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">
                    <span className="text-2xl mr-2">{bloc.emoji}</span>
                    {bloc.title}
                  </h2>
                  <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#C9A878] mb-6">
                    Bloc {bloc.num}
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {blocQuestions.map((q) => (
                      <QuestionStatCard key={q.id} question={q} values={getColumn(q.question)} total={total} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section champs libres : la valeur business №1
// ─────────────────────────────────────────────────────────────────────

function ChampsLibresSection({ data, headerToIndex }: { data: SheetData; headerToIndex: Map<string, number> }) {
  const champsLibres = QUESTIONS.filter((q) => q.type === "text" || q.type === "longtext");

  function getTextAnswers(qLabel: string): { prenom: string; email: string; text: string; date: string }[] {
    const idx = headerToIndex.get(qLabel);
    if (idx === undefined) return [];
    const prenomIdx = headerToIndex.get("Prénom") ?? 1;
    const emailIdx = headerToIndex.get("Email") ?? 2;
    const dateIdx = headerToIndex.get("Date") ?? 0;
    return data.rows
      .map((r) => ({
        prenom: r[prenomIdx] || "",
        email: r[emailIdx] || "",
        text: (r[idx] || "").trim(),
        date: r[dateIdx] || "",
      }))
      .filter((x) => x.text.length > 0);
  }

  const sections = champsLibres
    .map((q) => ({ question: q, answers: getTextAnswers(q.question) }))
    .filter((s) => s.answers.length > 0);

  if (sections.length === 0) return null;

  const totalLibre = sections.reduce((sum, s) => sum + s.answers.length, 0);

  return (
    <section className="mb-14">
      <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">
        💌 Les pépites des clientes
      </h2>
      <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#C9A878] mb-6">
        Champs libres · {totalLibre} réponse{totalLibre > 1 ? "s" : ""} · La valeur №1
      </p>
      <div className="space-y-8">
        {sections.map((s) => (
          <div key={s.question.id}>
            <h3 className="text-base font-medium text-[#1A1A1A] mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#C9A878] rounded-full" />
              {s.question.question}
              <span className="text-[#C9A878] text-xs ml-auto bg-[#FDF8F3] px-2 py-0.5 rounded-full">
                {s.answers.length}
              </span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {s.answers.map((a, i) => (
                <div key={i} className="bg-white border border-[#E8DFD3] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-serif italic text-base text-[#1A1A1A] leading-relaxed mb-3 whitespace-pre-wrap">
                    &ldquo;{a.text}&rdquo;
                  </p>
                  <p className="text-xs text-[#6B6B6B] flex items-center gap-2">
                    <span className="text-[#C9A878]">—</span>
                    <span className="font-medium">{a.prenom || a.email}</span>
                    {a.date && <span className="text-[#9A9A9A] ml-auto">{a.date}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Carte stat pour une question (dispatch selon type)
// ─────────────────────────────────────────────────────────────────────

function QuestionStatCard({ question, values, total }: { question: Question; values: string[]; total: number }) {
  return (
    <div className="bg-white border border-[#E8DFD3] rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm sm:text-base font-medium text-[#1A1A1A] mb-5 leading-snug">{question.question}</p>
      <StatRenderer question={question} values={values} total={total} />
    </div>
  );
}

function StatRenderer({ question, values, total }: { question: Question; values: string[]; total: number }) {
  if (values.length === 0) {
    return <p className="text-xs text-[#9A9A9A] italic">Pas encore de réponse</p>;
  }

  if (question.type === "single") {
    const counts = countOccurrences(values);
    return <PieChart counts={counts} total={total} />;
  }

  if (question.type === "multi") {
    const all = values.flatMap((v) => v.split(" · ").map((x) => x.trim()).filter(Boolean));
    const counts = countOccurrences(all);
    return <BarChart counts={counts} total={total} />;
  }

  if (question.type === "slider") {
    const nums = values
      .map((v) => parseFloat(v.replace(/[^\d.-]/g, "")))
      .filter((n) => !isNaN(n));
    if (nums.length === 0) return <p className="text-xs text-[#9A9A9A]">—</p>;
    const moy = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    const sorted = [...nums].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const unit = question.sliderUnit ?? "";
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Stat label="Moyenne" value={`${moy}${unit ? " " + unit : ""}`} highlight />
        <Stat label="Médiane" value={`${med}${unit ? " " + unit : ""}`} />
        <Stat label="Min" value={`${min}${unit ? " " + unit : ""}`} />
        <Stat label="Max" value={`${max}${unit ? " " + unit : ""}`} />
      </div>
    );
  }

  if (question.type === "gauge") {
    const nums = values
      .map((v) => parseFloat(v.replace(/[^\d.-]/g, "")))
      .filter((n) => !isNaN(n));
    if (nums.length === 0) return <p className="text-xs text-[#9A9A9A]">—</p>;
    const moy = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    let emoji = "💕";
    let label = "J'aime bien";
    if (moy < 20) { emoji = "🥶"; label = "Tiède"; }
    else if (moy < 40) { emoji = "🌸"; label = "Sympa"; }
    else if (moy < 60) { emoji = "💕"; label = "J'aime bien"; }
    else if (moy < 80) { emoji = "🌹"; label = "J'adore"; }
    else if (moy < 95) { emoji = "❤️‍🔥"; label = "Folle amoureuse"; }
    else { emoji = "💎"; label = "Obsédée"; }
    return (
      <div className="text-center py-2">
        <div className="text-7xl mb-2">{emoji}</div>
        <div className="font-serif text-4xl text-[#C9A878] mb-1">{moy}%</div>
        <div className="text-sm text-[#6B6B6B] italic">{label}</div>
        <div className="text-xs text-[#9A9A9A] mt-2">
          Moyenne sur {nums.length} réponse{nums.length > 1 ? "s" : ""}
        </div>
      </div>
    );
  }

  if (question.type === "rating") {
    const nums = values
      .map((v) => parseInt(v.split("/")[0], 10))
      .filter((n) => !isNaN(n) && n > 0);
    if (nums.length === 0) return <p className="text-xs text-[#9A9A9A]">—</p>;
    const moy = nums.reduce((a, b) => a + b, 0) / nums.length;
    const max = question.ratingMax ?? 5;
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="font-serif text-4xl text-[#C9A878]">{moy.toFixed(1)}</div>
          <div className="flex">
            {Array.from({ length: max }).map((_, i) => (
              <span key={i} className={`text-3xl ${i < Math.round(moy) ? "text-[#C9A878]" : "text-[#E8DFD3]"}`}>★</span>
            ))}
          </div>
          <span className="text-xs text-[#6B6B6B] ml-auto">
            {nums.length} avis
          </span>
        </div>
        <div className="space-y-1.5">
          {[max, max - 1, max - 2, max - 3, max - 4].filter((n) => n > 0).map((n) => {
            const count = nums.filter((x) => x === n).length;
            const pct = (count / nums.length) * 100;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-[#6B6B6B] font-medium">{n}★</span>
                <div className="flex-1 h-2 bg-[#FDF8F3] rounded-full overflow-hidden">
                  <div className="h-full bg-[#C9A878] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-12 text-right text-[#6B6B6B] tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "rank") {
    const scores: Record<string, number> = {};
    for (const v of values) {
      const items = v.split(" · ").map((x) => x.replace(/^\d+\.\s*/, "").trim());
      items.forEach((item, idx) => {
        if (!item) return;
        const points = idx === 0 ? 3 : idx === 1 ? 2 : 1;
        scores[item] = (scores[item] || 0) + points;
      });
    }
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const podium = ["🥇", "🥈", "🥉"];
    const maxScore = ranked[0]?.[1] || 1;
    return (
      <div className="space-y-2.5">
        {ranked.slice(0, 6).map(([item, score], i) => {
          const pct = (score / maxScore) * 100;
          return (
            <div key={item} className="flex items-center gap-3">
              <span className="text-2xl w-8 text-center">
                {i < 3 ? podium[i] : <span className="text-[#9A9A9A] text-sm font-medium">{i + 1}</span>}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#1A1A1A] truncate">{item}</span>
                  <span className="text-[#6B6B6B] tabular-nums text-xs whitespace-nowrap ml-2">{score} pts</span>
                </div>
                <div className="h-2 bg-[#FDF8F3] rounded-full overflow-hidden">
                  <div className="h-full bg-[#C9A878] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <p className="text-xs text-[#9A9A9A]">—</p>;
}

function countOccurrences(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    const k = v.trim();
    if (!k) continue;
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────
// Camembert (donut) via conic-gradient
// ─────────────────────────────────────────────────────────────────────

function PieChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const sum = entries.reduce((s, [, c]) => s + c, 0);

  // Construire les stops conic-gradient
  let cumPct = 0;
  const stops: string[] = [];
  entries.forEach(([, count], i) => {
    const pct = (count / sum) * 100;
    const color = MOOD_PALETTE[i % MOOD_PALETTE.length];
    stops.push(`${color} ${cumPct}% ${cumPct + pct}%`);
    cumPct += pct;
  });
  const gradient = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
      {/* Donut */}
      <div className="relative shrink-0">
        <div
          className="w-32 h-32 sm:w-36 sm:h-36 rounded-full shadow-inner"
          style={{ background: gradient }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-inner flex items-center justify-center">
            <div className="text-center">
              <div className="font-serif text-2xl sm:text-3xl text-[#C9A878] leading-none">{sum}</div>
              <div className="text-xs text-[#9A9A9A] mt-0.5">réponses</div>
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {entries.map(([label, count], i) => {
          const pct = Math.round((count / sum) * 100);
          const color = MOOD_PALETTE[i % MOOD_PALETTE.length];
          return (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[#1A1A1A] truncate flex-1">{label}</span>
              <span className="text-[#6B6B6B] tabular-nums font-medium whitespace-nowrap">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Barres horizontales colorées (pour multi-choix)
// ─────────────────────────────────────────────────────────────────────

function BarChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((e) => e[1]), 1);
  return (
    <div className="space-y-2.5">
      {entries.map(([label, count], i) => {
        const pct = (count / max) * 100;
        const totalPct = total > 0 ? Math.round((count / total) * 100) : 0;
        const color = MOOD_PALETTE[i % MOOD_PALETTE.length];
        return (
          <div key={label} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#1A1A1A] truncate">{label}</span>
              <span className="text-[#6B6B6B] tabular-nums whitespace-nowrap ml-2 font-medium">
                {count} <span className="text-[#9A9A9A]">·</span> {totalPct}%
              </span>
            </div>
            <div className="h-2 bg-[#FDF8F3] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className={`font-serif text-2xl ${highlight ? "text-[#C9A878]" : "text-[#1A1A1A]"} mb-1`}>
        {value}
      </div>
      <div className="text-xs text-[#9A9A9A] uppercase tracking-wider">{label}</div>
    </div>
  );
}
