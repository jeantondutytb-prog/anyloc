"use client";

import { motion } from "framer-motion";

const PARTICLES = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  left: `${6 + ((index * 19) % 88)}%`,
  top: `${4 + ((index * 27) % 92)}%`,
  size: index % 3 === 0 ? 4 : 2,
  delay: (index % 8) * 0.45,
  duration: 4 + (index % 5),
}));

const DESTINATIONS = [
  { name: "Marbella", x: "18%", y: "42%", delay: 0 },
  { name: "Ibiza", x: "72%", y: "30%", delay: 0.6 },
  { name: "Miami", x: "14%", y: "68%", delay: 1.1 },
  { name: "Mykonos", x: "78%", y: "52%", delay: 0.3 },
  { name: "Monaco", x: "58%", y: "22%", delay: 0.9 },
  { name: "Paris", x: "44%", y: "58%", delay: 1.4 },
  { name: "Dubaï", x: "82%", y: "72%", delay: 0.2 },
  { name: "Tokyo", x: "88%", y: "18%", delay: 1.7 },
  { name: "Bali", x: "32%", y: "78%", delay: 0.8 },
  { name: "New York", x: "8%", y: "28%", delay: 1.2 },
];

export function AuthPointsBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,114,182,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(244,114,182,0.06)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      {PARTICLES.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-pink-400/50"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={{ y: [0, -14, 0], opacity: [0.35, 0.9, 0.35] }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}

      {DESTINATIONS.map((destination) => (
        <motion.div
          key={destination.name}
          className="absolute flex items-center gap-1.5"
          style={{ left: destination.x, top: destination.y }}
          animate={{ y: [0, -8, 0], opacity: [0.65, 1, 0.65] }}
          transition={{
            duration: 5 + destination.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: destination.delay,
          }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-500/30" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.45)]" />
          </span>
          <span className="text-[10px] font-medium tracking-wide text-zinc-600">
            {destination.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
