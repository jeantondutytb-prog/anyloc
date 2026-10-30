"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Copy, Loader2, Mail, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import { WindowsOpenHelp } from "@/components/dashboard/windows-open-help";
import { track } from "@/lib/analytics/track";
import type { DesktopOs } from "@/lib/platform";
import { cn } from "@/lib/utils";

type EmailState =
  | { status: "idle" | "sending" }
  | { status: "sent"; email: string | null }
  | { status: "error"; message: string };

function CopyPageLink({
  href,
  label,
  preview = false,
  emailLink = true,
}: {
  href: string;
  label: string;
  preview?: boolean;
  /** The email says "open it on your computer": only for the desktop app. */
  emailLink?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [emailState, setEmailState] = useState<EmailState>({ status: "idle" });

  const copy = async () => {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const sendEmail = async () => {
    track("desktop_link_email_clicked", { source: "dashboard" });

    if (preview) {
      setEmailState({ status: "sent", email: null });
      return;
    }

    setEmailState({ status: "sending" });

    try {
      const res = await fetch("/api/account/desktop-link-email", { method: "POST" });
      const body = (await res.json().catch(() => null)) as
        | { email?: string; error?: string }
        | null;

      if (!res.ok) {
        setEmailState({
          status: "error",
          message: body?.error ?? "L'email n'a pas pu partir. Copie le lien à la place.",
        });
        return;
      }

      setEmailState({ status: "sent", email: body?.email ?? null });
    } catch {
      setEmailState({
        status: "error",
        message: "Pas de connexion. Réessaie ou copie le lien.",
      });
    }
  };

  const sending = emailState.status === "sending";
  const sent = emailState.status === "sent";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        {emailLink ? (
          <Button type="button" size="sm" onClick={() => void sendEmail()} disabled={sending || sent}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : sent ? (
              <Check className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {sent ? "Lien envoyé" : "M'envoyer le lien par email"}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant={emailLink ? "secondary" : "default"} onClick={() => void copy()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Lien copié" : label}
        </Button>
      </div>
      {sent ? (
        <p className="text-xs text-zinc-600">
          C&apos;est parti{emailState.email ? <> à <strong>{emailState.email}</strong></> : null}. Ouvre ce mail sur ton ordi (pense à regarder les spams).
        </p>
      ) : null}
      {emailState.status === "error" ? (
        <p className="text-xs text-red-600">{emailState.message}</p>
      ) : null}
    </div>
  );
}

export function WrongDeviceNotice({
  title,
  children,
  href,
  copyLabel,
  qrLabel,
  preview,
  emailLink,
}: {
  title: string;
  children: ReactNode;
  href: string;
  copyLabel: string;
  qrLabel?: string;
  preview?: boolean;
  emailLink?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-4 text-sm text-zinc-900">
      <p className="font-semibold">{title}</p>
      <div className="mt-2 space-y-2 text-zinc-600">{children}</div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <CopyPageLink href={href} label={copyLabel} preview={preview} emailLink={emailLink} />
        {qrLabel ? (
          <SetupQrCode value={href} label={qrLabel} />
        ) : null}
      </div>
    </div>
  );
}

function MacGatekeeperFix() {
  return (
    <details className="group mt-3 rounded-2xl border border-zinc-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
        <span>Ton Mac refuse d&apos;ouvrir Anyloc ?</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-700">
        <p>C&apos;est normal, ça se règle en 1 minute :</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>
            Clique <strong>Terminé</strong> sur le message
          </li>
          <li>
            Clique sur la pomme en haut à gauche →{" "}
            <strong>Réglages Système</strong>
          </li>
          <li>
            À gauche, clique <strong>Confidentialité et sécurité</strong>
          </li>
          <li>
            Descends tout en bas → <strong>Ouvrir quand même</strong>
          </li>
          <li>Tape le mot de passe de ton Mac</li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          Tu ne le fais qu&apos;une fois.
        </p>
      </div>
    </details>
  );
}

export function MacOpenHelp() {
  return (
    <>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        <li>
          Ouvre le fichier que tu viens de télécharger (en haut ou en bas de
          ton navigateur)
        </li>
        <li>
          Une fenêtre s&apos;ouvre : glisse l&apos;icône{" "}
          <strong>Anyloc</strong> sur le dossier <strong>Applications</strong>
        </li>
        <li>
          Ouvre <strong>Anyloc</strong> dans tes Applications
        </li>
      </ol>
      <MacGatekeeperFix />
    </>
  );
}

export function SetupOpenHelp({
  desktopOs,
  onDesktopOsChange,
  downloaded,
  zipDownloadPath,
}: {
  desktopOs: DesktopOs;
  onDesktopOsChange: (os: DesktopOs) => void;
  downloaded: boolean;
  zipDownloadPath?: string | null;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        downloaded ? "border-pink-200 bg-pink-50" : "border-zinc-200 bg-zinc-50"
      )}
    >
      <p className="font-semibold text-zinc-900">
        {desktopOs === "win"
          ? downloaded
            ? "C'est téléchargé — Windows dit « Faites attention » ? Suis ça"
            : "Windows va dire « Faites attention » — c'est normal"
          : downloaded
            ? "C'est dans Téléchargements — ouvre-le comme ça"
            : "Après le téléchargement, ouvre le fichier comme ça"}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {desktopOs === "win"
          ? "Ce n'est pas un virus. Chrome et Windows le disent pour les apps hors Microsoft Store."
          : "Le fichier ne s'ouvre pas tout seul. C'est normal."}
      </p>

      <div className="mt-3 inline-flex rounded-full border border-zinc-200 bg-white p-1">
        {(["mac", "win"] as const).map((os) => (
          <button
            key={os}
            type="button"
            onClick={() => onDesktopOsChange(os)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              desktopOs === os
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            {os === "mac" ? "Mac" : "Windows"}
          </button>
        ))}
      </div>

      {desktopOs === "mac" ? (
        <MacOpenHelp />
      ) : (
        <div className="mt-3">
          <WindowsOpenHelp
            downloaded={downloaded}
            zipDownloadPath={zipDownloadPath}
            embedded
          />
        </div>
      )}
    </div>
  );
}

export function AndroidOpenHelp({ downloaded }: { downloaded: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        downloaded ? "border-pink-200 bg-pink-50" : "border-zinc-200 bg-zinc-50"
      )}
    >
      <p className="font-semibold text-zinc-900">
        {downloaded
          ? "Le fichier est téléchargé — installe-le comme ça"
          : "Le fichier ne s'ouvre pas tout seul. Fais ça :"}
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        <li>
          Ouvre <strong>Téléchargements</strong> (ou l&apos;app Fichiers)
        </li>
        <li>
          Appuie sur <strong>Anyloc.apk</strong>
        </li>
        <li>
          Si Android bloque : autorise ton navigateur à{" "}
          <strong>installer des apps inconnues</strong>, puis reviens sur le
          fichier
        </li>
        <li>
          Appuie sur <strong>Installer</strong>
        </li>
      </ol>
    </div>
  );
}

export function ComputerOnlyHint() {
  return (
    <p className="flex items-start gap-2 text-xs text-zinc-500">
      <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Ce fichier ne s&apos;ouvre pas sur iPhone. Il faut un Mac ou un PC.
    </p>
  );
}
