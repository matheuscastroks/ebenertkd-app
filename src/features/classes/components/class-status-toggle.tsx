"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { setTrainingClassStatusAction } from "@/app/actions/training-classes";
import { Switch } from "@/components/ui/switch";

export function ClassStatusToggle({ classId, active }: { classId: string; active: boolean }) {
  const [confirmed, setConfirmed] = useState({ source: active, value: active });
  if (confirmed.source !== active) setConfirmed({ source: active, value: active });
  const [optimistic, setOptimistic] = useOptimistic(confirmed.value);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({});
  return <div className="min-h-11 flex flex-wrap items-center gap-2">
    <Switch checked={optimistic} disabled={pending} aria-label={optimistic ? "Desativar turma" : "Ativar turma"} className="before:absolute before:-inset-y-3 before:inset-x-0" onCheckedChange={(next) => {
      startTransition(async () => {
        setOptimistic(next);
        setFeedback({});
        const data = new FormData();
        data.set("class_id", classId);
        data.set("status", next ? "active" : "inactive");
        try {
          const result = await setTrainingClassStatusAction(data);
          if (!result.success) { setFeedback({ error: result.error }); return; }
          setConfirmed({ source: active, value: next });
          const message = next ? "Turma ativada" : "Turma pausada. Não aparece na matrícula.";
          setFeedback({ message });
          toast.success(next ? "Turma ativada" : "Turma pausada", { description: next ? undefined : "Não aparece na matrícula." });
        } catch {
          setFeedback({ error: "Não foi possível alterar a turma. Tente novamente." });
        }
      });
    }} />
    {feedback.error ? <span role="alert" className="text-sm text-destructive">{feedback.error}</span> : null}
    {feedback.message ? <span role="status" className="sr-only">{feedback.message}</span> : null}
  </div>;
}
