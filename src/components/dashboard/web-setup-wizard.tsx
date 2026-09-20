"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Check,
  Copy,
  Globe,
  Home,
  Loader2,
  MapPin,
  Share,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { capturePostHogClientEvent } from "@/lib/posthog/browser";
import { detectClientDevice, detectUserPlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { buildWebSpoofBookmarklet } from "@/lib/web-spoof-bookmarklet";
import {
  readWebSpoofToken,
  WEB_APP_LINKS,
  WEB_SETUP_STEP_ITEMS,
  writeWebSpoofToken,
  type WebSetupStepId,
} from "@/lib/web-setup";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function Instruction({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed text-zinc-600">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
        {number}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function StepPhone({
  phoneUrl,
  isPhone,
  onContinue,
}: {
  phoneUrl: string;
  isPhone: boolean;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(phoneUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        {isPhone ? "Parfait, tu es sur ton tel" : "Ouvre Anyloc sur ton téléphone"}
      </h2>
      <p className="mt-3 text-sm text-zinc-600 sm:text-base">
        {isPhone
          ? "iPhone ou Android, c’est le même chemin. On active le GPS depuis le navigateur — plus besoin d’app ni d’ordinateur."
          : "Le service se pilote depuis le navigateur de ton téléphone. Scanne le QR (ou copie le lien), puis continue là-bas."}
      </p>

      {isPhone ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          Ton téléphone est prêt. On enchaîne sur les 3 étapes suivantes.
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5">
          <SetupQrCode value={phoneUrl} label="Ouvre ce lien dans Safari ou Chrome" />
          <button
            type="button"
            onClick={() => void copyLink()}
            className="text-sm font-medium text-pink-600 underline-offset-4 hover:underline"
          >
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
      )}

      {isPhone ? (
        <Button className="mt-8 h-12 w-full" onClick={onContinue}>
          C’est bon, je suis sur mon tel
          <Smartphone className="h-4 w-4" />
        </Button>
      ) : (
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full text-center text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          Continuer sur cet écran (ordinateur)
        </button>
      )}
    </div>
  );
}

function StepHomescreen({
  platform,
  onContinue,
}: {
  platform: "ios" | "android" | "unknown";
  onContinue: () => void;
}) {
  const standalone = useSyncExternalStore(
    () => () => {},
    isStandaloneDisplay,
    () => false
  );
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    function handlePrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function installApp() {
    if (!installEvent) {
      return;
    }

    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        onContinue();
      }
    } finally {
      setInstalling(false);
    }
  }

  const isIos = platform !== "android";

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        Ajoute Anyloc à l’écran d’accueil
      </h2>
      <p className="mt-3 text-sm text-zinc-600 sm:text-base">
        Ça prend 10 secondes. Anyloc devient une icône, comme une app — sans App
        Store, sans fichier APK.
      </p>

      {standalone ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          Anyloc est déjà sur ton écran d’accueil. Tu peux valider.
        </div>
      ) : (
        <ol className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
          {isIos ? (
            <>
              <Instruction number={1}>
                Appuie sur <Share className="mx-0.5 inline h-3.5 w-3.5" />{" "}
                <strong>Partager</strong> (carré avec flèche, en bas de Safari).
              </Instruction>
              <Instruction number={2}>
                Descends et choisis <strong>Sur l’écran d’accueil</strong>.
              </Instruction>
              <Instruction number={3}>
                Appuie sur <strong>Ajouter</strong>. L’icône Anyloc apparaît
                parmi tes apps.
              </Instruction>
            </>
          ) : (
            <>
              <Instruction number={1}>
                Appuie sur le menu <strong>⋮</strong> en haut à droite de Chrome.
              </Instruction>
              <Instruction number={2}>
                Choisis <strong>Ajouter à l’écran d’accueil</strong> ou{" "}
                <strong>Installer l’application</strong>.
              </Instruction>
              <Instruction number={3}>
                Valide. L’icône Anyloc apparaît parmi tes apps.
              </Instruction>
            </>
          )}
        </ol>
      )}

      {installEvent ? (
        <Button
          className="mt-6 h-12 w-full"
          onClick={() => void installApp()}
          disabled={installing}
        >
          {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
          Installer Anyloc
        </Button>
      ) : null}

      <Button
        className={cn("h-12 w-full", installEvent ? "mt-3" : "mt-8")}
        variant={installEvent ? "secondary" : "default"}
        onClick={onContinue}
      >
        C’est ajouté
      </Button>
    </div>
  );
}

