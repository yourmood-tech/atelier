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
      <main className="min-h-screen bg-zinc-950 text-zinc-100 px-5 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-semibold mb-6">Tableau de bord sondage</h1>
          <div className="border border-amber-700/30 bg-amber-950/20 rounded-xl p-5">
            <p className="text-sm text-amber-300 mb-2 font-medium">
              ⚠️ Impossible de lire le Sheet pour l&apos;instant
            </p>
            <p className="text-xs text-zinc-400 mb-4">
              {error || "Données non disponibles"}
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Si tu n&apos;as pas encore ajouté la fonction <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-amber-400">doGet</code> à ton Apps Script, c&apos;est l&apos;étape requise — voir{" "}
              <code className="bg-zinc-900 px-1.5 py-0.5 rounded">docs/sondage-apps-script-v2.md</code>.
            </p>
            <a href={SHEET_URL} target="_blank" className="inline-block mt-4 bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-100 px-5 py-2.5 rounded-lg text-sm">
              📊 Ouvrir le Sheet quand même
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-5 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
              Mood Collection — Sondage clientes
            </p>
            <h1 className="text-3xl font-semibold text-zinc-50 mb-2">
              Tableau de bord 💌
            </h1>
            <p className="text-zinc-400 text-sm">
              <strong className="text-zinc-100">{total}</strong> participation{total > 1 ? "s" : ""} au total
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-100 px-5 py-2.5 rounded-lg text-sm font-medium">
              📊 Sheet brut
            </a>
            <a href="/sondage" target="_blank" className="bg-amber-700 hover:bg-amber-600 transition-colors text-white px-5 py-2.5 rounded-lg text-sm font-medium">
              👁️ Voir le sondage
            </a>
          </div>
        </header>

        {total === 0 ? (
          <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-10 text-center">
            <p className="text-4xl mb-4">🌸</p>
            <p className="text-zinc-300 mb-2">Pas encore de participation.</p>
            <p className="text-xs text-zinc-500">
              Partage le lien <code className="bg-zinc-800 px-2 py-0.5 rounded">/sondage</code> par Klaviyo, story Insta, QR boutique.
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
                <section key={bloc.num} className="mb-12">
                  <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-5 pb-2 border-b border-zinc-800">
                    {bloc.emoji} Bloc {bloc.num} — {bloc.title}
                  </h2>
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
    <section className="mb-12">
      <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-5 pb-2 border-b border-zinc-800">
        💌 Champs libres — {totalLibre} réponse{totalLibre > 1 ? "s" : ""} (la valeur business №1)
      </h2>
      <div className="space-y-6">
        {sections.map((s) => (
          <div key={s.question.id}>
            <h3 className="text-sm font-medium text-amber-400 mb-3">
              {s.question.question} <span className="text-zinc-500 text-xs">({s.answers.length})</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {s.answers.map((a, i) => (
                <div key={i} className="border border-zinc-800 bg-zinc-900 rounded-xl p-4">
                  <p className="text-sm text-zinc-100 leading-relaxed mb-2 whitespace-pre-wrap">
                    &ldquo;{a.text}&rdquo;
                  </p>
                  <p className="text-xs text-zinc-500">
                    — {a.prenom || a.email}
                    {a.date && <span className="text-zinc-600"> · {a.date}</span>}
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

function QuestionStatCard({ question, values, total }: { question: Question; values: string[]; total: number }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-4 sm:p-5">
      <p className="text-sm font-medium text-zinc-100 mb-4 leading-snug">{question.question}</p>
      <StatRenderer question={question} values={values} total={total} />
    </div>
  );
}

function StatRenderer({ question, values, total }: { question: Question; values: string[]; total: number }) {
  if (values.length === 0) {
    return <p className="text-xs text-zinc-500 italic">Pas encore de réponse</p>;
  }

  if (question.type === "single") {
    const counts = countOccurrences(values);
    return <BarChart counts={counts} total={total} />;
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
    if (nums.length === 0) return <p className="text-xs text-zinc-500">—</p>;
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
    if (nums.length === 0) return <p className="text-xs text-zinc-500">—</p>;
    const moy = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    let emoji = "💕";
    if (moy < 20) emoji = "🥶";
    else if (moy < 40) emoji = "🌸";
    else if (moy < 60) emoji = "💕";
    else if (moy < 80) emoji = "🌹";
    else if (moy < 95) emoji = "❤️‍🔥";
    else emoji = "💎";
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-2">{emoji}</div>
        <div className="text-3xl font-serif text-amber-500 mb-1">{moy}%</div>
        <div className="text-xs text-zinc-500">Moyenne sur {nums.length} réponse{nums.length > 1 ? "s" : ""}</div>
      </div>
    );
  }

  if (question.type === "rating") {
    const nums = values
      .map((v) => parseInt(v.split("/")[0], 10))
      .filter((n) => !isNaN(n) && n > 0);
    if (nums.length === 0) return <p className="text-xs text-zinc-500">—</p>;
    const moy = nums.reduce((a, b) => a + b, 0) / nums.length;
    const max = question.ratingMax ?? 5;
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-3xl font-serif text-amber-500">{moy.toFixed(1)}</div>
          <div className="flex">
            {Array.from({ length: max }).map((_, i) => (
              <span key={i} className={`text-2xl ${i < Math.round(moy) ? "text-amber-500" : "text-zinc-700"}`}>★</span>
            ))}
          </div>
          <span className="text-xs text-zinc-500 ml-auto">{nums.length} réponse{nums.length > 1 ? "s" : ""}</span>
        </div>
        <div className="space-y-1.5">
          {[max, max - 1, max - 2, max - 3, max - 4].filter((n) => n > 0).map((n) => {
            const count = nums.filter((x) => x === n).length;
            const pct = (count / nums.length) * 100;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-zinc-400">{n}★</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-12 text-right text-zinc-500 tabular-nums">{count}</span>
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
      <div className="space-y-2">
        {ranked.slice(0, 6).map(([item, score], i) => {
          const pct = (score / maxScore) * 100;
          return (
            <div key={item} className="flex items-center gap-3">
              <span className="text-xl w-7 text-center">{i < 3 ? podium[i] : <span className="text-zinc-500 text-sm">{i + 1}</span>}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-zinc-300 truncate">{item}</span>
                  <span className="text-zinc-500 tabular-nums">{score} pts</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <p className="text-xs text-zinc-500">—</p>;
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

function BarChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((e) => e[1]), 1);
  return (
    <div className="space-y-1.5">
      {entries.map(([label, count]) => {
        const pct = (count / max) * 100;
        const totalPct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={label} className="text-xs">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-zinc-300 truncate">{label}</span>
              <span className="text-zinc-500 tabular-nums whitespace-nowrap ml-2">{count} · {totalPct}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
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
      <div className={`text-2xl font-serif ${highlight ? "text-amber-500" : "text-zinc-100"} mb-0.5`}>
        {value}
      </div>
      <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
