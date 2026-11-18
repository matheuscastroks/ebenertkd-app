"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resetOnboardingAction } from "@/app/actions/onboarding";
import { resolveDashboardPath, type AppRole } from "@/lib/auth/auth-utils";
import { toast } from "sonner";

/** Linha de configurações para rever a apresentação inicial. */
export function ReplayOnboardingCard({ role }: { role: AppRole }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleReplay = () => {
    startTransition(async () => {
      const res = await resetOnboardingAction();
      if (res?.error) {
        toast.error("Não foi possível abrir a apresentação. Tente de novo.");
        return;
      }
      router.push(`${resolveDashboardPath(role)}?onboarding=true`);
    });
  };

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">Apresentação do aplicativo</p>
        <p className="text-sm text-muted-foreground">Rever o guia de primeiros passos.</p>
      </div>
      <Button type="button" variant="outline" onClick={handleReplay} disabled={isPending} className="min-h-11 shrink-0">
        {isPending ? "Abrindo…" : "Rever apresentação"}
      </Button>
    </div>
  );
}
