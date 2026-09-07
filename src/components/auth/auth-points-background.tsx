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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(244,114,182,0.08),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      {PARTICLES.map((particle) => (
        <motion.span
          key={particle.id}
          className="auth-particle absolute rounded-full bg-pink-400/70"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={{ y: [0, -14, 0], opacity: [0.25, 0.85, 0.25] }}
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
          animate={{ y: [0, -8, 0], opacity: [0.55, 1, 0.55] }}
          transition={{
            duration: 5 + destination.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: destination.delay,
          }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400/40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.8)]" />
          </span>
          <span className="text-[10px] font-medium tracking-wide text-white/80">
            {destination.name}
          </span>
        </motion.div>
      ))}

      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl"
      />
    </div>
  );
}
