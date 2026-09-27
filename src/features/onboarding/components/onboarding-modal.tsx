"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  saveOnboardingAction,
  skipOnboardingAction,
} from "@/app/actions/onboarding";
import {
  ONBOARDING_CONFIGS,
  type OnboardingPreferences,
  type OnboardingRole,
} from "../types";
import { OnboardingWelcomeStep } from "./onboarding-welcome-step";
import { OnboardingPreferencesStep } from "./onboarding-preferences-step";
import { OnboardingPermissionStep } from "./onboarding-permission-step";

export function OnboardingModal({
  role,
  userName,
  isOpen,
  onClose,
}: {
  role: OnboardingRole;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const config = ONBOARDING_CONFIGS[role] ?? ONBOARDING_CONFIGS.adult_student;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preferences, setPreferences] = useState<OnboardingPreferences>({});
  const [isPending, startTransition] = useTransition();

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as 2 | 3);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2);
    }
  };

  const handleSkip = () => {
    startTransition(async () => {
      await skipOnboardingAction();
      onClose();
      router.refresh();
    });
  };

  const handleComplete = () => {
    startTransition(async () => {
      await saveOnboardingAction(preferences);
      onClose();
      router.refresh();
    });
  };

  const stepLabels: Record<1 | 2 | 3, string> = {
    1: "Boas-vindas",
    2: "Personalização",
    3: "Alertas & Notificações",
  };

  const progressPercentage = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent
        className="max-w-xl p-0 overflow-hidden border border-border shadow-2xl rounded-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Introdução ao aplicativo Ebener TKD</DialogTitle>
        <DialogDescription className="sr-only">
          Guia de primeiros passos para configurar sua experiência de treino e gestão.
        </DialogDescription>

        {/* Top Header com Progresso & Pular */}
        <div className="border-b border-border/60 bg-muted/30 px-6 pt-5 pb-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Passo {step} de 3 · {stepLabels[step]}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isPending}
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <span>Pular apresentação</span>
              <X className="size-3.5 ml-1" />
            </Button>
          </div>

          {/* Barra de Progresso Linear */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Corpo do Passo Atual */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <OnboardingWelcomeStep config={config} userName={userName} />
          )}

          {step === 2 && (
            <OnboardingPreferencesStep
              questions={config.questions}
              preferences={preferences}
              onChange={handlePreferenceChange}
            />
          )}

          {step === 3 && (
            <OnboardingPermissionStep
              config={config}
              onComplete={handleComplete}
            />
          )}
        </div>

        {/* Rodapé de Navegação */}
        {step < 3 && (
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-4">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isPending}
                className="gap-1.5"
              >
                <ArrowLeft className="size-3.5" />
                <span>Voltar</span>
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              disabled={isPending}
              className="gap-1.5 font-semibold"
            >
              <span>Continuar</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
