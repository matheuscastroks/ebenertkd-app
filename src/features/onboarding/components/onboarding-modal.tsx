"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAcademyBrand, useProfessorLabel } from "@/components/academy-config-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  saveOnboardingAction,
  skipOnboardingAction,
} from "@/app/actions/onboarding";
import {
  ONBOARDING_CONFIGS,
  personalizeOnboardingConfig,
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
  const brand = useAcademyBrand();
  const professor = useProfessorLabel();
  const config = personalizeOnboardingConfig(ONBOARDING_CONFIGS[role] ?? ONBOARDING_CONFIGS.adult_student, { shortName: brand.shortName, professorLabel: professor });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preferences, setPreferences] = useState<OnboardingPreferences>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

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

  const persist = (skip: boolean) => {
    setError("");
    startTransition(async () => {
      try {
        const result = skip ? await skipOnboardingAction() : await saveOnboardingAction(preferences);
        if (!result.success) {
          setError("Não foi possível salvar. Tente novamente.");
          return;
        }
        onClose();
        router.refresh();
      } catch {
        setError("Não foi possível salvar. Tente novamente.");
      }
    });
  };
  const handleSkip = () => persist(true);
  const handleComplete = () => persist(false);

  const stepLabels: Record<1 | 2 | 3, string> = {
    1: "Boas-vindas",
    2: "Personalização",
    3: "Notificações",
  };

  const progressPercentage = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isPending) { if (step === 1) handleSkip(); else handleBack(); } }}>
      <DialogContent
        className="max-w-xl gap-0 overflow-hidden rounded-2xl border border-border p-0 shadow-md"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Introdução ao aplicativo {brand.shortName}</DialogTitle>
        <DialogDescription className="sr-only">
          Guia de primeiros passos para configurar sua experiência de treino e gestão.
        </DialogDescription>

        {/* Top Header com Progresso & Pular */}
        <div className="border-b border-border px-6 pt-5 pb-3">
          <div className="flex items-center justify-between gap-4">
            <span aria-live="polite" className="text-sm font-semibold text-muted-foreground">
              Passo {step} de 3 · {stepLabels[step]}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isPending}
              className="h-11 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <span>Pular apresentação</span>
              <X className="size-3.5 ml-1" />
            </Button>
          </div>

          {/* Barra de Progresso Linear */}
          <Progress className="mt-3" value={progressPercentage} aria-valuenow={progressPercentage} aria-label={`Passo ${step} de 3`} />
        </div>

        {error ? <Alert role="alert" variant="destructive" className="mx-6 w-auto"><AlertDescription>{error}</AlertDescription></Alert> : null}

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
              pending={isPending}
              onComplete={handleComplete}
            />
          )}
        </div>

        {/* Rodapé de Navegação */}
        {step < 3 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isPending}
                className="h-11 gap-1.5"
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
              className="h-11 gap-1.5"
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
