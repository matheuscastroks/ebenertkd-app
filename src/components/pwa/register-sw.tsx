"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export function RegisterServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) setWaitingWorker(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) setWaitingWorker(installing);
        });
      });
    }).catch(() => {
      // A aplicação continua funcional sem instalação ou suporte offline.
    });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  useEffect(() => {
    if (!waitingWorker) return;
    toast.info("Atualização disponível", {
      id: "pwa-update",
      description: "Atualize para usar a versão mais recente do aplicativo.",
      duration: Infinity,
      action: {
        label: "Atualizar",
        onClick: () => waitingWorker.postMessage({ type: "SKIP_WAITING" })
      }
    });
  }, [waitingWorker]);

  return null;
}
