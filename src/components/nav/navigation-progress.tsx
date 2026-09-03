"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationProgressContextValue = { startNavigationProgress: (route: string) => void };

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);
  if (!context) {
    throw new Error("useNavigationProgress must be used within NavigationProgressProvider.");
  }
  return context;
}

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const query = searchParams.toString();
  const currentRoute = query ? `${pathname}?${query}` : pathname;

  const startNavigationProgress = useCallback((route: string) => {
    if (route === currentRoute) return;
    setPending(true);
    setPendingRoute(route);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setPending(false), 10_000);
  }, [currentRoute]);

  useEffect(() => {
    window.clearTimeout(timeoutRef.current);
    const resetId = window.setTimeout(() => {
      setPending(false);
      setPendingRoute(null);
    }, 0);
    return () => window.clearTimeout(resetId);
  }, [currentRoute]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

        const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);
        const nextRoute = `${url.pathname}${url.search}`;
      if (url.origin !== currentUrl.origin || nextRoute === currentRoute) return;

        startNavigationProgress(nextRoute);
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.clearTimeout(timeoutRef.current);
    };
  }, [currentRoute, startNavigationProgress]);

  return (
      <NavigationProgressContext value={{ startNavigationProgress }}>
        {children}
        {pending && pendingRoute !== currentRoute ? (
        <>
          <div
            className="bg-background/35 fixed inset-0 z-40 cursor-wait"
            aria-hidden="true"
          />
          <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5" role="status">
            <span className="sr-only">Loading page</span>
            <div className="bg-primary h-full w-full origin-left animate-[navigation-progress_10s_ease-out_forwards]" />
          </div>
        </>
        ) : null}
      </NavigationProgressContext>
  );
}
