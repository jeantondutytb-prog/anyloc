"use client";

import { useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IosOtaInstallButton({
  hasAccess,
  preview = false,
  className,
}: {
  hasAccess: boolean;
  preview?: boolean;
  className?: string;
}) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInstall = async () => {
    if (preview) {
      return;
    }

    setInstalling(true);
    setError(null);

    try {
      const response = await fetch("/api/ios/install-link", { method: "POST" });
      const data = (await response.json()) as {
        installUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.installUrl) {
        throw new Error(data.error ?? "Impossible de lancer l'installation.");
      }

      window.location.href = data.installUrl;
    } catch (installError) {
      setError(
        installError instanceof Error
          ? installError.message
          : "Impossible de lancer l'installation."
      );
    } finally {
      setInstalling(false);
    }
  };

  if (preview) {
    return (
      <Button className={className}>
        <Smartphone className="h-4 w-4" />
        Installer Anyloc sur mon iPhone
      </Button>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        className={className}
        disabled={installing}
        onClick={() => void startInstall()}
      >
        {installing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}
        {installing ? "Préparation…" : "Installer Anyloc sur mon iPhone"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
