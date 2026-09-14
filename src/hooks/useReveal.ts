import { useEffect, useRef, useState } from "react";

let prefersReducedMotionCache: boolean | null = null;
function prefersReducedMotion(): boolean {
  if (prefersReducedMotionCache !== null) return prefersReducedMotionCache;
  const matches =
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  prefersReducedMotionCache = matches;
  return matches;
}

/**
 * Lightweight, dependency-free "animate on scroll" hook.
 * Attach the returned ref to any element; `visible` flips to true the first
 * time the element scrolls into view, then stays true (no re-triggering,
 * which keeps scroll performance smooth on mobile).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  delayMs?: number;
}) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const delay = options?.delayMs ?? 0;
    let timeoutId: number | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (delay > 0) {
              timeoutId = window.setTimeout(() => setVisible(true), delay);
            } else {
              setVisible(true);
            }
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? "0px 0px -8% 0px",
      }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, visible };
}

/**
 * Helper to build className strings for scroll-reveal animations.
 * Usage: <div ref={ref} className={reveal(visible, "up")}>
 */
export function reveal(
  visible: boolean,
  variant: "up" | "down" | "left" | "right" | "scale" | "fade" = "up",
  extra = ""
) {
  const base = "transition-all duration-700 ease-out will-change-transform";
  const hidden: Record<string, string> = {
    up: "opacity-0 translate-y-8",
    down: "opacity-0 -translate-y-8",
    left: "opacity-0 translate-x-8",
    right: "opacity-0 -translate-x-8",
    scale: "opacity-0 scale-95",
    fade: "opacity-0",
  };
  const shown = "opacity-100 translate-y-0 translate-x-0 scale-100";
  return `${base} ${visible ? shown : hidden[variant]} ${extra}`;
}
