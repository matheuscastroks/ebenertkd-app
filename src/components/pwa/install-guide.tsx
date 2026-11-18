"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { usePwaInstall } from "./use-pwa-install";
import { InstallModal } from "./install-modal";

const DISMISS_KEY = "ebenertkd-install-guide-dismissed";
const dismissListeners = new Set<() => void>();

function notifyDismissListeners() {
  dismissListeners.forEach((listener) => listener());
}

function subscribeDismissed(callback: () => void) {
  dismissListeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    dismissListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

function getDismissedSnapshot() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DISMISS_KEY) === "true";
}

function getServerDismissedSnapshot() {
  return false;
}

export function InstallGuide() {
  const { isMounted, isStandalone, isIos, hasNativePrompt, promptInstall } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);

  const wasDismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getServerDismissedSnapshot
  );

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "true");
      notifyDismissListeners();
    }
    toast.dismiss("pwa-install");
  }, []);

  const handleInstallAction = useCallback(async () => {
    if (hasNativePrompt) {
      const result = await promptInstall();
      if (result === "accepted") {
        dismiss();
      }
    } else if (isIos) {
      setModalOpen(true);
      dismiss();
    }
  }, [dismiss, hasNativePrompt, isIos, promptInstall]);

  useEffect(() => {
    if (!isMounted || wasDismissed || isStandalone) return;
    if (!hasNativePrompt && !isIos) return;

    toast.info("Instale o Ebener TKD", {
      id: "pwa-install",
      description: isIos
        ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
        : "Acesse a academia com mais rapidez pela tela inicial do celular.",
      duration: Infinity,
      action: {
        label: isIos ? "Como instalar" : "Instalar",
        onClick: handleInstallAction,
      },
      cancel: {
        label: "Agora não",
        onClick: dismiss,
      },
    });
  }, [dismiss, handleInstallAction, hasNativePrompt, isIos, isMounted, isStandalone, wasDismissed]);

  return <InstallModal open={modalOpen} onOpenChange={setModalOpen} />;
}
