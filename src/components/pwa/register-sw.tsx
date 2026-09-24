"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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

  if (!waitingWorker) return null;

  return (
    <Alert className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm bg-background shadow-lg">
      <RefreshCw aria-hidden="true" />
      <AlertTitle>Atualização disponível</AlertTitle>
      <AlertDescription>Atualize para usar a versão mais recente do aplicativo.</AlertDescription>
      <AlertAction>
        <Button size="sm" onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}>Atualizar</Button>
      </AlertAction>
    </Alert>
  );
}
