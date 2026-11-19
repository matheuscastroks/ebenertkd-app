"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { AcademySaveResult } from "@/app/actions/academy-settings";

const CONFLICT_MESSAGE = "Outra alteração foi salva antes da sua. Recarregue a página para ver os valores atuais.";

/**
 * Envia um formulário de configuração, mostra o retorno em toast e guarda a nova revisão
 * (concorrência otimista). `fieldErrors` traz as mensagens por campo quando a validação falha.
 */
export function useConfigSave(initialRevision: number, action: (formData: FormData) => Promise<AcademySaveResult>, successMessage: string) {
  const router = useRouter();
  const [revision, setRevision] = useState(initialRevision);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const save = useCallback(
    async (formData: FormData) => {
      let result: AcademySaveResult;
      try {
        result = await action(formData);
      } catch {
        result = { ok: false, error: "failed" };
      }
      if (result.ok) {
        setRevision(result.revision);
        setFieldErrors({});
        toast.success(successMessage);
        router.refresh();
        return;
      }
      setFieldErrors(result.fields ?? {});
      if (result.error === "revision_conflict") toast.error("Não foi possível salvar", { description: CONFLICT_MESSAGE });
      else if (result.error === "invalid") toast.error("Confira os campos", { description: Object.values(result.fields ?? {})[0] ?? "Há valores inválidos no formulário." });
      else toast.error("Não foi possível salvar", { description: "Tente novamente em instantes." });
    },
    [action, router, successMessage]
  );

  return { revision, save, fieldErrors };
}
