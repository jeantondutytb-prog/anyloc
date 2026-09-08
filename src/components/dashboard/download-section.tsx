"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCheckoutUrl } from "@/lib/constants";

type DownloadAssetInfo = {
  id: string;
  label: string;
  description: string;
  filename: string;
  available: boolean;
  downloadPath: string;
};

type DownloadsResponse = {
  hasAccess: boolean;
  isAdmin?: boolean;
  subscriptionStatus: string | null;
  assets: DownloadAssetInfo[];
};

export function DownloadSection() {
  const [data, setData] = useState<DownloadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDownloads() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/downloads");

        if (response.status === 401) {
          setData(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Impossible de charger les téléchargements.");
        }

        setData(await response.json());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les téléchargements."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDownloads();
  }, []);

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des téléchargements...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-medium text-zinc-600">Téléchargements</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Connecte-toi pour accéder à Anyloc Setup et à l&apos;APK Android.
        </p>
        <Link href="/login" className="mt-4 inline-block">
          <Button size="sm">Se connecter</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-zinc-600">Téléchargements</h3>
      <p className="mt-2 text-sm text-zinc-500">
        Installe les outils Anyloc sur ton ordi ou ton Android. Sur iPhone, le
        Setup desktop est requis une seule fois.
      </p>

      {!data.hasAccess && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Abonnement requis</p>
            <p className="mt-1 text-amber-800/90">
              Les fichiers sont débloqués dès que ton paiement est confirmé.
            </p>
            <Link href={getCheckoutUrl("annual")} className="mt-3 inline-block">
              <Button size="sm">Voir les offres</Button>
            </Link>
          </div>
        </div>
      )}

      {data.isAdmin && (
        <p className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          Mode admin actif — accès dev sans abonnement.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {data.assets.map((asset) => (
          <li
            key={asset.id}
            className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-zinc-900">{asset.label}</p>
                <p className="mt-1 text-sm text-zinc-500">{asset.description}</p>
                <p className="mt-1 text-xs text-zinc-400">{asset.filename}</p>
              </div>

              {data.hasAccess ? (
                asset.available ? (
                  <a href={asset.downloadPath}>
                    <Button size="sm" className="w-full sm:w-auto">
                      <Download className="h-4 w-4" />
                      Télécharger
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="secondary" disabled className="w-full sm:w-auto">
                    Bientôt disponible
                  </Button>
                )
              ) : (
                <Button size="sm" variant="secondary" disabled className="w-full sm:w-auto">
                  <Lock className="h-4 w-4" />
                  Verrouillé
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
