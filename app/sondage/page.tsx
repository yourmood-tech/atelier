"use client";

import { useState, useMemo, useEffect } from "react";
import { QUESTIONS, BLOCS, type Question } from "./questions";

type Answers = Record<string, string | string[] | number | { prenom: string; email: string }>;

type Status = "intro" | "questions" | "submitting" | "done" | "error";

export default function SondagePage() {
  const [status, setStatus] = useState<Status>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [bonCode, setBonCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sparkle, setSparkle] = useState<number>(0); // pour anim paillettes

  const visibleQuestions = useMemo(() => {
    return QUESTIONS.filter((q) => {
      if (!q.showIf) return true;
      const refValue = answers[q.showIf.questionId];
      if (Array.isArray(refValue)) return refValue.includes(q.showIf.valueIncludes);
      return refValue === q.showIf.valueIncludes;
    });
  }, [answers]);

  const total = visibleQuestions.length;
  const current = visibleQuestions[step];
  const progress = Math.round(((step + 1) / total) * 100);
  const currentBloc = useMemo(() => BLOCS.find((b) => b.num === current?.bloc), [current]);

  function setAnswer(qid: string, value: Answers[string]) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    setSparkle((s) => s + 1);
  }

  function canContinue(): boolean {
    if (!current) return false;
    if (current.optional) return true;
    const v = answers[current.id];
    if (current.type === "single") return typeof v === "string" && v.length > 0;
    if (current.type === "multi") return Array.isArray(v) && v.length > 0;
    if (current.type === "text" || current.type === "longtext") return typeof v === "string" && v.trim().length > 0;
    if (current.type === "slider" || current.type === "gauge") return typeof v === "number";
    if (current.type === "rating") return typeof v === "number" && v > 0;
    if (current.type === "rank") return Array.isArray(v) && v.length > 0;
    if (current.type === "contact") {
      const c = v as { prenom: string; email: string } | undefined;
      return !!c && c.prenom.trim().length > 0 && /\S+@\S+\.\S+/.test(c.email);
    }
    return false;
  }

  function next() {
    if (step < total - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submit();
    }
  }

  function back() {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submit() {
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sondage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reponses: answers }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur serveur");
      }
      setBonCode(data.bon_code);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Une erreur est survenue");
    }
  }

  // ===== INTRO =====
  if (status === "intro") {
    return (
      <main className="min-h-screen bg-[#FDF8F3] text-[#1A1A1A] flex items-center justify-center px-5 py-12">
        <div className="max-w-xl w-full text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#C9A878] mb-6">
            Mood Collection
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight mb-6 text-[#1A1A1A]">
            Aide-nous à créer<br />
            <span className="italic text-[#C9A878]">ta prochaine pépite</span> ✨
          </h1>
          <p className="text-base sm:text-lg text-[#5A5A5A] leading-relaxed mb-3">
            On rêve de pépites créatives qui te ressemblent vraiment.
            Quelques questions pour mieux te connaître, et inventer ensemble
            ce qui va te faire craquer.
          </p>
          <p className="text-sm text-[#7A7A7A] mb-10">
            🎁 À la fin, tu repars avec un <strong>bon de 20.-</strong> rien que pour toi.
            <br />
            <span className="text-xs">~12 minutes en mood détente 🌸</span>
          </p>
          <button
            onClick={() => setStatus("questions")}
            className="bg-[#1A1A1A] hover:bg-[#C9A878] transition-colors text-white px-10 py-4 rounded-full text-base font-medium tracking-wide"
          >
            On y va ❤️
          </button>
        </div>
      </main>
    );
  }

  // ===== DONE =====
  if (status === "done" && bonCode) {
    return (
      <main className="min-h-screen bg-[#FDF8F3] text-[#1A1A1A] flex items-center justify-center px-5 py-12">
        <div className="max-w-xl w-full text-center">
          <div className="text-6xl mb-6">🫶🏼</div>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight mb-6">
            Merci <span className="italic text-[#C9A878]">infiniment</span>
          </h1>
          <p className="text-base sm:text-lg text-[#5A5A5A] leading-relaxed mb-8">
            Tu viens peut-être de signer la prochaine pépite Mood.
            Chaque réponse compte — promis, on lit tout ❤️
          </p>

          <div className="bg-white border-2 border-[#C9A878] rounded-2xl p-6 sm:p-8 mb-6 shadow-lg">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#C9A878] mb-3">
              Ton code de réduction
            </p>
            <p className="text-3xl sm:text-4xl font-serif tracking-wider mb-2">
              {bonCode}
            </p>
            <p className="text-sm text-[#7A7A7A]">
              <strong>20.- offerts</strong> dès 50.- d&apos;achat<br />
              Valable 60 jours sur yourmood.net
            </p>
          </div>

          <p className="text-xs text-[#7A7A7A] mb-8">
            Note ton code dès maintenant pour l&apos;avoir sous la main 🌸
          </p>

          <a
            href="https://yourmood.net"
            className="inline-block bg-[#1A1A1A] hover:bg-[#C9A878] transition-colors text-white px-10 py-4 rounded-full text-base font-medium tracking-wide"
          >
            Découvrir nos pépites ✨
          </a>
        </div>
      </main>
    );
  }

  // ===== ERROR =====
  if (status === "error") {
    return (
      <main className="min-h-screen bg-[#FDF8F3] text-[#1A1A1A] flex items-center justify-center px-5 py-12">
        <div className="max-w-md w-full text-center">
          <p className="text-4xl mb-4">🌸</p>
          <h1 className="font-serif text-2xl mb-4">Une petite hésitation...</h1>
          <p className="text-sm text-[#5A5A5A] mb-6">
            {errorMsg || "Quelque chose s'est mal passé. On peut réessayer ?"}
          </p>
          <button
            onClick={() => {
              setStatus("questions");
              setErrorMsg(null);
            }}
            className="bg-[#1A1A1A] hover:bg-[#C9A878] transition-colors text-white px-8 py-3 rounded-full text-sm font-medium"
          >
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  if (status === "submitting") {
    return (
      <main className="min-h-screen bg-[#FDF8F3] text-[#1A1A1A] flex items-center justify-center px-5 py-12">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">✨</div>
          <p className="text-base text-[#5A5A5A]">On enregistre tes réponses...</p>
        </div>
      </main>
    );
  }

  if (!current) return null;

  // ===== QUESTIONS =====
  return (
    <main className="min-h-screen bg-[#FDF8F3] text-[#1A1A1A]">
      <SparkleLayer trigger={sparkle} />

      {/* Barre de progression */}
      <div className="sticky top-0 z-10 bg-[#FDF8F3] border-b border-[#E8DFD3]">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[#7A7A7A]">
              {currentBloc?.emoji} <span className="font-medium">{currentBloc?.title}</span>
            </div>
            <div className="text-xs text-[#7A7A7A]">
              {step + 1} / {total}
            </div>
          </div>
          <div className="h-1.5 bg-[#E8DFD3] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A878] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12">
        <QuestionView
          key={current.id}
          question={current}
          value={answers[current.id]}
          onChange={(v) => setAnswer(current.id, v)}
        />

        <div className="mt-10 flex items-center justify-between gap-4">
          <button
            onClick={back}
            disabled={step === 0}
            className="text-sm text-[#7A7A7A] hover:text-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-2"
          >
            ← Retour
          </button>
          <button
            onClick={next}
            disabled={!canContinue()}
            className="bg-[#1A1A1A] hover:bg-[#C9A878] disabled:bg-[#D5CFC4] disabled:cursor-not-allowed transition-colors text-white px-8 sm:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium tracking-wide"
          >
            {step === total - 1 ? "Recevoir mon bon 20.- 🎁" : "Suivant ✨"}
          </button>
        </div>

        {current.optional && (
          <button
            onClick={next}
            className="block mx-auto mt-4 text-xs text-[#7A7A7A] hover:text-[#C9A878] transition-colors underline-offset-4 hover:underline"
          >
            Passer cette question
          </button>
        )}
      </div>
    </main>
  );
}

function QuestionView({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: Answers[string] | undefined;
  onChange: (v: Answers[string]) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl leading-snug mb-2 text-[#1A1A1A]">
        {question.question}
      </h2>
      {question.hint && (
        <p className="text-sm text-[#7A7A7A] mb-6 italic">{question.hint}</p>
      )}
      {!question.hint && <div className="mb-6" />}

      {question.type === "single" && (
        <div className="space-y-2.5">
          {question.options?.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selected
                    ? "border-[#C9A878] bg-white shadow-md"
                    : "border-[#E8DFD3] bg-white hover:border-[#C9A878]/50"
                }`}
              >
                {opt.emoji && <span className="text-xl">{opt.emoji}</span>}
                <span className={`flex-1 ${selected ? "font-medium" : ""}`}>{opt.label}</span>
                {selected && <span className="text-[#C9A878]">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "multi" && (
        <MultiOptions
          options={question.options || []}
          value={Array.isArray(value) ? value : []}
          onChange={(v) => onChange(v)}
        />
      )}

      {question.type === "text" && (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="w-full px-5 py-4 rounded-2xl border-2 border-[#E8DFD3] bg-white focus:border-[#C9A878] focus:outline-none text-base"
        />
      )}

      {question.type === "longtext" && (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={5}
          className="w-full px-5 py-4 rounded-2xl border-2 border-[#E8DFD3] bg-white focus:border-[#C9A878] focus:outline-none text-base resize-none"
        />
      )}

      {question.type === "slider" && (
        <SliderInput
          min={question.sliderMin ?? 0}
          max={question.sliderMax ?? 10}
          step={question.sliderStep ?? 1}
          unit={question.sliderUnit ?? ""}
          minLabel={question.sliderLabels?.min}
          maxLabel={question.sliderLabels?.max}
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
        />
      )}

      {question.type === "gauge" && (
        <GaugeMood
          minLabel={question.sliderLabels?.min}
          maxLabel={question.sliderLabels?.max}
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
        />
      )}

      {question.type === "rating" && (
        <StarRating
          max={question.ratingMax ?? 5}
          value={typeof value === "number" ? value : 0}
          onChange={onChange}
        />
      )}

      {question.type === "rank" && (
        <RankList
          options={question.options || []}
          value={Array.isArray(value) ? value : (question.options || []).map((o) => o.value)}
          topN={question.rankTopN ?? 3}
          onChange={onChange}
        />
      )}

      {question.type === "contact" && (
        <ContactFields
          value={(value as { prenom: string; email: string }) || { prenom: "", email: "" }}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function MultiOptions({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; emoji?: string; color?: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  }

  const isColorGrid = options.every((o) => o.color);

  if (isColorGrid) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`relative rounded-xl p-3 border-2 transition-all flex flex-col items-center gap-2 ${
                selected ? "border-[#C9A878] bg-white shadow-md" : "border-[#E8DFD3] bg-white hover:border-[#C9A878]/50"
              }`}
            >
              <div
                className="w-12 h-12 rounded-full border border-[#E8DFD3]"
                style={{ backgroundColor: opt.color }}
              />
              <span className="text-xs text-center leading-tight">{opt.label}</span>
              {selected && (
                <span className="absolute top-1 right-1 text-[#C9A878] text-sm">✓</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`text-left px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
              selected ? "border-[#C9A878] bg-white shadow-md" : "border-[#E8DFD3] bg-white hover:border-[#C9A878]/50"
            }`}
          >
            {opt.emoji && <span className="text-lg">{opt.emoji}</span>}
            <span className={`flex-1 text-sm ${selected ? "font-medium" : ""}`}>{opt.label}</span>
            {selected && <span className="text-[#C9A878]">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function SliderInput({
  min,
  max,
  step,
  unit,
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  unit: string;
  minLabel?: string;
  maxLabel?: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const currentValue = value ?? Math.round((min + max) / 2);
  const percent = ((currentValue - min) / (max - min)) * 100;

  useEffect(() => {
    if (value === undefined) onChange(currentValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8DFD3] p-6 sm:p-8">
      <div className="text-center mb-6">
        <div className="font-serif text-5xl sm:text-6xl text-[#C9A878] mb-1">
          {currentValue}
          {unit && <span className="text-2xl sm:text-3xl text-[#1A1A1A] ml-2">{unit}</span>}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer slider-mood"
        style={{
          background: `linear-gradient(to right, #C9A878 0%, #C9A878 ${percent}%, #E8DFD3 ${percent}%, #E8DFD3 100%)`,
        }}
      />
      <style jsx>{`
        .slider-mood::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          background: #1A1A1A;
          border: 3px solid #FDF8F3;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .slider-mood::-moz-range-thumb {
          width: 28px;
          height: 28px;
          background: #1A1A1A;
          border: 3px solid #FDF8F3;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>

      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-3 text-xs text-[#7A7A7A]">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function GaugeMood({
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  minLabel?: string;
  maxLabel?: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const currentValue = value ?? 50;

  useEffect(() => {
    if (value === undefined) onChange(50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let emoji = "💕";
  let intensite = "Bien";
  if (currentValue < 20) { emoji = "🥶"; intensite = "Tiède"; }
  else if (currentValue < 40) { emoji = "🌸"; intensite = "Sympa"; }
  else if (currentValue < 60) { emoji = "💕"; intensite = "J'aime bien"; }
  else if (currentValue < 80) { emoji = "🌹"; intensite = "J'adore"; }
  else if (currentValue < 95) { emoji = "❤️‍🔥"; intensite = "Folle amoureuse"; }
  else { emoji = "💎"; intensite = "Obsédée 😄"; }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8DFD3] p-6 sm:p-8">
      <div className="text-center mb-6">
        <div className="text-7xl mb-2 transition-transform" style={{ transform: `scale(${0.8 + currentValue / 250})` }}>
          {emoji}
        </div>
        <div className="font-serif text-4xl text-[#C9A878] mb-1">{currentValue}%</div>
        <div className="text-sm text-[#7A7A7A] italic">{intensite}</div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={currentValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer gauge-mood"
        style={{
          background: `linear-gradient(to right, #88B4DF 0%, #E8C5B5 30%, #D63384 60%, #C73E3E 80%, #4B1A4D 100%)`,
        }}
      />
      <style jsx>{`
        .gauge-mood::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 32px;
          height: 32px;
          background: white;
          border: 4px solid #C9A878;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        .gauge-mood::-moz-range-thumb {
          width: 32px;
          height: 32px;
          background: white;
          border: 4px solid #C9A878;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
      `}</style>

      <div className="flex justify-between mt-3 text-xs text-[#7A7A7A]">
        <span>{minLabel ?? "0"}</span>
        <span>{maxLabel ?? "100"}</span>
      </div>
    </div>
  );
}

function StarRating({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Bof 🥲", "Pas top", "Bien 🌸", "Top ✨", "Magique ❤️"];

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8DFD3] p-6 sm:p-8 text-center">
      <div className="flex justify-center gap-2 sm:gap-3 mb-4">
        {Array.from({ length: max }).map((_, i) => {
          const n = i + 1;
          const active = (hover || value) >= n;
          return (
            <button
              key={i}
              onClick={() => onChange(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="text-5xl sm:text-6xl transition-all hover:scale-110"
              aria-label={`${n} étoiles`}
            >
              <span className={active ? "text-[#C9A878]" : "text-[#E8DFD3]"}>★</span>
            </button>
          );
        })}
      </div>
      {(hover || value) > 0 && (
        <p className="text-sm text-[#7A7A7A] italic">{labels[hover || value]}</p>
      )}
      {!hover && !value && (
        <p className="text-sm text-[#7A7A7A] italic">Touche une étoile pour noter</p>
      )}
    </div>
  );
}

function RankList({
  options,
  value,
  topN,
  onChange,
}: {
  options: { value: string; label: string; emoji?: string }[];
  value: string[];
  topN: number;
  onChange: (v: string[]) => void;
}) {
  // Init avec ordre par défaut si vide
  useEffect(() => {
    if (value.length === 0) onChange(options.map((o) => o.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function move(idx: number, dir: -1 | 1) {
    const newOrder = [...value];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    onChange(newOrder);
  }

  const items = value
    .map((v) => options.find((o) => o.value === v))
    .filter((o): o is NonNullable<typeof o> => !!o);

  const podiumEmoji = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#7A7A7A] mb-3">
        Touche ↑ pour monter, ↓ pour descendre. Les <strong>3 premières</strong> sont ton podium 🏆
      </p>
      {items.map((opt, i) => {
        const onPodium = i < topN;
        return (
          <div
            key={opt.value}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
              onPodium
                ? "border-[#C9A878] bg-white shadow-md"
                : "border-[#E8DFD3] bg-white/60"
            }`}
          >
            <span className="text-2xl w-10 text-center">
              {onPodium ? podiumEmoji[i] : <span className="text-[#7A7A7A] text-base">{i + 1}</span>}
            </span>
            {opt.emoji && <span className="text-lg">{opt.emoji}</span>}
            <span className={`flex-1 text-sm ${onPodium ? "font-medium" : "text-[#5A5A5A]"}`}>
              {opt.label}
            </span>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="w-7 h-7 rounded-full bg-[#FDF8F3] hover:bg-[#C9A878]/20 disabled:opacity-30 disabled:cursor-not-allowed text-sm flex items-center justify-center"
                aria-label="Monter"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="w-7 h-7 rounded-full bg-[#FDF8F3] hover:bg-[#C9A878]/20 disabled:opacity-30 disabled:cursor-not-allowed text-sm flex items-center justify-center"
                aria-label="Descendre"
              >
                ↓
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContactFields({
  value,
  onChange,
}: {
  value: { prenom: string; email: string };
  onChange: (v: { prenom: string; email: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value.prenom}
        onChange={(e) => onChange({ ...value, prenom: e.target.value })}
        placeholder="Ton prénom"
        className="w-full px-5 py-4 rounded-2xl border-2 border-[#E8DFD3] bg-white focus:border-[#C9A878] focus:outline-none text-base"
      />
      <input
        type="email"
        value={value.email}
        onChange={(e) => onChange({ ...value, email: e.target.value })}
        placeholder="ton@email.com"
        className="w-full px-5 py-4 rounded-2xl border-2 border-[#E8DFD3] bg-white focus:border-[#C9A878] focus:outline-none text-base"
      />
    </div>
  );
}

function SparkleLayer({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const emojis = ["✨", "🌸", "💫", "🩵", "💎"];
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: trigger * 10 + i,
      x: 40 + (i % 3) * 10,
      y: 30 + Math.floor(i / 3) * 20,
      emoji: emojis[i % emojis.length],
    }));
    setParticles((p) => [...p, ...newParticles]);
    const ids = newParticles.map((np) => np.id);
    const t = setTimeout(() => {
      setParticles((p) => p.filter((x) => !ids.includes(x.id)));
    }, 1200);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-2xl sparkle-rise"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.emoji}
        </span>
      ))}
      <style jsx>{`
        @keyframes rise {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-100px) scale(1.3); opacity: 0; }
        }
        .sparkle-rise {
          animation: rise 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
