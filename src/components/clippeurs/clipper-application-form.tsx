"use client";

import { startTransition, useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import {
  submitClipperApplication,
  type ClipperApplicationState,
} from "@/app/clippeurs/actions";
import { Button } from "@/components/ui/button";
import {
  CLIPPER_VIDEOS_PER_DAY,
  normalizeInstagramHandle,
  normalizePhone,
} from "@/lib/clipper-application";
import { cn } from "@/lib/utils";

const initialState: ClipperApplicationState = {};
const STEP_COUNT = 4;

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
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");

  if (state.submitted) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          C&apos;est noté{firstName ? `, ${firstName}` : ""} !
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          {phone.trim() ? (
            "On regarde ton profil et on t’écrit sur WhatsApp très vite."
          ) : (
            <>
              On regarde ton profil et on t&apos;écrit sur Insta très vite, depuis le
              compte{" "}
              <a
                href="https://www.instagram.com/jean.tdt/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-pink-600 hover:underline"
              >
                @jean.tdt
              </a>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  function submit() {
    const formData = new FormData();
    formData.set("videosPerDay", videosPerDay);
    formData.set("firstName", firstName);
    formData.set("instagram", instagram);
    formData.set("phone", phone);
    formData.set("website", honeypot);
    if (utmCampaign) formData.set("utmCampaign", utmCampaign);
    startTransition(() => formAction(formData));
  }

  const instagramIsValid = normalizeInstagramHandle(instagram) !== null;
  // Facultatif : on peut envoyer sans numéro.
  const phoneIsValid = !phone.trim() || normalizePhone(phone) !== null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (step === 1 && firstName.trim()) {
          setStep(2);
        } else if (step === 2 && instagramIsValid) {
          setStep(3);
        } else if (step === 3 && phoneIsValid) {
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
          <label htmlFor="instagram" className="text-xl font-semibold text-zinc-900">
            Ton Insta, pour qu&apos;on te recontacte
          </label>
          <div className="relative mt-5">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-zinc-400">
              @
            </span>
            <input
              id="instagram"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              placeholder="tonpseudo"
              className={cn(inputClassName, "pl-9")}
            />
          </div>

          <Button type="submit" size="lg" className="mt-4 w-full" disabled={!instagramIsValid}>
            Continuer
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6">
          <label htmlFor="phone" className="text-xl font-semibold text-zinc-900">
            Ton numéro, pour qu&apos;on te réponde plus vite
          </label>
          <p className="mt-1.5 text-sm text-zinc-500">
            On t&apos;écrit sur WhatsApp ou par SMS. Facultatif.
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
            className={cn(inputClassName, "mt-5")}
          />

          {state.error ? (
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
              "Je veux devenir clippeur"
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
