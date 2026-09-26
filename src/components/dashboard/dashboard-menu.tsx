"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  HelpCircle,
  LayoutDashboard,
  MapPin,
  Menu,
  User,
  X,
} from "lucide-react";
import {
  dashboardHref,
  getDashboardBasePath,
  isDashboardHomePath,
} from "@/lib/dashboard-paths";
import { cn } from "@/lib/utils";

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
};

function getMenuSections(basePath: string): { items: MenuItem[] }[] {
  return [
    {
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: dashboardHref(basePath) },
        { icon: MapPin, label: "Choisir ma position", href: "/app" },
        { icon: User, label: "Mon compte", href: dashboardHref(basePath, "account") },
      ],
    },
    {
      items: [{ icon: HelpCircle, label: "Aide", href: "/#faq" }],
    },
  ];
}

const menuPanel = {
  hidden: { opacity: 0, y: -10, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.04,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.97,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
  },
};

const menuItem = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function isActive(pathname: string, currentTab: string | null, href: string) {
  const [path, query] = href.split("?");
  const hrefPath = path.split("#")[0];

  if (isDashboardHomePath(hrefPath) && isDashboardHomePath(pathname)) {
    const hrefTab = new URLSearchParams(query ?? "").get("tab");
    const normalizedCurrent =
      currentTab === "installation" ? "install" : currentTab;
    const normalizedHref = hrefTab === "installation" ? "install" : hrefTab;

    if (!normalizedHref) {
      return !normalizedCurrent || normalizedCurrent === "home";
    }

    return normalizedCurrent === normalizedHref;
  }

  if (!isDashboardHomePath(hrefPath) && !hrefPath.startsWith("/dashboard")) {
    return false;
  }

  return pathname.startsWith(hrefPath);
}

export function DashboardMenu() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") ?? null;
  const menuSections = getMenuSections(getDashboardBasePath(pathname));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border bg-white/95 shadow-lg backdrop-blur-md transition-all duration-200",
          open
            ? "border-pink-200 text-pink-600"
            : "border-zinc-200/80 text-zinc-700 hover:bg-white hover:text-pink-600"
        )}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
      >
        <span className="relative h-5 w-5">
          <Menu
            className={cn(
              "absolute inset-0 h-5 w-5 transition-all duration-200",
              open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            )}
          />
          <X
            className={cn(
              "absolute inset-0 h-5 w-5 transition-all duration-200",
              open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            )}
          />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={menuPanel}
            className="absolute left-0 top-12 z-50 w-56 origin-top-left overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 shadow-xl backdrop-blur-md"
          >
            {menuSections.map((section, sectionIndex) => (
              <motion.ul
                key={sectionIndex}
                className={cn("p-1.5", sectionIndex > 0 && "border-t border-zinc-100")}
                variants={menuPanel}
              >
                {section.items.map((item) => {
                  const active = isActive(pathname, currentTab, item.href);

                  return (
                    <motion.li key={item.href} variants={menuItem}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                          active
                            ? "bg-pink-500/10 text-pink-600"
                            : "text-zinc-700 hover:bg-zinc-50"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
