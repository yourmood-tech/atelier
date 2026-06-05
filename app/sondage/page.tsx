"use client";

import { useState, useMemo } from "react";
import { QUESTIONS, BLOCS, type Question } from "./questions";

type Answers = Record<string, string | string[] | number | { prenom: string; email: string }>;

type Status = "intro" | "questions" | "submitting" | "done" | "error";

export default function SondagePage() {
  const [status, setStatus] = useState<Status>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [bonCode, setBonCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Questions filtrées selon les conditions showIf
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
  }

  function canContinue(): boolean {
    if (!current) return false;
    if (current.optional) return true;
    const v = answers[current.id];
    if (current.type === "single") return typeof v === "string" && v.length > 0;
    if (current.type === "multi") return Array.isArray(v) && v.length > 0;
    if (current.type === "text" || current.type === "longtext") return typeof v === "string" && v.trim().length > 0;
    if (current.type === "slider") return typeof v === "number";
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
            <span className="text-xs">~10 minutes en mood détente 🌸</span>
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

  // ===== SUBMITTING =====
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

  if (!current) {
    return null;
  }

  // ===== QUESTIONS =====
  return (
    <main className="min-h-screen bg-[#FDF8F3] text-[#1A1A1A]">
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

      {/* Question */}
      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12">
        <QuestionView
          key={current.id}
          question={current}
          value={answers[current.id]}
          onChange={(v) => setAnswer(current.id, v)}
        />

        {/* Navigation */}
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

  // Initialise au milieu si pas de valeur (au premier render uniquement)
  if (value === undefined) {
    setTimeout(() => onChange(currentValue), 0);
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E8DFD3] p-6 sm:p-8">
      <div className="text-center mb-6">
        <div className="font-serif text-5xl sm:text-6xl text-[#C9A878] mb-1">
          {currentValue}
          {unit && <span className="text-2xl sm:text-3xl text-[#1A1A1A] ml-2">{unit}</span>}
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-[#E8DFD3] rounded-full appearance-none cursor-pointer slider-mood"
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
      </div>

      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-3 text-xs text-[#7A7A7A]">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
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
