"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** Mede o item ativo; CSS anima o indicador sem mover o texto. */
export function useSlidingIndicator<T extends HTMLElement>(selector: string, attribute: string, enabled = true) {
  const containerRef = useRef<T | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const measuredRef = useRef(false);
  const [ready, setReady] = useState(false);

  const moveTo = useCallback((item: HTMLElement, animate: boolean) => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator || item.offsetWidth === 0) return;
    const previousTransition = indicator.style.transition;
    if (!animate) indicator.style.transition = "none";
    const itemRect = item.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    indicator.style.transform = `translate3d(${itemRect.left - containerRect.left}px, ${itemRect.top - containerRect.top}px, 0)`;
    indicator.style.width = `${item.offsetWidth}px`;
    indicator.style.height = `${item.offsetHeight}px`;
    if (!animate) {
      void indicator.offsetWidth;
      indicator.style.transition = previousTransition;
    }
    if (!measuredRef.current) {
      measuredRef.current = true;
      setReady(true);
    }
  }, []);

  useLayoutEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;
    const sync = (animate: boolean) => {
      const item = container.querySelector<HTMLElement>(selector);
      if (item) moveTo(item, animate);
    };
    sync(false);
    const observer = new MutationObserver(() => sync(measuredRef.current));
    observer.observe(container, { attributes: true, attributeFilter: [attribute], subtree: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => sync(false));
    resize?.observe(container);
    let mounted = true;
    void document.fonts?.ready.then(() => { if (mounted) sync(false); });
    return () => { mounted = false; observer.disconnect(); resize?.disconnect(); };
  }, [attribute, enabled, moveTo, selector]);

  return { containerRef, indicatorRef, ready, moveTo };
}
