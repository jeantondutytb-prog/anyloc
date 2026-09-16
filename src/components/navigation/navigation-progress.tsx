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

const MIN_VISIBLE_MS = 320;

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
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

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
    setProgress(18);

    intervalRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current;
        }

        return current + 4 + Math.random() * 6;
      });
    }, 160);
  }, [clearTimers]);

  const complete = useCallback(() => {
    const startedAt = startedAtRef.current;

    if (startedAt === null) {
      return;
    }

    const finish = () => {
      setProgress(100);

      timeoutRef.current = window.setTimeout(() => {
        setIsActive(false);
        setProgress(0);
        startedAtRef.current = null;
        clearTimers();
      }, 180);
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
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
      >
        <div
          className="h-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 shadow-[0_0_10px_rgba(236,72,153,0.35)] transition-[width,opacity] duration-200 ease-out"
          style={{
            width: isActive ? `${progress}%` : "0%",
            opacity: isActive ? 1 : 0,
          }}
        />
      </div>
    </NavigationProgressContext.Provider>
  );
}
