"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "./use-pwa-install";
import { InstallModal } from "./install-modal";

export function InstallAppCard() {
  const { isMounted, isStandalone, hasNativePrompt, promptInstall } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (!isMounted) {
    return null;
  }

  const handleInstall = async () => {
    if (hasNativePrompt) {
      const outcome = await promptInstall();
      if (outcome === "ios_instructions" || outcome === "unavailable") {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted p-1 border border-border">
            <Image
              src="/brand-icon.png"
              alt="Ebener TKD"
              width={32}
              height={32}
              className="size-8 object-contain"
              unoptimized
            />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                Instalar Ebener TKD no celular
              </p>
              {isStandalone ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Instalado
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {isStandalone
                ? "Você já está usando o aplicativo em modo instalado."
                : "Acesse seus treinos e avisos direto da tela inicial, em tela cheia e sem barra de navegador."}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {isStandalone ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              <Smartphone className="mr-2 size-4" />
              Ver instruções
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleInstall}
            >
              <Download className="mr-2 size-4" />
              Instalar Aplicativo
            </Button>
          )}
        </div>
      </div>

      <InstallModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
