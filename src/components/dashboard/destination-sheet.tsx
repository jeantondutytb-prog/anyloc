"use client";

import { useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";
import {
  filterSpotsByCategory,
  SPOT_CATEGORIES,
  type SpotCategory,
} from "@/lib/destination-spots";
import { cn } from "@/lib/utils";

type Location = {
  name: string;
  lat: number;
  lng: number;
};

type DestinationSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (location: Location) => void;
  selectedName?: string;
};

export function DestinationSheet({
  open,
  onClose,
  onSelect,
  selectedName,
}: DestinationSheetProps) {
  const [category, setCategory] = useState<SpotCategory>("all");
  const spots = useMemo(() => filterSpotsByCategory(category), [category]);

  function handleSelect(location: Location) {
    onSelect(location);
    onClose();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
              Destination
            </p>
            <h2 className="text-lg font-bold text-zinc-900">Où veux-tu être ?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-sm text-zinc-500">
            Choisis un spot ci-dessous ou utilise la barre de recherche en haut.
          </p>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SPOT_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  category === item.id
                    ? "bg-pink-500 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-1 pb-4">
            {spots.map((spot) => {
              const isSelected = selectedName === spot.name;

              return (
                <li key={spot.name}>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelect({
                        name: spot.name,
                        lat: spot.lat,
                        lng: spot.lng,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-pink-50 ring-1 ring-pink-200"
                        : "hover:bg-zinc-50"
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-lg">
                      {spot.emoji ?? "📍"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900">
                        {spot.name}
                      </span>
                      <span className="block text-xs capitalize text-zinc-500">
                        {SPOT_CATEGORIES.find((c) => c.id === spot.category)?.label}
                      </span>
                    </span>
                    <MapPin
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected ? "text-pink-600" : "text-zinc-300"
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
