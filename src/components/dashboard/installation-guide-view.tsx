"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Globe,
  Loader2,
  Lock,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Usb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
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
          <p className="text-xs text-pink-600/90">
            Colle ce code dans l&apos;app Anyloc sur ton téléphone (commence par{" "}
            <strong>anyloc_</strong>, sans « Bearer »).
          </p>
          <Button size="sm" className="mt-3" onClick={() => void copyToken()}>
            <Copy className="h-4 w-4" />
            {copied ? "Copié !" : "Copier le code"}
          </Button>
        </div>
      )}
    </div>
  );
}

function TroubleshootingAccordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-zinc-50/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-zinc-700 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
        {children}
      </div>
    </details>
  );
}

function NoComputerNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-semibold">Pas de Mac ni de PC Windows ?</p>
      <p className="mt-1">
        L&apos;installation sur iPhone nécessite un ordinateur (Mac ou Windows) branché
        en USB — c&apos;est une contrainte Apple, pas Anyloc. Sans ordinateur compatible,
        l&apos;installation iPhone n&apos;est pas possible.
      </p>
      <p className="mt-2">
        Si tu as un téléphone <strong>Android</strong>, passe à l&apos;onglet Android :
        tout se fait depuis le téléphone, sans ordinateur.
      </p>
      <p className="mt-2 text-xs text-amber-800/90">
        Si aucune de ces options ne te convient, consulte la{" "}
        <Link
          href="/politique-de-remboursement"
          className="font-medium underline underline-offset-2"
        >
          politique de remboursement
        </Link>{" "}
        (garantie 48 h ou droit de rétractation légal).
      </p>
    </div>
  );
}

function IosGuide({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-950">
        <p className="font-semibold">iPhone : un ordinateur est obligatoire (Mac ou Windows)</p>
        <p className="mt-1">
          Le chemin d&apos;installation iPhone est <strong>différent</strong> d&apos;Android.
          Tu auras besoin d&apos;un Mac ou d&apos;un PC Windows pour la première installation
          via USB. Ensuite, tu gères ta position depuis l&apos;iPhone.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <p className="font-semibold">Mains libres, 100 % depuis l&apos;iPhone</p>
        <p className="mt-1">
          Branche ton iPhone une seule fois. Ensuite, Anyloc Setup reste en tâche de fond
          sur ton ordinateur et tu contrôles ta position depuis l&apos;app iPhone — sans
          toucher l&apos;ordi.
        </p>
      </div>

      <NoComputerNotice />

      <StepCard number={1} title="Télécharge Anyloc Setup sur ton ordinateur">
        <p>
          Anyloc Setup est le programme qui fait le lien entre ton iPhone et le GPS.
          Sur Mac, il se lance au démarrage et reste dans la barre de menus.
        </p>
        <DownloadButtons
          assetIds={["setup-mac", "setup-win"]}
          hasAccess={hasAccess}
        />
        <p className="text-xs text-zinc-500">
          Mac : Ventura ou plus récent · Windows : 10 ou plus récent · Câble USB requis
        </p>

        <TroubleshootingAccordion title="Mac : « Anyloc Setup est endommagé » ?">
          <p className="mb-3">
            macOS bloque les apps non signées Apple. Après avoir glissé l&apos;app
            dans Applications, ouvre le Terminal et colle :
          </p>
          <code className="block break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-800">
            xattr -cr &quot;/Applications/Anyloc Setup.app&quot;
          </code>
          <p className="mt-3">
            Sans Terminal : clic droit sur l&apos;app → <strong>Ouvrir</strong> →
            confirme, ou va dans <strong>Réglages → Confidentialité et sécurité</strong>
            et clique <strong>Ouvrir quand même</strong>.
          </p>
        </TroubleshootingAccordion>
      </StepCard>

      <StepCard number={2} title="Ouvre l'app et connecte-toi">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Ouvre <strong>Anyloc Setup</strong></li>
          <li>Connecte-toi avec ton <strong>compte Anyloc</strong> (email ou Google)</li>
        </ol>
        <p className="text-xs text-zinc-500">
          Utilise le même compte que sur anyloc.io — tes positions seront synchronisées.
        </p>
      </StepCard>

      <StepCard number={3} title="Branche ton iPhone et installe l'app">
        <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4">
          <Usb className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />
          <ol className="list-decimal space-y-2 pl-5">
            <li>Connecte ton iPhone en USB et appuie sur <strong>Faire confiance</strong></li>
            <li>Sur l&apos;iPhone : <strong>Réglages → Confidentialité et sécurité → Mode développeur → ON</strong></li>
            <li>Dans Anyloc Setup, clique <strong>Installer l&apos;app iPhone</strong></li>
          </ol>
        </div>
        <p className="text-xs text-zinc-500">
          Le mode développeur n&apos;apparaît qu&apos;après la première connexion USB.
          Redémarre si iOS te le demande.
        </p>

        <TroubleshootingAccordion title="iPhone non détecté ou mode dev invisible ?">
          <p className="mb-2">
            Sur Mac, installe les outils USB dans le Terminal :
          </p>
          <code className="block break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-800">
            pip3 install pymobiledevice3
          </code>
          <p className="mt-3">
            Puis relance Anyloc Setup. Si le mode développeur reste invisible,
            installe <strong>Xcode</strong> (App Store), ouvre-le et rebranche l&apos;iPhone.
          </p>
        </TroubleshootingAccordion>
      </StepCard>

      <StepCard number={4} title="Ouvre l'app iPhone et change ta position">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Ouvre <strong>Anyloc</strong> sur ton iPhone</li>
          <li>Connecte-toi avec le <strong>même compte</strong></li>
          <li>Choisis un lieu sur la carte ou dans <strong>Découvrir</strong></li>
          <li>Ta position GPS change instantanément</li>
        </ol>
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          Ton iPhone sert de télécommande. Tant que le Mac est allumé avec l&apos;iPhone
          branché, tu peux changer de position autant que tu veux depuis l&apos;app.
          Anyloc Setup se relance automatiquement au démarrage du Mac.
        </p>
      </StepCard>
    </div>
  );
}

