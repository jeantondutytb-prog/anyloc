"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Copy, Mail, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import { WindowsOpenHelp } from "@/components/dashboard/windows-open-help";
import type { DesktopOs } from "@/lib/platform";
import { cn } from "@/lib/utils";

function CopyPageLink({ href, label }: { href: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const mailHref = `mailto:?subject=${encodeURIComponent("Anyloc — ouvre ça sur l'ordinateur")}&body=${encodeURIComponent(`Ouvre ce lien sur ton Mac ou PC :\n${href}`)}`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button type="button" size="sm" onClick={() => void copy()}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Lien copié" : label}
      </Button>
      <a href={mailHref} className="sm:w-auto">
        <Button type="button" size="sm" variant="secondary" className="w-full">
          <Mail className="h-4 w-4" />
          Se l&apos;envoyer par mail
        </Button>
      </a>
    </div>
  );
}

export function WrongDeviceNotice({
  title,
  children,
  href,
  copyLabel,
  qrLabel,
}: {
  title: string;
  children: ReactNode;
  href: string;
  copyLabel: string;
  qrLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-semibold">{title}</p>
      <div className="mt-2 space-y-2 text-amber-900/90">{children}</div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <CopyPageLink href={href} label={copyLabel} />
        {qrLabel ? (
          <SetupQrCode value={href} label={qrLabel} />
        ) : null}
      </div>
    </div>
  );
}

function MacGatekeeperFix() {
  return (
    <details className="group mt-3 rounded-xl border border-amber-200 bg-amber-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-amber-900 [&::-webkit-details-marker]:hidden">
        <span>macOS bloque l&apos;app ?</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-amber-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-amber-200 px-4 py-3 text-sm text-amber-900/90">
        <p>
          C&apos;est normal — macOS bloque les apps hors App Store. Voilà
          comment débloquer :
        </p>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>
            Clique <strong>Terminé</strong> sur le message d&apos;erreur
          </li>
          <li>
            Ouvre{" "}
            <strong>
              Réglages Système → Confidentialité et sécurité
            </strong>
          </li>
          <li>
            Scrolle en bas — tu verras « Anyloc a été bloqué ».
            Clique{" "}
            <strong>Ouvrir quand même</strong>
          </li>
          <li>
            Confirme avec ton mot de passe Mac → <strong>Ouvrir</strong>
          </li>
        </ol>
        <p className="mt-3 text-xs text-amber-800/70">
          Tu ne fais ça qu&apos;une seule fois. Après, Anyloc s&apos;ouvre
          normalement.
        </p>
      </div>
    </details>
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
        "rounded-xl border px-4 py-4",
        downloaded
          ? "border-emerald-200 bg-emerald-50"
          : desktopOs === "win"
            ? "border-amber-200 bg-amber-50"
            : "border-zinc-200 bg-zinc-50"
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
        <>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            <li>
              Ouvre <strong>Téléchargements</strong> (icône en bas, ou Finder)
            </li>
            <li>
              Double-clique <strong>Anyloc.dmg</strong> — une fenêtre
              s&apos;ouvre avec l&apos;icône Anyloc
            </li>
            <li>
              Glisse <strong>Anyloc</strong> sur le dossier{" "}
              <strong>Applications</strong>
            </li>
            <li>
              Va dans Applications → <strong>clic droit</strong> sur Anyloc →{" "}
              <strong>Ouvrir</strong> → confirme <strong>Ouvrir</strong>
            </li>
          </ol>
          <MacGatekeeperFix />
        </>
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
        "rounded-xl border px-4 py-4",
        downloaded
          ? "border-emerald-200 bg-emerald-50"
          : "border-zinc-200 bg-zinc-50"
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
