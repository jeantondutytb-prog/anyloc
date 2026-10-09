"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, MapPin, Pointer, Search } from "lucide-react";
import type { ReactNode } from "react";
import appTeleport from "../../../public/landing/app-teleport.webp";
import { cn } from "@/lib/utils";

/**
 * One scripted moment when the section scrolls into view: the three captions
 * pop in, a tap lands on "Définir cette position", then a notification drops
 * in. Nothing to click; with reduced motion everything is simply shown.
 */
const STEP = 0.55;

function Caption({
  children,
  icon,
  delay,
  className,
  highlight = false,
}: {
  children: ReactNode;
  icon: ReactNode;
  delay: number;
  className: string;
  highlight?: boolean;
}) {
  const variants: Variants = {
    hidden: { opacity: 0, scale: 0.85, y: 6 },
    shown: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { delay, type: "spring", stiffness: 320, damping: 22 },
    },
  };

  return (
    <motion.div
      variants={variants}
      className={cn(
        "absolute z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg sm:text-[13px]",
        highlight
          ? "bg-pink-600 text-white shadow-pink-600/30"
          : "bg-white text-zinc-900 shadow-zinc-900/15 ring-1 ring-zinc-200",
        className
      )}
    >
      {icon}
      {children}
    </motion.div>
  );
}

export function AppShowcase() {
  const reduce = useReducedMotion();
  const tapAt = STEP * 3 + 0.3;

  const tapVariants: Variants = {
    hidden: { opacity: 0, scale: 0.4 },
    shown: {
      opacity: [0, 0.9, 0],
      scale: [0.4, 1, 1.6],
      transition: { delay: tapAt, duration: 0.7, ease: "easeOut" },
    },
  };
  const notificationVariants: Variants = {
    hidden: { opacity: 0, y: -40 },
    shown: {
      opacity: 1,
      y: 0,
      transition: { delay: tapAt + 0.45, type: "spring", stiffness: 260, damping: 24 },
    },
  };

  return (
    <section id="app" data-track-section="app_showcase" className="overflow-hidden py-20 sm:py-28">
      <div className="mx-auto grid max-w-5xl items-center gap-14 px-4 sm:px-6 md:grid-cols-2 md:gap-10">
        <div className="max-w-md">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Choisis ta ville, toutes tes apps suivent.
          </h2>
          <p className="mt-4 text-zinc-600">
            Un VPN change ton IP, pas ton GPS. Anyloc change directement le GPS
            du téléphone : Snap, Insta, Tinder et tes jeux voient tous la même
            ville.
          </p>
          <p className="mt-4 text-zinc-600">
            Et en mode Trajet, ta loc se déplace toute seule le long d&apos;un
            parcours, à pied ou en voiture.
          </p>
        </div>

        {/* The phone drives the whole sequence: children only declare variants. */}
        <motion.div
          initial={reduce ? "shown" : "hidden"}
          whileInView="shown"
          viewport={{ once: true, amount: 0.4 }}
          className="relative mx-auto w-[230px] sm:w-[270px]"
        >
          <div className="rounded-[2.5rem] bg-zinc-900 p-2 shadow-2xl shadow-zinc-900/25 ring-1 ring-zinc-700">
            <div className="relative overflow-hidden rounded-[2.1rem]">
              <Image
                src={appTeleport}
                alt="L'app Anyloc sur iPhone : un pin posé sur New York, prêt à être défini comme position."
                sizes="(min-width: 640px) 270px, 230px"
                className="h-auto w-full"
                placeholder="blur"
              />

              {/* The tap on "Définir cette position". */}
              {!reduce && (
                <motion.span
                  aria-hidden
                  variants={tapVariants}
                  className="absolute left-1/2 top-[86.6%] -ml-5 -mt-5 h-10 w-10 rounded-full bg-white/70"
                />
              )}

              {/* The result, as an iOS notification. */}
              <motion.div
                variants={notificationVariants}
                className="absolute inset-x-2 top-2 flex items-center gap-2.5 rounded-2xl bg-white/95 px-3 py-2.5 shadow-lg shadow-black/30 backdrop-blur"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-600">
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                </span>
                <span className="text-[11px] leading-tight text-zinc-700 sm:text-xs">
                  <span className="block font-semibold text-zinc-900">Position définie</span>
                  Snap, Insta, Tinder : tu es à New York
                </span>
              </motion.div>
            </div>
          </div>

          <Caption
            delay={STEP}
            icon={<Search className="h-3.5 w-3.5 text-pink-600" />}
            className="-left-10 top-[23%] sm:-left-16"
          >
            Choisis ta ville
          </Caption>
          <Caption
            delay={STEP * 2}
            icon={<MapPin className="h-3.5 w-3.5 text-pink-600" />}
            className="-right-10 top-[41%] sm:-right-16"
          >
            Ou pose ton pin où tu veux
          </Caption>
          <Caption
            delay={STEP * 3}
            highlight
            icon={<Pointer className="h-3.5 w-3.5" />}
            className="-left-8 top-[92%] sm:-left-14"
          >
            Téléporte-toi en 1 tap
          </Caption>
        </motion.div>
      </div>
    </section>
  );
}
