"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function invokeSafely(callback: () => void) {
  try {
    callback();
  } catch (error) {
    if (error instanceof Error && error.message.includes("controls.start() should only be called after a component has mounted")) {
      return;
    }
    throw error;
  }
}

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
  "[data-slot='input-group']",
  "[data-slot='input-group-addon']",
  "[data-slot='field']",
  "[data-slot='control']",
  "[data-slot='checkbox']",
  "[data-slot='accordion-trigger']",
  "[data-slot='dialog-close']",
  "[data-slot='sheet-close']",
  "[role='menuitem']",
  "[role='tab']",
  "button",
  "a",
  "label",
  "summary",
].join(", ");

/**
 * Conecta a animação de um ícone `@lucide-animated` ao container interativo
 * pai mais próximo (item da sidebar, link, botão, item de menu, aba ou campo de formulário),
 * para que passar o mouse ou focar no elemento dispare a animação do ícone.
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

  useIsomorphicLayoutEffect(() => {
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

    let active = true;
    hasInteractiveParentRef.current = true;

    const handleEnter = () => {
      if (!active || isControlledRef.current || !element.isConnected) return;
      invokeSafely(onStartRef.current);
    };
    const handleLeave = () => {
      if (!active || isControlledRef.current || !element.isConnected) return;
      invokeSafely(onStopRef.current);
    };

    parent.addEventListener("mouseenter", handleEnter);
    parent.addEventListener("mouseleave", handleLeave);
    parent.addEventListener("focusin", handleEnter);
    parent.addEventListener("focusout", handleLeave);
    return () => {
      active = false;
      hasInteractiveParentRef.current = false;
      parent.removeEventListener("mouseenter", handleEnter);
      parent.removeEventListener("mouseleave", handleLeave);
      parent.removeEventListener("focusin", handleEnter);
      parent.removeEventListener("focusout", handleLeave);
    };
  }, [isControlledRef]);

  return { containerRef, hasInteractiveParentRef };
}
