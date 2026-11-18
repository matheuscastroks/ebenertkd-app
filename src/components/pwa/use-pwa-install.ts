"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Global singleton state so no early event is lost before React components mount
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    globalDeferredPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getPromptSnapshot() {
  return globalDeferredPrompt;
}

function getServerPromptSnapshot() {
  return null;
}

export function usePwaInstall() {
  const prompt = useSyncExternalStore(
    subscribe,
    getPromptSnapshot,
    getServerPromptSnapshot
  );

  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
    const iosDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    setIsStandalone(standalone);
    setIsIos(iosDevice);
    setIsMounted(true);

    const media = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };

    media.addEventListener("change", handleMediaChange);
    return () => media.removeEventListener("change", handleMediaChange);
  }, []);

  const canInstall = !isStandalone && (Boolean(prompt) || isIos);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "ios_instructions" | "unavailable"
  > => {
    if (isStandalone) {
      return "unavailable";
    }

    if (globalDeferredPrompt) {
      const currentPrompt = globalDeferredPrompt;
      await currentPrompt.prompt();
      const choice = await currentPrompt.userChoice;
      if (choice.outcome === "accepted") {
        globalDeferredPrompt = null;
        notifyListeners();
      }
      return choice.outcome;
    }

    if (isIos) {
      return "ios_instructions";
    }

    return "unavailable";
  }, [isIos, isStandalone]);

  return {
    isMounted,
    isStandalone,
    isIos,
    canInstall,
    hasNativePrompt: Boolean(prompt),
    promptInstall,
  };
}
