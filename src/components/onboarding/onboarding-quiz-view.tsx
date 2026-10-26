"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Laptop, Loader2, Lock, Monitor, MoreHorizontal } from "lucide-react";
import {
  AndroidLogo,
  AppleLogo,
  BumbleLogo,
  FindMyLogo,
  InstagramLogo,
  SnapLogo,
  TinderLogo,
} from "@/components/onboarding/brand-logos";
import { OnboardingAhaMoment } from "@/components/onboarding/onboarding-aha-moment";
import { StepDestination } from "@/components/onboarding/onboarding-two-step-view";
import { Logo } from "@/components/ui/logo";
import { track } from "@/lib/analytics/track";
import {
  ONBOARDING_DESTINATION_KEY,
  TRENDING_DESTINATIONS,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";
import {
  getAskedQuestions,
  getMainQuizApp,
  getQuizFinalSteps,
  getQuizRecommendation,
  listQuizApps,
  storeQuizResult,
  type QuizAnswers,
  type QuizIcon,
  type QuizQuestion,
} from "@/lib/onboarding-quiz";
import { readPricingVariantCookie } from "@/lib/pricing-experiment";
import { cn } from "@/lib/utils";
import type { VisitorLocation } from "@/lib/visitor-location";

/** Neutral tile, same size as the brand tiles, for "Autre", Mac and PC. */
function GlyphTile({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-[28%] bg-zinc-100 text-zinc-600">
      {children}
    </span>
  );
}

const ICONS: Record<QuizIcon, ReactNode> = {
  snap: <SnapLogo />,
  instagram: <InstagramLogo />,
  tinder: <TinderLogo />,
  bumble: <BumbleLogo />,
  findmy: <FindMyLogo />,
  apple: <AppleLogo />,
  android: <AndroidLogo />,
  mac: (
    <GlyphTile>
      <Laptop className="h-5 w-5" />
    </GlyphTile>
  ),
  pc: (
    <GlyphTile>
      <Monitor className="h-5 w-5" />
    </GlyphTile>
  ),
  other: (
    <GlyphTile>
      <MoreHorizontal className="h-5 w-5" />
    </GlyphTile>
  ),
};

// Long enough for the position to feel prepared, not so long it feels stuck.
const FINAL_STEP_MS = 3800;

type Screen =
  | { name: "destination" }
  | { name: "intro" }
  | { name: "question"; index: number }
  | { name: "finalizing" }
  | { name: "ready" };

/** Creeps on its own (so it never looks stuck), and each answer lets it go further. */
function usePrepPercent(active: boolean, answered: number, total: number) {
  const [percent, setPercent] = useState(3);
  const ceiling = Math.round(22 + (answered / total) * 48);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setPercent((current) => (current < ceiling ? current + 1 : current));
    }, 700);
    return () => window.clearInterval(timer);
  }, [active, ceiling]);

  return percent;
}

function PrepPill({ percent }: { percent: number }) {
  return (
    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-500" />
      Préparation de ta loc · <span className="tabular-nums">{percent} %</span>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-14 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-base font-semibold text-white shadow-lg shadow-pink-500/25 transition-opacity disabled:opacity-40",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Dark mini-map with a glowing dot and radar rings, flying to the city. */
function PrepVisual({ city }: { city: string }) {
  return (
    <div className="relative mx-auto mb-8 h-44 w-full max-w-xs overflow-hidden rounded-[28px] bg-[#0B0B10] shadow-xl shadow-violet-500/20">
      <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
        <defs>
          <pattern id="prep-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="#3f3f46" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#prep-grid)" />
        <path d="M-10 120 C 60 80, 120 150, 200 90 S 320 60, 360 110" fill="none" stroke="#52525b" strokeWidth="6" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((ring) => (
          <motion.span
            key={ring}
            className="absolute h-10 w-10 rounded-full border-2 border-pink-400"
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: ring * 0.8, ease: "easeOut" }}
          />
        ))}
        <span className="relative h-5 w-5 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 ring-4 ring-white/90" />
      </div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
        {city}
      </span>
    </div>
  );
}

function IntroScreen({ city, onStart }: { city: string; onStart: () => void }) {
  return (
    <div className="mx-auto w-full max-w-md text-center">
      <PrepVisual city={city} />
      <p className="text-xs font-bold uppercase tracking-widest text-pink-600">Préparation en cours</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        On prépare ta loc à <span className="gradient-text">{city}</span>
      </h1>
      <p className="mt-3 text-zinc-500">Pendant ce temps, réponds à quelques questions pour qu&apos;elle soit parfaite.</p>
      <div className="mt-8">
        <PrimaryButton onClick={onStart}>C&apos;est parti</PrimaryButton>
      </div>
    </div>
  );
}

function gridFor(count: number) {
  if (count === 6) return "grid-cols-2 sm:grid-cols-3";
  if (count === 3) return "grid-cols-3";
  return "grid-cols-2";
}

