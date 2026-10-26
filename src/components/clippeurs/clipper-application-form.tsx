"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import {
  submitClipperApplication,
  type ClipperApplicationState,
} from "@/app/clippeurs/actions";
import { Button } from "@/components/ui/button";
import {
  CLIPPER_PHONE_ERROR,
  CLIPPER_VIDEOS_PER_DAY,
  clipperWhatsAppUrl,
  normalizePhone,
} from "@/lib/clipper-application";
import { cn } from "@/lib/utils";

const initialState: ClipperApplicationState = {};
const STEP_COUNT = 3;

const inputClassName =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20";

export function ClipperApplicationForm({
  utmCampaign,
}: {
  utmCampaign?: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitClipperApplication,
    initialState
  );
  const [step, setStep] = useState(0);
  const [videosPerDay, setVideosPerDay] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const whatsAppUrl = clipperWhatsAppUrl({ firstName, videosPerDay });

  // Candidature enregistrée : on ouvre WhatsApp avec le message déjà écrit,
  // pour que le clippeur ait une conversation avec nous et se souvienne de qui on est.
  useEffect(() => {
    if (state.submitted) window.location.href = whatsAppUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.submitted]);

  if (state.submitted) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          C&apos;est noté{firstName ? `, ${firstName}` : ""} !
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Dernière étape : envoie-nous le message sur WhatsApp, c&apos;est là qu&apos;on
          te répond.
        </p>
        <a
          href={whatsAppUrl}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-base font-semibold text-white transition hover:bg-[#1ebe5a]"
        >
          <MessageCircle className="h-5 w-5" />
          Envoyer sur WhatsApp
        </a>
      </div>
    );
  }

  function submit() {
    const formData = new FormData();
    formData.set("videosPerDay", videosPerDay);
    formData.set("firstName", firstName);
    formData.set("phone", phone);
    formData.set("website", honeypot);
    if (utmCampaign) formData.set("utmCampaign", utmCampaign);
    startTransition(() => formAction(formData));
  }

  const phoneIsValid = normalizePhone(phone) !== null;
  // Only once they've typed a full number (or left the field), not on the first digit.
  const phoneDigits = phone.replace(/\D/g, "").length;
  const showPhoneError = !phoneIsValid && (phoneTouched || phoneDigits >= 10);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (step === 1 && firstName.trim()) {
          setStep(2);
        } else if (step === 2 && phoneIsValid) {
          submit();
        }
      }}
    >
      <div className="flex items-center gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="-ml-1 rounded-lg p-1 text-zinc-500 transition hover:text-zinc-900"
            aria-label="Question précédente"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-pink-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {step + 1}/{STEP_COUNT}
        </span>
      </div>

      {step === 0 ? (
        <fieldset className="mt-6">
          <legend className="text-xl font-semibold text-zinc-900">
            Combien de vidéos tu peux poster par jour ?
          </legend>
          <div className="mt-5 grid gap-3">
            {CLIPPER_VIDEOS_PER_DAY.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setVideosPerDay(option.value);
                  setStep(1);
                }}
                className={cn(
                  "flex h-14 items-center justify-between rounded-xl border px-5 text-left text-base font-medium transition-colors",
                  videosPerDay === option.value
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-pink-300"
                )}
              >
                {option.label}
                <ArrowRight className="h-4 w-4 text-zinc-400" />
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <div className="mt-6">
          <label htmlFor="firstName" className="text-xl font-semibold text-zinc-900">
            C&apos;est quoi ton prénom ?
          </label>
          <input
            id="firstName"
            autoFocus
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Ton prénom"
            className={cn(inputClassName, "mt-5")}
          />
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={!firstName.trim()}>
            Continuer
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6">
          <label htmlFor="phone" className="text-xl font-semibold text-zinc-900">
            Ton numéro, pour qu&apos;on te recontacte
          </label>
          <p className="mt-1.5 text-sm text-zinc-500">
            On te répond sur WhatsApp.
          </p>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoFocus
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="06 12 34 56 78"
            aria-invalid={showPhoneError}
            aria-describedby={showPhoneError ? "phone-error" : undefined}
            onBlur={() => setPhoneTouched(true)}
            className={cn(
              inputClassName,
              "mt-5",
              showPhoneError && "border-red-300 focus:border-red-400 focus:ring-red-200"
            )}
          />
          {showPhoneError ? (
            <p id="phone-error" className="mt-2 text-sm text-red-600">
              {CLIPPER_PHONE_ERROR}
            </p>
          ) : null}

          {state.error && !showPhoneError ? (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full"
            disabled={!phoneIsValid || pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi…
              </>
            ) : (
              "Envoyer ma candidature"
            )}
          </Button>
        </div>
      ) : null}

      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
    </form>
  );
}