function StepShortcut({
  bookmarklet,
  platform,
  copying,
  copied,
  onCopy,
  onContinue,
}: {
  bookmarklet: string | null;
  platform: "ios" | "android" | "unknown";
  copying: boolean;
  copied: boolean;
  onCopy: () => void;
  onContinue: () => void;
}) {
  const isIos = platform !== "android";

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        Crée le bouton GPS
      </h2>
      <p className="mt-3 text-sm text-zinc-600 sm:text-base">
        C’est LA manipulation qui fait marcher Snap, Insta et Tinder avec le site.
        Un favori dans ton navigateur — pas une app à installer.
      </p>

      <Button
        className="mt-6 h-12 w-full"
        onClick={onCopy}
        disabled={!bookmarklet || copying}
      >
        {copying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? "Raccourci copié" : "Copier le raccourci GPS"}
      </Button>

      <ol className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
        {isIos ? (
          <>
            <Instruction number={1}>
              Appuie sur <strong>Copier le raccourci GPS</strong> juste au-dessus.
            </Instruction>
            <Instruction number={2}>
              Bouton <Share className="mx-0.5 inline h-3.5 w-3.5" /> Partager →{" "}
              <strong>Ajouter aux favoris</strong> → Enregistrer.
            </Instruction>
            <Instruction number={3}>
              Ouvre tes favoris, <strong>Modifier</strong>, choisis le nouveau
              favori.
            </Instruction>
            <Instruction number={4}>
              Nomme-le <strong>Anyloc GPS</strong>. Efface l’adresse,{" "}
              <strong>colle</strong> le raccourci, puis OK.
            </Instruction>
          </>
        ) : (
          <>
            <Instruction number={1}>
              Appuie sur <strong>Copier le raccourci GPS</strong> juste au-dessus.
            </Instruction>
            <Instruction number={2}>
              Appuie sur l’étoile pour créer un favori de cette page.
            </Instruction>
            <Instruction number={3}>
              Ouvre tes favoris → <strong>Modifier</strong> ce favori.
            </Instruction>
            <Instruction number={4}>
              Nomme-le <strong>Anyloc GPS</strong>, colle le raccourci dans le
              champ URL, enregistre.
            </Instruction>
          </>
        )}
      </ol>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        Le favori doit commencer par <code>javascript:</code> — c’est normal, c’est
        le bouton qui injecte ta fausse loc dans Snap / Tinder Web.
      </p>

      <Button className="mt-6 h-12 w-full" onClick={onContinue} disabled={!bookmarklet}>
        Le favori est créé
      </Button>
    </div>
  );
}

