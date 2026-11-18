"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "@/components/ui/icons";
import { saveEnrollmentDraftAction, submitEnrollmentAction } from "@/app/actions/enrollment";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrainingClass } from "@/features/classes/types";
import type { EnrollmentBundle } from "@/features/students/types";
import { formatAddress } from "@/lib/address";
import { EnrollmentStatusView } from "./enrollment-status-view";
import { EnrollmentStepper, type EnrollmentStep } from "./enrollment-stepper";
import {
  PersonalEnrollmentStep,
  HealthEnrollmentStep,
  TrainingEnrollmentStep,
  DocumentsEnrollmentStep,
} from "./enrollment-steps";
import { useEnrollmentDraft } from "./use-enrollment-draft";

type Feedback = { tone: "success" | "error" | "info" | "warning"; title: string };
const stepComponents = [
  PersonalEnrollmentStep,
  HealthEnrollmentStep,
  TrainingEnrollmentStep,
  DocumentsEnrollmentStep,
];
const initialSteps: EnrollmentStep[] = [
  { id: "pessoais", title: "Dados pessoais", isValid: false },
  { id: "saude", title: "Saúde", isValid: false },
  { id: "treino", title: "Treino", isValid: false },
  { id: "documentos", title: "Documentos", isValid: false },
];