function QuestionScreen({
  question,
  city,
  selected,
  onToggle,
  onContinue,
}: {
  question: QuizQuestion;
  city: string;
  selected: string[];
  onToggle: (optionId: string) => void;
  onContinue: () => void;
}) {
  const note = !question.multi
    ? question.options.find((option) => option.id === selected[0])?.note
    : undefined;
  const withIcons = question.options.some((option) => option.icon);

  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-pink-600">{question.kicker}</p>
      <h1 className="mt-2 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        {question.title(city)}
      </h1>
      {question.multi && <p className="mt-2 text-center text-sm text-zinc-500">Plusieurs choix possibles</p>}
      <div className={cn("mt-8 grid gap-3", gridFor(question.options.length))}>
        {question.options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border bg-white px-3 text-center text-sm font-semibold text-zinc-900 shadow-sm transition-all",
                withIcons ? "py-5" : "min-h-[76px] py-4",
                active ? "border-pink-400 ring-2 ring-pink-200" : "border-zinc-200 hover:border-pink-200"
              )}
            >
              {active && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
              {option.icon ? ICONS[option.icon] : null}
              <span>{option.label}</span>
              {option.soon && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-600">
                  Bientôt
                </span>
              )}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {note && (
          <motion.p
            key={note}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-sm text-zinc-700"
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="mt-6">
        <PrimaryButton onClick={onContinue} disabled={selected.length === 0}>
          Continuer
        </PrimaryButton>
      </div>
    </div>
  );
}