function StepApps({ onContinue }: { onContinue: () => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        Ouvre tes apps dans le navigateur
      </h2>
      <p className="mt-3 text-sm text-zinc-600 sm:text-base">
        Pour l’instant, n’utilise plus l’icône Snap / Tinder du téléphone. Ouvre-les
        dans Safari ou Chrome — iPhone et Android, même geste.
      </p>

      <ol className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
        <Instruction number={1}>
          Ouvre Snapchat Web, Tinder Web ou Instagram (boutons ci-dessous).
        </Instruction>
        <Instruction number={2}>
          Tape ton favori <strong>Anyloc GPS</strong> — une pastille rose
          « Anyloc » confirme que c’est actif.
        </Instruction>
        <Instruction number={3}>
          Quand l’app demande ta position, appuie sur <strong>Autoriser</strong>.
        </Instruction>
      </ol>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {WEB_APP_LINKS.map((app) => (
          <a
            key={app.id}
            href={app.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-800 shadow-sm hover:border-pink-300"
          >
            {app.label}
          </a>
        ))}
      </div>

      <Button className="mt-8 h-12 w-full" onClick={onContinue}>
        Tout est bon — choisir ma ville
        <MapPin className="h-4 w-4" />
      </Button>
    </div>
  );
}

type WebSetupWizardProps = {
  open: boolean;
  paymentSuccess?: boolean;
  preview?: boolean;
  location: { name: string; lat: number; lng: number; accuracy: number };
  onComplete: () => void;
  onStepComplete?: (step: WebSetupStepId) => void;
};

export function WebSetupWizard({
  open,
  paymentSuccess = false,
  preview = false,
  location,
  onComplete,
  onStepComplete,
}: WebSetupWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [bookmarklet, setBookmarklet] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const isPhone = useSyncExternalStore(
    () => () => {},
    () => detectClientDevice().isPhone,
    () => false
  );
  const platform = useSyncExternalStore(
    () => () => {},
    () => detectUserPlatform(navigator.userAgent),
    () => "unknown" as const
  );

  const phoneUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "https://anyloc.io/dashboard";
    }

    return `${window.location.origin}/dashboard`;
  }, []);

  const step = WEB_SETUP_STEP_ITEMS[stepIndex] ?? WEB_SETUP_STEP_ITEMS[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    capturePostHogClientEvent("web_setup_step_viewed", {
      step: step.id,
      step_index: stepIndex + 1,
      payment_success: paymentSuccess,
    });
  }, [open, paymentSuccess, step.id, stepIndex]);

  const ensureBookmarklet = useCallback(async () => {
    if (typeof window === "undefined") {
      return null;
    }

    let token = readWebSpoofToken();

    if (!token && !preview) {
      const response = await fetch("/api/web-spoof/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: readWebSpoofToken() }),
      });
      const data = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !data.token) {
        throw new Error(data.error ?? "Impossible de préparer le raccourci GPS.");
      }
      token = data.token;
      writeWebSpoofToken(token);
    }

    if (preview) {
      token = token ?? "anyloc_preview";
    }

    if (!token) {
      return null;
    }

    return buildWebSpoofBookmarklet({
      origin: window.location.origin,
      token,
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      name: location.name,
    });
  }, [location.accuracy, location.lat, location.lng, location.name, preview]);

  useEffect(() => {
    if (!open || step.id !== "shortcut") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const value = await ensureBookmarklet();
        if (!cancelled) {
          setBookmarklet(value);
        }
      } catch {
        if (!cancelled) {
          setBookmarklet(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ensureBookmarklet, open, step.id]);

  async function copyBookmarklet() {
    setCopying(true);
    try {
      const value = bookmarklet ?? (await ensureBookmarklet());
      if (!value) {
        throw new Error("Raccourci indisponible.");
      }
      setBookmarklet(value);
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    } finally {
      setCopying(false);
    }
  }

  function goNext() {
    onStepComplete?.(step.id);
    if (stepIndex >= WEB_SETUP_STEP_ITEMS.length - 1) {
      capturePostHogClientEvent("web_setup_completed", {
        payment_success: paymentSuccess,
      });
      onComplete();
      return;
    }

    setStepIndex((current) => current + 1);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <Card className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-none border-0 sm:max-h-[90dvh] sm:rounded-2xl sm:border">
        <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-pink-600">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">
              {paymentSuccess ? "Essai activé" : "Mise en route"}
            </span>
          </div>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Étape {stepIndex + 1} / {WEB_SETUP_STEP_ITEMS.length}
          </p>
          <div className="mt-3 flex gap-1.5">
            {WEB_SETUP_STEP_ITEMS.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  index <= stepIndex ? "bg-pink-500" : "bg-zinc-200"
                )}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {step.id === "phone" ? (
            <StepPhone
              phoneUrl={phoneUrl}
              isPhone={isPhone}
              onContinue={goNext}
            />
          ) : null}
          {step.id === "homescreen" ? (
            <StepHomescreen platform={platform} onContinue={goNext} />
          ) : null}
          {step.id === "shortcut" ? (
            <StepShortcut
              bookmarklet={bookmarklet}
              platform={platform}
              copying={copying}
              copied={copied}
              onCopy={() => void copyBookmarklet()}
              onContinue={goNext}
            />
          ) : null}
          {step.id === "apps" ? <StepApps onContinue={goNext} /> : null}
        </div>
      </Card>
    </div>
  );
}

export function WebGpsShortcutBar({
  bookmarklet,
  onCopy,
  copied,
}: {
  bookmarklet: string | null;
  onCopy: () => void;
  copied: boolean;
}) {
  if (!bookmarklet) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5">
      <Globe className="h-4 w-4 shrink-0 text-pink-600" />
      <p className="min-w-0 flex-1 text-xs text-pink-950">
        Nouvelle ville ? Recolle le raccourci dans ton favori Anyloc GPS, puis
        rouvre Snap.
      </p>
      <Button size="sm" variant="secondary" onClick={onCopy}>
        {copied ? "Copié" : "Copier"}
      </Button>
    </div>
  );
}
