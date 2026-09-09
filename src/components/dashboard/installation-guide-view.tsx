"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  Monitor,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Usb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Logo } from "@/components/ui/logo";
import { useDownloads } from "@/hooks/use-downloads";
import { getCheckoutUrl } from "@/lib/constants";
import { useDashboardOnboarding } from "@/hooks/use-dashboard-onboarding";
import {
  PAYMENT_SUCCESS_SESSION_KEY,
  writeOnboardingState,
  readOnboardingState,
} from "@/lib/dashboard-onboarding";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android";

type DeviceItem = {
  id: string;
  platform: Platform;
  deviceName: string;
  lastSeenAt: string | null;
};

type CreatedToken = {
  token: string;
  platform: Platform;
  apiBaseUrl: string;
};

function StepCard({
  number,
  title,
  children,
  done = false,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-zinc-200",
        done && "border-emerald-200 bg-emerald-50/30"
      )}
    >
      <div className="flex gap-4 p-5 sm:p-6">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
            done
              ? "bg-emerald-500 text-white"
              : "bg-pink-500/10 text-pink-600"
          )}
        >
          {done ? <Check className="h-5 w-5" /> : number}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-900 sm:text-lg">
            {title}
          </h3>
          <div className="mt-3 space-y-3 text-sm text-zinc-600">{children}</div>
        </div>
      </div>
    </Card>
  );
}

function DownloadButtons({
  assetIds,
  hasAccess,
}: {
  assetIds: string[];
  hasAccess: boolean;
}) {
  const { data, loading, error } = useDownloads();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-red-600">{error ?? "Erreur de chargement."}</p>;
  }

  const assets = data.assets.filter((asset) => assetIds.includes(asset.id));

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium text-amber-900">Abonnement requis</p>
            <p className="mt-1 text-amber-800/90">
              Les fichiers se débloquent dès que ton paiement est confirmé.
            </p>
            <Link href={getCheckoutUrl("annual")} className="mt-3 inline-block">
              <Button size="sm">Voir les offres</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {assets.map((asset) =>
        asset.available ? (
          <a key={asset.id} href={asset.downloadPath}>
            <Button className="w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Télécharger {asset.label.replace("Anyloc ", "").replace("Anyloc Setup ", "Setup ")}
            </Button>
          </a>
        ) : (
          <Button key={asset.id} disabled variant="secondary" className="w-full sm:w-auto">
            {asset.label} — bientôt disponible
          </Button>
        )
      )}
    </div>
  );
}

