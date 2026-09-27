"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetOnboardingAction } from "@/app/actions/onboarding";
import { resolveDashboardPath, type AppRole } from "@/lib/auth/auth-utils";
import { toast } from "sonner";

export function ReplayOnboardingCard({ role }: { role: AppRole }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleReplay = () => {
    startTransition(async () => {
      const res = await resetOnboardingAction();
      if (res?.error) {
        toast.error("Não foi possível reiniciar a apresentação.");
        return;
      }
      toast.success("Apresentação reiniciada!");
      const targetPath = `${resolveDashboardPath(role)}?onboarding=true`;
      router.push(targetPath);
    });
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Introdução ao Aplicativo</CardTitle>
            <CardDescription className="text-xs">
              Reveja o guia de primeiros passos e redefina suas preferências de uso.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 border-t border-border/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Deseja abrir novamente a apresentação guiada com as novidades da academia?
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReplay}
            disabled={isPending}
            className="shrink-0 gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            <span>{isPending ? "Reiniciando..." : "Repetir apresentação"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
