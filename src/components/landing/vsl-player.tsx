"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Rendered from apps/video (`npm run render`); re-render there to update.
const SRC = "/vsl/anyloc-vsl.mp4";
const POSTER = "/vsl/anyloc-vsl-poster.jpg";

export function VslPlayer() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (video && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
    }
  }, []);

  const toggleSound = () => {
    const video = ref.current;
    if (!video) return;
    if (muted) {
      // Turning the sound on restarts the video so the voiceover is heard
      // from the first line instead of mid-sentence.
      video.currentTime = 0;
      video.muted = false;
      video.play().catch(() => {});
    } else {
      video.muted = true;
    }
    setMuted(!muted);
  };

  return (
    <div className="relative">
      <video
        ref={ref}
        src={SRC}
        poster={POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onClick={toggleSound}
        aria-label="Anyloc en 30 secondes : change ta position sur Snap, Insta, Tinder et tes jeux"
        className="aspect-video w-full cursor-pointer rounded-xl bg-zinc-950 object-cover"
      />
      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Activer le son" : "Couper le son"}
        className={
          muted
            ? "absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition-transform hover:scale-105 sm:bottom-5 sm:left-5 sm:text-base"
            : "absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70 sm:bottom-5 sm:left-5"
        }
      >
        {muted ? (
          <>
            <VolumeX className="h-4 w-4 animate-pulse" />
            Active le son
          </>
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