function AndroidGuide({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-950">
        <p className="font-semibold">Android : aucun ordinateur requis</p>
        <p className="mt-1">
          Le chemin d&apos;installation Android est <strong>différent</strong> de
          l&apos;iPhone. Tout se fait depuis ton téléphone — pas de Mac, pas de PC,
          pas de câble USB.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <p className="font-semibold">100 % depuis ton téléphone</p>
        <p className="mt-1">
          Installe l&apos;APK, configure une fois les options développeur,
          puis change ta position dans l&apos;app Anyloc.
        </p>
      </div>

      <StepCard number={1} title="Télécharge et installe l'APK Anyloc">
        <p>
          Depuis ton Android, télécharge et installe l&apos;app directement —
          tu peux faire cette étape depuis le navigateur de ton téléphone.
        </p>
        <DownloadButtons assetIds={["apk"]} hasAccess={hasAccess} />
        <ol className="list-decimal space-y-2 pl-5">
          <li>Ouvre le fichier <strong>Anyloc.apk</strong> téléchargé</li>
          <li>
            Si Android bloque l&apos;installation, autorise ton navigateur à{" "}
            <strong>installer des applications inconnues</strong> (Chrome, Samsung
            Internet, etc.)
          </li>
          <li>Ouvre l&apos;app <strong>Anyloc</strong> une fois installée</li>
        </ol>

        <TroubleshootingAccordion title="Android bloque le téléchargement ou l'installation ?">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong>Chrome</strong> : Paramètres → Applications → Installer des
              applications inconnues → Chrome → Autoriser
            </li>
            <li>
              <strong>Samsung</strong> : Paramètres → Applications → menu ⋮ →
              Accès spécial → Installer des applis inconnues → ton navigateur →
              Autoriser
            </li>
            <li>
              Si un message « fichier potentiellement dangereux » s&apos;affiche,
              choisis <strong>Télécharger quand même</strong>
            </li>
          </ol>
        </TroubleshootingAccordion>
      </StepCard>

      <StepCard number={2} title="Active les options développeur et le GPS fictif">
        <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4">
          <Settings className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />
          <div className="space-y-3">
            <p className="font-medium text-zinc-800">Étape A — Activer le mode développeur</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Paramètres → À propos du téléphone</strong> (ou Infos sur
                le téléphone)
              </li>
              <li>
                Tape 7 fois sur <strong>Numéro de build</strong> (ou Numéro de
                version MIUI sur Xiaomi)
              </li>
              <li>
                Un message confirme que les <strong>options pour les
                développeurs</strong> sont activées
              </li>
            </ol>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4">
          <Settings className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />
          <div className="space-y-3">
            <p className="font-medium text-zinc-800">Étape B — Choisir Anyloc comme app de localisation fictive</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Paramètres → Options pour les développeurs</strong> →
                active le menu si besoin
              </li>
              <li>
                Cherche <strong>Application de localisation fictive</strong> (ou
                « Select mock location app »)
              </li>
              <li>Sélectionne <strong>Anyloc</strong></li>
            </ol>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" />
          <p className="text-sm">
            Autorise Anyloc en arrière-plan et la localisation « tout le temps »
            si Android te le demande.
          </p>
        </div>

        <TroubleshootingAccordion title="Je ne trouve pas « Application de localisation fictive » ?">
          <ul className="space-y-2">
            <li>
              <strong>Samsung</strong> : Options développeur → Application de
              localisation fictive → Anyloc
            </li>
            <li>
              <strong>Xiaomi / Redmi / POCO</strong> : Options développeur →
              Sélectionner une application de localisation fictive → Anyloc
            </li>
            <li>
              <strong>Huawei</strong> : Options développeur → Application de
              simulation de position → Anyloc
            </li>
            <li>
              <strong>Google Pixel</strong> : Options développeur → Select mock
              location app → Anyloc
            </li>
            <li>
              Si l&apos;option est grisée, ouvre d&apos;abord l&apos;app Anyloc
              une fois, puis reviens dans les paramètres.
            </li>
          </ul>
        </TroubleshootingAccordion>
      </StepCard>

      <StepCard number={3} title="Lie ton Android à ton compte">
        <DeviceTokenStep platform="android" />
      </StepCard>

      <StepCard number={4} title="Choisis ta destination dans l'app">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Ouvre <strong>Anyloc</strong> et colle ton code de liaison</li>
          <li>Cherche une ville (ex. Marbella) ou tape une adresse</li>
          <li>Appuie sur le lieu pour activer le GPS fictif</li>
          <li>
            Vérifie dans Google Maps ou Snapchat que ta position a bien changé
          </li>
        </ol>
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          Tu changes de spot quand tu veux — tout se fait depuis l&apos;app, sans
          ordinateur.
        </p>

        <TroubleshootingAccordion title="Le GPS ne change pas après installation ?">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Vérifie que <strong>Anyloc</strong> est bien l&apos;app de localisation fictive</li>
            <li>Active la localisation (GPS) sur ton téléphone</li>
            <li>Désactive les économies d&apos;énergie pour Anyloc</li>
            <li>Ferme et rouvre l&apos;app testée (Snapchat, Instagram…)</li>
            <li>
              Si tu es toujours bloqué, contacte{" "}
              <a href="mailto:support@anyloc.io" className="font-medium underline">
                support@anyloc.io
              </a>{" "}
              avec des captures d&apos;écran — voir la{" "}
              <Link href="/politique-de-remboursement" className="font-medium underline">
                politique de remboursement
              </Link>
            </li>
          </ol>
        </TroubleshootingAccordion>
      </StepCard>
    </div>
  );
}

