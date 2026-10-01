"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { readTrackAttributes, track } from "@/lib/analytics/track";

const SCROLL_MILESTONES = [25, 50, 75, 100];

type WebVitalsMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

const reportedVitals = new Set<string>();

// Stable reference so Next does not report the same metric twice. Keyed by
// name too: Strict Mode in development registers two listeners with distinct ids.
function reportWebVital(metric: WebVitalsMetric) {
  const key = `${metric.name}:${metric.navigationType}`;
  if (reportedVitals.has(key)) return;
  reportedVitals.add(key);

  track("web_vital", {
    metric: metric.name,
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    navigation_type: metric.navigationType,
  });
}

/**
 * Elements with `data-track="event_name"` send that event when clicked, with
 * every `data-track-*` attribute as a property. Links without `data-track`
 * still send `link_clicked` so outbound and footer navigation is visible.
 */
function useClickTracking() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const tracked = target?.closest<HTMLElement>("[data-track]");

      if (tracked?.dataset.track) {
        track(tracked.dataset.track, {
          ...readTrackAttributes(tracked),
          text: tracked.innerText?.trim().slice(0, 80) || undefined,
        });
        return;
      }

      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (link) {
        const url = new URL(link.href, window.location.href);
        track("link_clicked", {
          href: url.origin === window.location.origin ? url.pathname + url.hash : url.href,
          outbound: url.origin !== window.location.origin,
          text: link.innerText?.trim().slice(0, 80) || undefined,
        });
      }
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
}

/** Sends `scroll_depth_reached` once per milestone per page. */
function useScrollDepth(pathname: string) {
  useEffect(() => {
    const reached = new Set<number>();

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const percent = Math.round((window.scrollY / scrollable) * 100);
      for (const milestone of SCROLL_MILESTONES) {
        if (percent >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          track("scroll_depth_reached", { depth: milestone });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
}

/**
 * Sends `section_viewed` the first time a `[data-track-section]` is half
 * visible, or fills half the screen when it is taller than the viewport.
 */
function useSectionViews(pathname: string) {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const pageStart = performance.now();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const fillsScreen =
            entry.intersectionRect.height >= window.innerHeight * 0.5;
          if (!entry.isIntersecting || (entry.intersectionRatio < 0.5 && !fillsScreen)) {
            continue;
          }
          const element = entry.target as HTMLElement;
          track("section_viewed", {
            section: element.dataset.trackSection,
            seconds_since_page_load: Math.round((performance.now() - pageStart) / 1000),
          });
          observer.unobserve(element);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    // Sections can mount after this effect (client components, Suspense).
    const observeAll = () =>
      document
        .querySelectorAll<HTMLElement>("[data-track-section]:not([data-track-observed])")
        .forEach((element) => {
          element.dataset.trackObserved = "";
          observer.observe(element);
        });

    observeAll();
    const mutations = new MutationObserver(observeAll);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      document
        .querySelectorAll<HTMLElement>("[data-track-observed]")
        .forEach((element) => delete element.dataset.trackObserved);
    };
  }, [pathname]);
}

/**
 * Logs every same-origin `/api/*` call that fails or is slow, so broken or
 * sluggish endpoints show up without instrumenting each fetch by hand.
 */
function useApiMonitoring() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input, init) => {
      const url = new URL(
        typeof input === "string" || input instanceof URL ? input : input.url,
        window.location.href
      );
      const isOwnApi =
        url.origin === window.location.origin && url.pathname.startsWith("/api/");

      if (!isOwnApi) {
        return originalFetch(input, init);
      }

      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const startedAt = performance.now();

      try {
        const response = await originalFetch(input, init);
        const duration = Math.round(performance.now() - startedAt);

        if (!response.ok) {
          track("api_request_failed", {
            endpoint: url.pathname,
            method,
            status: response.status,
            duration_ms: duration,
          });
        } else if (duration > 3000) {
          track("api_request_slow", { endpoint: url.pathname, method, duration_ms: duration });
        }

        return response;
      } catch (error) {
        track("api_request_failed", {
          endpoint: url.pathname,
          method,
          status: 0,
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Math.round(performance.now() - startedAt),
        });
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}

export function AnalyticsListener() {
  const pathname = usePathname();

  useReportWebVitals(reportWebVital);
  useClickTracking();
  useScrollDepth(pathname);
  useSectionViews(pathname);
  useApiMonitoring();

  return null;
}
