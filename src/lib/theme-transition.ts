"use client";

import { flushSync } from "react-dom";

let activeTransition: ViewTransition | undefined;

export function changeTheme(setTheme: (theme: string) => void, theme: string) {
  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTheme(theme);
    return;
  }

  activeTransition?.skipTransition();
  document.documentElement.setAttribute("data-theme-transition", "");
  const transition = document.startViewTransition(() => {
    // next-themes applies the root class in an effect; flush it before the new snapshot.
    flushSync(() => setTheme(theme));
  });
  activeTransition = transition;
  void transition.ready.catch(() => undefined);
  void transition.finished.catch(() => undefined).finally(() => {
    if (activeTransition === transition) {
      document.documentElement.removeAttribute("data-theme-transition");
      activeTransition = undefined;
    }
  });
}