export function EnrollmentForm({
  bundle,
  targetProfileId,
  classes,
  contractsHref,
  message,
  feedback,
}: {
  bundle: EnrollmentBundle;
  targetProfileId: string;
  classes: TrainingClass[];
  contractsHref?: string;
  message?: string;
  feedback?: Feedback | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const isDraft = bundle.enrollment.status === "draft";
  const draft = useEnrollmentDraft(
    `${targetProfileId}:${bundle.enrollment.$id}:${bundle.enrollment.revision}`
  );
  const [isEditing, setIsEditing] = useState(
    () => isDraft || feedback?.tone === "error"
  );
  const [current, setCurrent] = useState(0);
  const [steps, setSteps] = useState<EnrollmentStep[]>(() =>
    initialSteps.map((step) => ({ ...step, isValid: !isDraft }))
  );
  const [error, setError] = useState("");
  const success = feedback?.tone === "success";

  useEffect(() => {
    if (success) {
      try {
        const prefix = `enrollment-draft:${targetProfileId}:${bundle.enrollment.$id}:`;
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) localStorage.removeItem(key);
        }
      } catch {
        /* Sem armazenamento disponível. */
      }
    }
  }, [success, targetProfileId, bundle.enrollment.$id, bundle.enrollment.revision]);

  const stored = success ? {} : draft.values;
  const restoredBundle: EnrollmentBundle = {
    ...bundle,
    student: {
      ...bundle.student,
      ...stored,
      ...(stored.gub !== undefined
        ? { gub: stored.gub === "" ? null : Number(stored.gub) }
        : {}),
      ...(stored.address_street !== undefined
        ? {
            address: formatAddress({
              street: stored.address_street,
              number: stored.address_number ?? "",
              complement: stored.address_complement ?? "",
              neighborhood: stored.address_neighborhood ?? "",
              city: stored.address_city ?? "",
              state: stored.address_state ?? "",
              cep: stored.address_cep ?? "",
            }),
          }
        : {}),
    },
    enrollment: {
      ...bundle.enrollment,
      ...(stored.requested_due_day !== undefined
        ? {
            requested_due_day:
              stored.requested_due_day === "" ? null : Number(stored.requested_due_day),
          }
        : {}),
    },
  } as EnrollmentBundle;

  const validateStep = (index: number, report: boolean) => {
    const fieldset = formRef.current?.querySelector<HTMLFieldSetElement>(
      `fieldset[data-step="${index}"]`
    );
    const invalid = Array.from(
      fieldset?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea") ?? []
    ).find((input) => !input.disabled && !input.checkValidity());
    const data = formRef.current ? new FormData(formRef.current) : new FormData();
    const missingDate =
      index === 0 && !data.get("birth_date")
        ? "enrollment-birth-date"
        : index === 2 && !data.get("started_at_tkd")
          ? "enrollment-tkd-start"
          : null;
    const isValid = !invalid && !missingDate;
    setSteps((previous) =>
      previous.map((step, i) => (i === index ? { ...step, isValid } : step))
    );
    if (!isValid && report) {
      setError("Confira os campos obrigatórios deste passo.");
      setCurrent(index);
      invalid?.setAttribute("aria-invalid", "true");
      invalid?.setAttribute("aria-describedby", "enrollment-validation-error");
      requestAnimationFrame(() => {
        if (missingDate) document.getElementById(missingDate)?.focus();
        else {
          invalid?.focus();
          invalid?.reportValidity();
        }
      });
    }
    return isValid;
  };

  const saveLocal = (changed: Record<string, string> = {}) => {
    if (!formRef.current) return;
    const values: Record<string, string> = {};
    new FormData(formRef.current).forEach((value, key) => {
      if (typeof value === "string") values[key] = value;
    });
    draft.save({ ...values, ...changed });
  };

  const handleSelectStep = (targetIndex: number) => {
    if (targetIndex === current) return;
    saveLocal();
    if (!isDraft || targetIndex < current) {
      setError("");
      setCurrent(targetIndex);
      return;
    }
    if (validateStep(current, true)) {
      setError("");
      setCurrent(targetIndex);
    }
  };

  const notice =
    feedback ?? (message ? { tone: "info" as const, title: message } : null);

  if (!isDraft && !isEditing) {
    return (
      <div className="space-y-4">
        {notice ? (
          <OperationToast
            tone={notice.tone}
            title={notice.title}
            clearParams={["saved", "submitted", "error"]}
          />
        ) : null}
        <EnrollmentStatusView
          bundle={bundle}
          classes={classes}
          contractsHref={contractsHref}
          onEdit={(step = 0) => {
            setError("");
            setCurrent(step);
            setIsEditing(true);
          }}
        />
      </div>
    );
  }

  if (!draft.ready) {
    return <Skeleton className="h-72 w-full rounded-xl" aria-label="Carregando matrícula" />;
  }

  const statusHint =
    draft.saved && !success
      ? "Rascunho salvo automaticamente"
      : isDraft
        ? "Preencha por etapa"
        : "Alterações atualizam sua ficha";

  return (
    <div className="space-y-3">
      {notice ? (
        <OperationToast
          tone={notice.tone}
          title={notice.title}
          clearParams={["saved", "submitted", "error"]}
        />
      ) : null}
      {feedback?.tone === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{feedback.title}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert id="enrollment-validation-error" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="space-y-3 border-b border-border bg-muted/20 px-5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {isDraft ? "Ficha de matrícula" : "Atualizar ficha de matrícula"}
            </h2>
            {!isDraft ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setError("");
                  setIsEditing(false);
                }}
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Voltar ao resumo
              </Button>
            ) : null}
          </div>

          <EnrollmentStepper
            current={current}
            steps={steps}
            statusHint={statusHint}
            allowFreeNavigation={!isDraft}
            onSelectStep={handleSelectStep}
          />
        </div>

        <form
          ref={formRef}
          noValidate
          onChange={() => saveLocal()}
          onBlur={(event) => {
            const target = event.target;
            if (
              target instanceof HTMLInputElement ||
              target instanceof HTMLSelectElement ||
              target instanceof HTMLTextAreaElement
            ) {
              target.setAttribute("aria-invalid", String(!target.checkValidity()));
            }
            validateStep(current, false);
            saveLocal();
          }}
          onSubmit={(event) => {
            const button = (event.nativeEvent as SubmitEvent)
              .submitter as HTMLButtonElement | null;
            if (button?.formNoValidate) return;
            for (let i = 0; i < steps.length; i++) {
              if (!validateStep(i, true)) {
                event.preventDefault();
                return;
              }
            }
            setError("");
          }}
        >
          <input type="hidden" name="target_profile_id" value={targetProfileId} />

          <div className="px-5 py-4">
            {stepComponents.map((Step, index) => (
              <fieldset
                key={initialSteps[index].id}
                data-step={index}
                hidden={index !== current}
                className="min-w-0"
              >
                <legend className="sr-only">{initialSteps[index].title}</legend>
                <Step
                  bundle={restoredBundle}
                  classes={classes}
                  onValueChange={(name, value) => saveLocal({ [name]: value })}
                />
              </fieldset>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-10"
                disabled={current === 0}
                onClick={() => {
                  setError("");
                  setCurrent(current - 1);
                }}
              >
                Voltar
              </Button>
              {isDraft ? (
                <FormSubmitButton
                  className="min-h-10"
                  variant="outline"
                  formAction={saveEnrollmentDraftAction}
                  formNoValidate
                  pendingLabel="Salvando…"
                >
                  Salvar rascunho
                </FormSubmitButton>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {current < 3 ? (
                <Button
                  type="button"
                  variant={isDraft ? "default" : "outline"}
                  className="min-h-10"
                  onClick={() => {
                    saveLocal();
                    if (validateStep(current, true)) {
                      setError("");
                      setCurrent(current + 1);
                    }
                  }}
                >
                  Avançar
                </Button>
              ) : null}

              {!isDraft || current === 3 ? (
                <FormSubmitButton
                  className="min-h-10"
                  formAction={
                    isDraft ? submitEnrollmentAction : saveEnrollmentDraftAction
                  }
                  pendingLabel="Enviando…"
                >
                  {isDraft ? "Enviar para análise" : "Salvar alterações"}
                </FormSubmitButton>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
