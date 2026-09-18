"use client";

import { useEffect } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { initPostHogBrowser } from "@/lib/posthog/browser";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    initPostHogBrowser();
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          fontFamily: "system-ui, sans-serif",
          background: "#fff9fb",
          color: "#18181b",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Oups, un truc a planté</h1>
        <p
          style={{
            marginTop: 12,
            maxWidth: 420,
            textAlign: "center",
            color: "#71717a",
            lineHeight: 1.5,
          }}
        >
          Réessaie, ou reviens à l&apos;accueil. Si ça continue, écris-nous à
          support@anyloc.io.
        </p>
        <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: "0 24px",
              border: 0,
              borderRadius: 12,
              background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              height: 44,
              alignItems: "center",
              padding: "0 24px",
              borderRadius: 12,
              border: "1px solid #e4e4e7",
              background: "white",
              color: "#18181b",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </body>
    </html>
  );
}
