"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const MIN_VISIBLE_MS = 380;

type NavigationProgressContextValue = {
  start: () => void;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);

  if (!context) {
    throw new Error(
      "useNavigationProgress must be used within NavigationProgressProvider"
    );
  }

  return context;
}

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (startedAtRef.current !== null) {
      return;
    }

    clearTimers();
    startedAtRef.current = Date.now();
    setIsActive(true);
  }, [clearTimers]);

  const complete = useCallback(() => {
    const startedAt = startedAtRef.current;

    if (startedAt === null) {
      return;
    }

    const finish = () => {
      setIsActive(false);
      startedAtRef.current = null;
      clearTimers();
    };

    const elapsed = Date.now() - startedAt;

    if (elapsed < MIN_VISIBLE_MS) {
      timeoutRef.current = window.setTimeout(finish, MIN_VISIBLE_MS - elapsed);
      return;
    }

    finish();
  }, [clearTimers]);

  useEffect(() => {
    complete();
  }, [pathname, complete]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href || !href.startsWith("/") || href.startsWith("//")) {
        return;
      }

      const destination = href.split("#")[0] || href;

      if (destination === pathname) {
        return;
      }

      start();
    }

    document.addEventListener("click", handleClick);

    return () => document.removeEventListener("click", handleClick);
  }, [pathname, start]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <NavigationProgressContext.Provider value={{ start }}>
      {children}
      <div
        aria-live="polite"
        aria-busy={isActive}
        className={cn(
          "fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-200",
          isActive
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <div className="flex flex-col items-center gap-5">
          <Logo size="lg" href={null} />
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
            Chargement…
          </div>
        </div>
      </div>
    </NavigationProgressContext.Provider>
  );
}
