"use client";

import { useEffect, useRef } from "react";

export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

const INTERACTIVE_PARENT_SELECTOR = [
  "[data-slot='sidebar-menu-button']",
  "[data-slot='sidebar-menu-sub-button']",
  "[data-slot='sidebar-menu-action']",
  "[data-slot='dropdown-menu-item']",
  "[data-slot='select-trigger']",
  "[role='menuitem']",
  "[role='tab']",
  "button",
  "a",
].join(", ");

/**
 * Conecta a animação de um ícone `@lucide-animated` ao container interativo
 * pai mais próximo (item da sidebar, link, botão, item de menu ou aba), para que
 * passar o mouse em qualquer ponto do item dispare a animação do ícone uma única vez.
 */
export function useParentHoverAnimation(
  isControlledRef: React.RefObject<boolean>,
  onStart: () => void,
  onStop: () => void
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasInteractiveParentRef = useRef(false);
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);

  useEffect(() => {
    onStartRef.current = onStart;
    onStopRef.current = onStop;
  }, [onStart, onStop]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof element.closest !== "function") {
      hasInteractiveParentRef.current = false;
      return;
    }

    const parent = element.closest(INTERACTIVE_PARENT_SELECTOR);
    if (!parent || parent === element) {
      hasInteractiveParentRef.current = false;
      return;
    }

    hasInteractiveParentRef.current = true;

    const handleEnter = () => {
      if (!isControlledRef.current) {
        onStartRef.current();
      }
    };
    const handleLeave = () => {
      if (!isControlledRef.current) {
        onStopRef.current();
      }
    };

    parent.addEventListener("mouseenter", handleEnter);
    parent.addEventListener("mouseleave", handleLeave);
    return () => {
      hasInteractiveParentRef.current = false;
      parent.removeEventListener("mouseenter", handleEnter);
      parent.removeEventListener("mouseleave", handleLeave);
    };
  }, [isControlledRef]);

  return { containerRef, hasInteractiveParentRef };
}