export function InstallationGuideView({ embedded = false }: { embedded?: boolean } = {}) {
  const searchParams = useSearchParams();
  const { data, loading } = useDownloads();
  const { completeStep, state } = useDashboardOnboarding();
  const [platform, setPlatform] = useState<Platform>("ios");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const urlPlatform = searchParams.get("platform");
    if (urlPlatform === "android" || urlPlatform === "ios") {
      setPlatform(urlPlatform);
    } else if (/android/i.test(navigator.userAgent)) {
      setPlatform("android");
    }

    const sessionId = searchParams.get("session_id");
    const urlSuccess = searchParams.get("success") === "true";
    const sessionSuccess =
      window.sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY) === "true";

    const clearPaymentParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    };

    const markPaymentSuccess = () => {
      window.sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true");
      setPaymentSuccess(true);
      const stored = readOnboardingState();
      writeOnboardingState({ ...stored, welcomeDismissed: true });
      clearPaymentParams();
    };

    if (urlSuccess && sessionId) {
      void fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        .then(async (response) => {
          if (!response.ok) {
            return;
          }

          const data = await response.json();
          if (data.verified) {
            markPaymentSuccess();
          }
        })
        .catch(() => {
          // Ignore verification errors and keep the dashboard usable.
        });
      return;
    }

    if (sessionSuccess) {
      setPaymentSuccess(true);
      return;
    }

    setPaymentSuccess(false);
  }, [searchParams]);

  const hasAccess = data?.hasAccess ?? false;

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && <DashboardPageHeader title="Installation" />}

      <main className={embedded ? "" : "p-4 pb-8 sm:p-6 lg:p-8"}>
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
                <Link
                  href="/web"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  En attendant, teste le spoof dans ton navigateur
                </Link>
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
            Suis les étapes une par une, dans l&apos;ordre. Le chemin{" "}
            <strong>iPhone</strong> et <strong>Android</strong> ne sont pas les
            mêmes — choisis l&apos;onglet qui correspond à ton téléphone.
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
              <span className="hidden text-xs text-zinc-400 sm:inline">· Mac ou PC</span>
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
              <Smartphone className="h-4 w-4" />
              Android
              <span className="hidden text-xs text-zinc-400 sm:inline">· sans ordi</span>
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
                    Un Mac ou un PC Windows (USB)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Câble USB
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-600" />
                    Abonnement Anyloc actif
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
                    Aucun ordinateur requis
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
                Confirme quand ton téléphone est installé et lié.
              </p>
              <div className="mt-4">
                <Button onClick={() => completeStep("install")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Oui, c&apos;est installé
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