function FinalizingScreen({
  steps,
  startPercent,
  onDone,
}: {
  steps: string[];
  startPercent: number;
  onDone: () => void;
}) {
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    if (doneCount >= steps.length) {
      const timer = window.setTimeout(onDone, 900);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setDoneCount((count) => count + 1), FINAL_STEP_MS);
    return () => window.clearTimeout(timer);
    // Only the step count drives the timers, not a new callback identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount]);

  // Picks up where the questions left the pill, and ends at 100 %.
  const percent = Math.round(startPercent + ((100 - startPercent) * doneCount) / steps.length);

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <div className="relative mx-auto mb-6 h-32 w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#f4f4f5" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="url(#prep-gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={276}
            initial={{ strokeDashoffset: 276 - (276 * startPercent) / 100 }}
            animate={{ strokeDashoffset: 276 - (276 * percent) / 100 }}
            transition={{ duration: FINAL_STEP_MS / 1000, ease: "linear" }}
          />
          <defs>
            <linearGradient id="prep-gradient">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums text-zinc-900">
          {percent} %
        </span>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-pink-600">Presque fini</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">On finalise ta loc</h1>
      <ul className="mt-6 space-y-2 text-left">
        {steps.map((step, index) => {
          const state = index < doneCount ? "done" : index === doneCount ? "active" : "todo";
          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
                state === "todo" ? "border-zinc-100 text-zinc-400" : "border-zinc-200 bg-white text-zinc-900"
              )}
            >
              {state === "done" ? (
                <Check className="h-4 w-4 text-pink-600" />
              ) : state === "active" ? (
                <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-zinc-300" />
              )}
              {step}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReadyScreen({
  destination,
  visitorLocation,
  answers,
  leaving,
  onUnlock,
}: {
  destination: OnboardingDestination;
  visitorLocation: VisitorLocation | null;
  answers: QuizAnswers;
  leaving: boolean;
  onUnlock: () => void;
}) {
  const [teleported, setTeleported] = useState(false);

  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-pink-600">C&apos;est prêt</p>
      <h1 className="mt-2 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        Ta loc à <span className="gradient-text">{destination.city}</span> est prête.
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-500">
        Visible sur {listQuizApps(answers)} dès que tu l&apos;actives.
      </p>
      <div className="relative mt-6">
        {/* Once it has landed, the whole phone blurs behind the unlock button. */}
        <motion.div
          animate={teleported ? { filter: "blur(6px)", opacity: 0.9 } : { filter: "blur(0px)", opacity: 1 }}
          transition={{ duration: 0.8, delay: teleported ? 0.8 : 0 }}
          className={cn(teleported && "pointer-events-none")}
        >
          <OnboardingAhaMoment
            destination={destination}
            origin={visitorLocation}
            onDestinationChange={() => {}}
            onTeleportStart={() =>
              track("onboarding_teleport_clicked", { destination_city: destination.city, onboarding_variant: "quiz" })
            }
            onDone={() => setTeleported(true)}
          />
        </motion.div>
        <AnimatePresence>
          {teleported && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 20 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center"
            >
              <p className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                Ta position t&apos;attend à {destination.city}
              </p>
              <PrimaryButton onClick={onUnlock} disabled={leaving} className="max-w-[280px]">
                <span className="inline-flex items-center gap-2">
                  {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Débloquer ma loc
                </span>
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * The quiz onboarding (B side of lib/onboarding-experiment), after signup:
 * destination, questions while the position "gets ready", a checklist built
 * from the answers, the teleport, then the checkout with the recommended plan.
 */
export function OnboardingQuizView({
  visitorLocation,
  checkoutPreview = false,
}: {
  visitorLocation: VisitorLocation | null;
  /** Local preview without an account: the checkout opens in its dev preview mode. */
  checkoutPreview?: boolean;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>({ name: "destination" });
  const [destination, setDestination] = useState<OnboardingDestination>(TRENDING_DESTINATIONS[1]);
  const [query, setQuery] = useState("");
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [leaving, setLeaving] = useState(false);

  const askedQuestions = useMemo(() => getAskedQuestions(answers), [answers]);
  const answeredCount =
    screen.name === "question" ? screen.index : screen.name === "destination" || screen.name === "intro" ? 0 : askedQuestions.length;
  const showPrep = screen.name === "intro" || screen.name === "question";
  const prepPercent = usePrepPercent(showPrep, answeredCount, askedQuestions.length);
  const stepName = screen.name === "question" ? askedQuestions[screen.index]?.id : screen.name;

  useEffect(() => {
    window.scrollTo({ top: 0 });
    track("onboarding_quiz_step_viewed", { step_name: stepName });
  }, [stepName]);

  function selectDestination(next: OnboardingDestination) {
    setDestination(next);
    setQuery("");
    try {
      window.sessionStorage.setItem(ONBOARDING_DESTINATION_KEY, JSON.stringify(next));
    } catch {}
    track("onboarding_quiz_destination_selected", { destination_city: next.city });
    setScreen({ name: "intro" });
  }

  function toggle(question: QuizQuestion, optionId: string) {
    setAnswers((current) => {
      const previous = current[question.id] ?? [];
      const value = question.multi
        ? previous.includes(optionId)
          ? previous.filter((id) => id !== optionId)
          : [...previous, optionId]
        : [optionId];
      return { ...current, [question.id]: value };
    });
  }

  function nextQuestion(index: number) {
    const question = askedQuestions[index];
    track("onboarding_quiz_answered", { question: question.id, answer: (answers[question.id] ?? []).join(",") });
    const next = index + 1;
    setScreen(next < askedQuestions.length ? { name: "question", index: next } : { name: "finalizing" });
  }

  function back() {
    if (screen.name === "question") {
      setScreen(screen.index === 0 ? { name: "intro" } : { name: "question", index: screen.index - 1 });
    } else if (screen.name === "intro") {
      setScreen({ name: "destination" });
    }
  }

  function unlock() {
    if (leaving) return;
    setLeaving(true);
    // The plan of the visitor's own price grid (see lib/pricing-experiment).
    const grid = readPricingVariantCookie() === "grid_v2" ? "v2" : "v1";
    const recommendation = getQuizRecommendation(answers, grid);
    storeQuizResult({
      recommendedPlanId: recommendation.planId,
      reason: recommendation.reason,
      mainApp: getMainQuizApp(answers),
    });
    try {
      window.sessionStorage.setItem(ONBOARDING_DESTINATION_KEY, JSON.stringify(destination));
    } catch {}
    track("onboarding_quiz_completed", {
      destination_city: destination.city,
      recommended_plan: recommendation.planId,
      apps: (answers.apps ?? []).join(","),
      device: answers.device?.[0],
      computer: answers.computer?.[0],
      movement: answers.movement?.[0],
      worry: answers.worry?.[0],
      audience: answers.audience?.[0],
    });
    const preview = checkoutPreview ? "&preview=1" : "";
    router.push(`/checkout?plan=${recommendation.planId}&parcours=quiz${preview}`);
  }

  const canGoBack = screen.name === "intro" || screen.name === "question";
  const stepKey = screen.name === "question" ? `question-${screen.index}` : screen.name;

  return (
    <div className="relative min-h-screen bg-background">
      <header className="sticky top-0 z-20 px-2 pt-2 sm:px-4 sm:pt-3">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-full border border-zinc-200/80 bg-white/85 pl-3 pr-4 shadow-lg shadow-zinc-900/5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button
                type="button"
                onClick={back}
                aria-label="Retour"
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Logo href={null} />
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 sm:py-12">
        {showPrep && (
          <div className="mb-8">
            <PrepPill percent={prepPercent} />
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stepKey}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            {screen.name === "destination" && (
              <StepDestination query={query} onQueryChange={setQuery} onSelect={selectDestination} />
            )}
            {screen.name === "intro" && (
              <IntroScreen city={destination.city} onStart={() => setScreen({ name: "question", index: 0 })} />
            )}
            {screen.name === "question" && askedQuestions[screen.index] && (
              <QuestionScreen
                question={askedQuestions[screen.index]}
                city={destination.city}
                selected={answers[askedQuestions[screen.index].id] ?? []}
                onToggle={(optionId) => toggle(askedQuestions[screen.index], optionId)}
                onContinue={() => nextQuestion(screen.index)}
              />
            )}
            {screen.name === "finalizing" && (
              <FinalizingScreen
                steps={getQuizFinalSteps(answers, destination)}
                startPercent={prepPercent}
                onDone={() => setScreen({ name: "ready" })}
              />
            )}
            {screen.name === "ready" && (
              <ReadyScreen
                destination={destination}
                visitorLocation={visitorLocation}
                answers={answers}
                leaving={leaving}
                onUnlock={unlock}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
