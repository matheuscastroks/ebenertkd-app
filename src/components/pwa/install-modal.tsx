"use client";

import Image from "next/image";
import { Download, Share, PlusSquare, CheckCircle2, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "./use-pwa-install";

type InstallModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InstallModal({ open, onOpenChange }: InstallModalProps) {
  const { isStandalone, isIos, hasNativePrompt, promptInstall } = usePwaInstall();

  const handleInstallClick = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="items-center text-center">
          <div className="relative mb-2 flex size-16 items-center justify-center rounded-2xl bg-muted/60 p-2 shadow-xs border border-border">
            <Image
              src="/brand-icon.png"
              alt="Ebener TKD"
              width={56}
              height={56}
              className="size-14 object-contain"
              unoptimized
            />
          </div>
          <DialogTitle className="text-xl font-bold">
            Instalar Ebener TKD
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Acesse seus treinos, graduações e avisos direto da tela inicial, com abertura rápida e em tela cheia.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {isStandalone ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" />
              <p className="text-sm font-medium">
                O aplicativo já está instalado e rodando na tela de início do seu aparelho!
              </p>
            </div>
          ) : isIos ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Como instalar no iPhone / iPad (Safari)
              </p>
              <ol className="space-y-3 text-sm text-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    1
                  </span>
                  <span>
                    Toque no botão <strong>Compartilhar</strong> (
                    <Share className="inline size-4 text-primary align-sub" />
                    ) na barra inferior do Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    2
                  </span>
                  <span>
                    Role a lista de opções para baixo e selecione{" "}
                    <strong>Adicionar à Tela de Início</strong> (
                    <PlusSquare className="inline size-4 text-primary align-sub" />
                    ).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    3
                  </span>
                  <span>
                    Toque em <strong>Adicionar</strong> no canto superior direito para finalizar.
                  </span>
                </li>
              </ol>
            </div>
          ) : hasNativePrompt ? (
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full h-11 text-base font-semibold shadow-sm"
                onClick={handleInstallClick}
              >
                <Download className="mr-2 size-5" />
                Instalar Aplicativo Agora
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                O aplicativo será adicionado à sua tela de início sem ocupar espaço na memória.
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Smartphone className="size-4 text-primary" />
                <span>Instalar pelo navegador</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Abra o menu de opções do navegador (os <strong>três pontinhos ⋮</strong> no canto superior) e clique em{" "}
                <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