function DeviceTokenStep({ platform }: { platform: Platform }) {
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const response = await fetch("/api/device");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setDevices(data.devices ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const createToken = async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          deviceName: platform === "android" ? "Mon Android" : "Mon iPhone",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de créer le token.");
      }

      setCreatedToken({
        token: data.token,
        platform,
        apiBaseUrl: data.apiBaseUrl,
      });
      await loadDevices();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Impossible de créer le token."
      );
    } finally {
      setCreating(false);
    }
  };

  const copyToken = async () => {
    if (!createdToken) {
      return;
    }
    await navigator.clipboard.writeText(createdToken.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const linkedDevice = devices.find((d) => d.platform === platform);

  return (
    <div className="space-y-3">
      <p>
        Génère un code unique pour connecter l&apos;app {platform === "ios" ? "iPhone" : "Android"} à ton compte Anyloc.
        Colle-le dans l&apos;app quand elle te le demande.
      </p>

      {linkedDevice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            <strong>{linkedDevice.deviceName}</strong> déjà lié
            {linkedDevice.lastSeenAt
              ? ` · vu ${new Date(linkedDevice.lastSeenAt).toLocaleString("fr-FR")}`
              : ""}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!createdToken ? (
        <Button onClick={() => void createToken()} disabled={creating}>
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
          Générer mon code de liaison
        </Button>
      ) : (
        <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-4">
          <p className="font-medium text-pink-700">Copie ce code maintenant</p>
          <p className="mt-1 text-xs text-pink-600/90">
            Il ne sera plus affiché si tu quittes cette page.
          </p>
          <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-800">
            {createdToken.token}
          </code>
          <Button size="sm" className="mt-3" onClick={() => void copyToken()}>
            <Copy className="h-4 w-4" />
            {copied ? "Copié !" : "Copier le code"}
          </Button>
        </div>
      )}
    </div>
  );
}

function IosGuide({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className="space-y-4">
      <StepCard number={1} title="Télécharge Anyloc Setup sur ton ordinateur">
        <p>
          Choisis la version selon ton ordinateur. C&apos;est un logiciel léger
          qui installe l&apos;app Anyloc sur ton iPhone via USB — une seule fois.
        </p>
        <DownloadButtons
          assetIds={["setup-mac", "setup-win"]}
          hasAccess={hasAccess}
        />
        <p className="text-xs text-zinc-500">
          Mac : Ventura ou plus récent · Windows : 10 ou plus récent
        </p>
      </StepCard>

      <StepCard number={2} title="Branche ton iPhone en USB">
        <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4">
          <Usb className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />
          <ul className="space-y-2">
            <li>Connecte ton iPhone au Mac ou PC avec un câble USB</li>
            <li>Sur l&apos;iPhone, appuie sur <strong>Faire confiance à cet ordinateur</strong></li>
            <li>Ouvre <strong>Anyloc Setup</strong> sur l&apos;ordi et attends que l&apos;iPhone soit détecté</li>
            <li>Laisse le câble branché pendant toute l&apos;installation</li>
          </ul>
        </div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Le mode développeur n&apos;apparaît pas encore ?</strong> C&apos;est
          normal. Apple ne l&apos;affiche qu&apos;après cette première connexion USB
          avec Anyloc Setup (ou Xcode). Passe à l&apos;étape suivante une fois
          l&apos;iPhone détecté.
        </p>
      </StepCard>

      <StepCard number={3} title="Active le mode développeur sur ton iPhone">
        <p>
          Après la connexion USB, l&apos;option devient visible dans les réglages.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Ouvre <strong>Réglages</strong> sur ton iPhone</li>
          <li>Va dans <strong>Confidentialité et sécurité</strong></li>
          <li>Descends tout en bas → <strong>Mode développeur</strong></li>
          <li>Active l&apos;interrupteur</li>
          <li>Redémarre l&apos;iPhone quand iOS te le demande</li>
          <li>Après le redémarrage, appuie sur <strong>Activer</strong> et entre ton code</li>
        </ol>
        <p className="text-xs text-zinc-500">
          Toujours invisible ? Débranche/rebranche le câble avec Anyloc Setup ouvert,
          ou installe Xcode gratuitement sur Mac (App Store) puis branche l&apos;iPhone.
        </p>
      </StepCard>

      <StepCard number={4} title="Installe LocalDevVPN (recommandé)">
        <p>
          Cette app gratuite permet de renouveler Anyloc sans rebrancher ton
          ordinateur à chaque mise à jour.
        </p>
        <a
          href="https://apps.apple.com/app/localdevvpn/id6446805484"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="secondary">
            <ExternalLink className="h-4 w-4" />
            Télécharger LocalDevVPN sur l&apos;App Store
          </Button>
        </a>
      </StepCard>

      <StepCard number={5} title="Lance l'installation avec Anyloc Setup">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Ouvre <strong>Anyloc Setup</strong> sur ton ordinateur</li>
          <li>Attends que ton iPhone soit détecté (quelques secondes)</li>
          <li>Clique sur <strong>Installer</strong> et suis les instructions</li>
          <li>L&apos;app Anyloc apparaît sur ton iPhone en ~2 minutes</li>
        </ol>
      </StepCard>

      <StepCard number={6} title="Lie ton iPhone à ton compte">
        <DeviceTokenStep platform="ios" />
      </StepCard>

      <StepCard number={7} title="Choisis ta position sur la carte">
        <p>
          Retourne sur le dashboard, place un point sur la carte et active le
          signal GPS. Ton iPhone suivra cette position.
        </p>
        <Link href="/dashboard">
          <Button>
            Aller à la carte
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </StepCard>
    </div>
  );
}

function AndroidGuide({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className="space-y-4">
      <StepCard number={1} title="Télécharge l'APK Anyloc sur ton téléphone">
        <p>
          Depuis ton Android, clique sur le bouton ci-dessous. Le fichier se
          télécharge directement — pas besoin d&apos;ordinateur.
        </p>
        <DownloadButtons assetIds={["apk"]} hasAccess={hasAccess} />
      </StepCard>

      <StepCard number={2} title="Autorise l'installation de l'APK">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Ouvre le fichier <strong>Anyloc.apk</strong> téléchargé</li>
          <li>Si Android bloque, va dans <strong>Paramètres → Sécurité</strong></li>
          <li>Autorise ton navigateur à <strong>installer des apps inconnues</strong></li>
          <li>Relance l&apos;installation de l&apos;APK</li>
        </ol>
      </StepCard>

      <StepCard number={3} title="Active les options développeur">
        <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4">
          <Settings className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />
          <ol className="list-decimal space-y-2 pl-5">
            <li><strong>Paramètres → À propos du téléphone</strong></li>
            <li>Tape 7 fois sur <strong>Numéro de build</strong></li>
            <li>Retourne dans <strong>Paramètres → Options pour les développeurs</strong></li>
            <li>Active les options développeur</li>
          </ol>
        </div>
      </StepCard>

      <StepCard number={4} title="Définis Anyloc comme source GPS">
        <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />
          <ol className="list-decimal space-y-2 pl-5">
            <li>Dans les options développeur, cherche <strong>Application de localisation fictive</strong></li>
            <li>Sélectionne <strong>Anyloc</strong> dans la liste</li>
            <li>Autorise Anyloc à tourner en arrière-plan si Android le demande</li>
          </ol>
        </div>
      </StepCard>

      <StepCard number={5} title="Lie ton Android à ton compte">
        <DeviceTokenStep platform="android" />
      </StepCard>

      <StepCard number={6} title="Ouvre l'app et active ta position">
        <p>
          Lance Anyloc sur ton téléphone, colle le code de liaison, puis retourne
          sur le dashboard pour choisir ta ville et activer le signal.
        </p>
        <Link href="/dashboard">
          <Button>
            Aller à la carte
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </StepCard>
    </div>
  );
}

export function InstallationGuideView() {
  const searchParams = useSearchParams();
  const { data, loading } = useDownloads();
  const { completeStep, state } = useDashboardOnboarding();
  const [platform, setPlatform] = useState<Platform>("ios");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const urlPlatform = searchParams.get("platform");
    if (urlPlatform === "android" || urlPlatform === "ios") {
      setPlatform(urlPlatform);
    }

    const urlSuccess =
      searchParams.get("success") === "true" ||
      new URLSearchParams(window.location.search).get("success") === "true";
    const sessionSuccess =
      window.sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY) === "true";
    const success = urlSuccess || sessionSuccess;

    if (urlSuccess) {
      window.sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true");
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    setPaymentSuccess(success);

    if (success) {
      const stored = readOnboardingState();
      writeOnboardingState({ ...stored, welcomeDismissed: true });
    }
  }, [searchParams]);

  const hasAccess = data?.hasAccess ?? false;

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-zinc-200 bg-logo-background px-4 lg:hidden">
        <Logo />
      </header>

      <DashboardNav />

      <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
        {paymentSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900">
                  Paiement confirmé — bienvenue sur Anyloc !
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  Suis le guide ci-dessous de A à Z. Chaque étape est sur cette
                  page, avec les boutons de téléchargement au bon moment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl">
          <Badge className="mb-4">Guide d&apos;installation</Badge>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            Installe Anyloc sur ton téléphone
          </h1>
          <p className="mt-3 text-zinc-600">
            Tout est ici, étape par étape. Choisis ton téléphone, suis les
            instructions dans l&apos;ordre, et tu seras prêt en quelques minutes.
          </p>

          <div className="mt-8 flex gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5">
            <button
              type="button"
              onClick={() => setPlatform("ios")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                platform === "ios"
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              <Smartphone className="h-4 w-4" />
              iPhone
            </button>
            <button
              type="button"
              onClick={() => setPlatform("android")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                platform === "android"
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              <Monitor className="h-4 w-4" />
              Android
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <h2 className="font-semibold text-zinc-900">
              {platform === "ios" ? "Ce qu'il te faut" : "Ce qu'il te faut"}
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
              {platform === "ios" ? (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    iPhone iOS 17, 18 ou 26
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Mac ou PC Windows
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Câble USB
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Abonnement Anyloc actif
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Mode développeur (visible après branchement USB)
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Android 10 ou plus récent
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Options développeur activées
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Abonnement Anyloc actif
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Même email que sur le site
                  </li>
                </>
              )}
            </ul>
          </div>

          {loading ? (
            <div className="mt-8 flex items-center justify-center gap-2 py-12 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement du guide...
            </div>
          ) : platform === "ios" ? (
            <div className="mt-8">
              <IosGuide hasAccess={hasAccess} />
            </div>
          ) : (
            <div className="mt-8">
              <AndroidGuide hasAccess={hasAccess} />
            </div>
          )}

          {data?.isAdmin && (
            <p className="mt-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
              Mode admin actif — accès dev sans abonnement.
            </p>
          )}

          {!state.steps.install && (
            <Card className="mt-8 border-emerald-200 bg-emerald-50/50 p-5 sm:p-6">
              <h3 className="font-semibold text-zinc-900">
                Tu as terminé toutes les étapes ?
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                Confirme quand ton téléphone est installé et lié. Le bandeau sur
                la carte disparaîtra.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => completeStep("install")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Oui, c&apos;est installé
                </Button>
                <Link href="/dashboard">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Aller à la carte
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </main>

      <DashboardNav mobile />
    </div>
  );
}
