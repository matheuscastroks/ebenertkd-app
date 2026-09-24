"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
    setDismissed(wasDismissed || alreadyInstalled);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setShowIosGuide(isIos && !alreadyInstalled);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  if (dismissed || (!prompt && !showIosGuide)) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") dismiss();
    setPrompt(null);
  };

  return (
    <Alert className="fixed right-4 bottom-4 z-40 w-[calc(100%-2rem)] max-w-sm bg-background shadow-lg">
      {showIosGuide ? <Share aria-hidden="true" /> : <Download aria-hidden="true" />}
      <AlertTitle>Instale o Ebenert KD</AlertTitle>
      <AlertDescription>
        {showIosGuide
          ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
          : "Acesse a academia com mais rapidez pela tela inicial do celular."}
      </AlertDescription>
      <AlertAction className="flex gap-1">
        {prompt ? <Button size="sm" onClick={install}>Instalar</Button> : null}
        <Button variant="ghost" size="icon-sm" aria-label="Dispensar orientação de instalação" onClick={dismiss}>
          <X aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
