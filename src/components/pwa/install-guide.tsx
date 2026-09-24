"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ebenertkd-install-guide-dismissed";

export function InstallGuide() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches;
    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === "true";
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const initialize = window.setTimeout(() => {
      setDismissed(wasDismissed || alreadyInstalled);
      setShowIosGuide(isIos && !alreadyInstalled);
    }, 0);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
    toast.dismiss("pwa-install");
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") dismiss();
    setPrompt(null);
  }, [dismiss, prompt]);

  useEffect(() => {
    if (dismissed || (!prompt && !showIosGuide)) return;
    toast.info("Instale o Ebenert KD", {
      id: "pwa-install",
      description: showIosGuide
        ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
        : "Acesse a academia com mais rapidez pela tela inicial do celular.",
      duration: Infinity,
      action: prompt ? { label: "Instalar", onClick: install } : { label: "Entendi", onClick: dismiss },
      cancel: prompt ? { label: "Agora não", onClick: dismiss } : undefined
    });
  }, [dismiss, dismissed, install, prompt, showIosGuide]);

  return null;
}
