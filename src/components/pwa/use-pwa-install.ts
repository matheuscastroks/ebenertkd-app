"use client";

import { useCallback, useSyncExternalStore } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Global singleton state so early events before React mounts are never missed
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

function notifyPromptListeners() {
  promptListeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    globalDeferredPrompt = event as BeforeInstallPromptEvent;
    notifyPromptListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    notifyPromptListeners();
  });
}

function subscribePrompt(callback: () => void) {
  promptListeners.add(callback);
  return () => {
    promptListeners.delete(callback);
  };
}

function getPromptSnapshot() {
  return globalDeferredPrompt;
}

function getServerPromptSnapshot() {
  return null;
}

// Standalone mode subscriber
function subscribeStandalone(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getStandaloneSnapshot() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
  );
}

function getServerStandaloneSnapshot() {
  return false;
}

// Client-mount subscriber
const emptySubscribe = () => () => {};

function getMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}

// iOS detection snapshot
function getIosSnapshot() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function getServerIosSnapshot() {
  return false;
}

export function usePwaInstall() {
  const prompt = useSyncExternalStore(
    subscribePrompt,
    getPromptSnapshot,
    getServerPromptSnapshot
  );

  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getServerStandaloneSnapshot
  );

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    getMountedSnapshot,
    getServerMountedSnapshot
  );

  const isIos = useSyncExternalStore(
    emptySubscribe,
    getIosSnapshot,
    getServerIosSnapshot
  );

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
        notifyPromptListeners();
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
