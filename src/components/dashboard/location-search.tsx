"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import type { GeocodeResult } from "@/lib/geocoding";
import { DESTINATION_SPOTS } from "@/lib/destination-spots";
import { cn } from "@/lib/utils";

type Location = {
  name: string;
  lat: number;
  lng: number;
};

export function LocationSearch({
  onSelect,
  variant = "default",
}: {
  onSelect: (location: Location) => void;
  variant?: "default" | "panel";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const localMatches =
    query.trim().length >= 2
      ? DESTINATION_SPOTS.filter((loc) =>
          loc.name.toLowerCase().includes(query.trim().toLowerCase())
        ).map((loc) => ({
          id: `local-${loc.name}`,
          name: loc.name,
          lat: loc.lat,
          lng: loc.lng,
          subtitle: "Spot Anyloc",
        }))
      : [];

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            results?: GeocodeResult[];
            error?: string;
          };

          if (!response.ok) {
            throw new Error(data.error ?? "Recherche indisponible.");
          }

          setResults(data.results ?? []);
        })
        .catch((fetchError) => {
          if (controller.signal.aborted) {
            return;
          }

          setResults([]);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Recherche indisponible."
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = [...localMatches, ...results].slice(0, 10);
  const showDropdown = open && query.trim().length >= 2;

  function pickResult(result: GeocodeResult) {
    onSelect({
      name: result.subtitle ? `${result.name} — ${result.subtitle}` : result.name,
      lat: result.lat,
      lng: result.lng,
    });
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Search
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2",
          variant === "panel" ? "text-zinc-400" : "text-zinc-400"
        )}
      />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Recherche une ville, plage, adresse…"
        className={cn(
          "w-full rounded-2xl border py-3 pl-11 pr-4 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50",
          variant === "panel"
            ? "border-zinc-200 bg-zinc-50"
            : "border-zinc-200 bg-white"
        )}
        autoComplete="off"
      />

      {showDropdown && (
        <div
          className={cn(
            "absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg",
            variant === "panel" && "max-h-64"
          )}
        >
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recherche en cours…
            </div>
          )}

          {!loading && error && (
            <p className="px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-zinc-500">
              Aucun lieu trouvé. Essaie un autre nom.
            </p>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <ul className="max-h-72 overflow-y-auto py-1">
              {suggestions.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => pickResult(result)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pink-600/70" />
                    <span>
                      <span className="block text-sm font-medium text-zinc-900">
                        {result.name}
                      </span>
                      {result.subtitle && (
                        <span className="block text-xs text-zinc-500">
                          {result.subtitle}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
