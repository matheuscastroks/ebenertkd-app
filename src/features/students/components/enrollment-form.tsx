"use client";

import { useEffect, useRef, useState } from "react";
import { saveEnrollmentDraftAction, submitEnrollmentAction } from "@/app/actions/enrollment";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrainingClass } from "@/features/classes/types";
import type { EnrollmentBundle } from "@/features/students/types";
import { formatAddress } from "@/lib/address";
import { EnrollmentStepper, type EnrollmentStep } from "./enrollment-stepper";
import { PersonalEnrollmentStep, HealthEnrollmentStep, TrainingEnrollmentStep, DocumentsEnrollmentStep } from "./enrollment-steps";
import { useEnrollmentDraft } from "./use-enrollment-draft";

type Feedback = { tone: "success" | "error" | "info" | "warning"; title: string };
const stepComponents = [PersonalEnrollmentStep, HealthEnrollmentStep, TrainingEnrollmentStep, DocumentsEnrollmentStep];
const initialSteps: EnrollmentStep[] = [
  { id: "pessoais", title: "Dados pessoais", isValid: false },
  { id: "saude", title: "Saúde", isValid: false },
  { id: "treino", title: "Treino", isValid: false },
  { id: "documentos", title: "Documentos", isValid: false },
];

export function EnrollmentForm({ bundle, targetProfileId, classes, message, feedback }: {
  bundle: EnrollmentBundle; targetProfileId: string; classes: TrainingClass[]; message?: string; feedback?: Feedback | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useEnrollmentDraft(`${targetProfileId}:${bundle.enrollment.$id}:${bundle.enrollment.revision}`);
  const [current, setCurrent] = useState(0);
  const [steps, setSteps] = useState(initialSteps);
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
      } catch { /* Sem armazenamento disponível. */ }
    }
  }, [success, targetProfileId, bundle.enrollment.$id, bundle.enrollment.revision]);

  const stored = success ? {} : draft.values;
  const restoredBundle: EnrollmentBundle = {
    ...bundle,
    student: { ...bundle.student, ...stored,
      ...(stored.gub !== undefined ? { gub: stored.gub === "" ? null : Number(stored.gub) } : {}),
      ...(stored.address_street !== undefined ? { address: formatAddress({ street: stored.address_street, number: stored.address_number ?? "", complement: stored.address_complement ?? "", neighborhood: stored.address_neighborhood ?? "", city: stored.address_city ?? "", state: stored.address_state ?? "", cep: stored.address_cep ?? "" }) } : {}),
    },
    enrollment: { ...bundle.enrollment, ...(stored.requested_due_day !== undefined ? { requested_due_day: stored.requested_due_day === "" ? null : Number(stored.requested_due_day) } : {}) },
  } as EnrollmentBundle;

  const validateStep = (index: number, report: boolean) => {
    const fieldset = formRef.current?.querySelector<HTMLFieldSetElement>(`fieldset[data-step="${index}"]`);
    const invalid = Array.from(fieldset?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea") ?? []).find((input) => !input.disabled && !input.checkValidity());
    const data = formRef.current ? new FormData(formRef.current) : new FormData();
    const missingDate = index === 0 && !data.get("birth_date") ? "enrollment-birth-date" : index === 2 && !data.get("started_at_tkd") ? "enrollment-tkd-start" : null;
    const isValid = !invalid && !missingDate;
    setSteps((previous) => previous.map((step, i) => i === index ? { ...step, isValid } : step));
    if (!isValid && report) {
      setError("Confira os campos obrigatórios deste passo.");
      setCurrent(index);
      invalid?.setAttribute("aria-invalid", "true");
      invalid?.setAttribute("aria-describedby", "enrollment-validation-error");
      requestAnimationFrame(() => { if (missingDate) document.getElementById(missingDate)?.focus(); else { invalid?.focus(); invalid?.reportValidity(); } });
    }
    return isValid;
  };
  const saveLocal = (changed: Record<string, string> = {}) => {
    if (!formRef.current) return;
    const values: Record<string, string> = {};
    new FormData(formRef.current).forEach((value, key) => { if (typeof value === "string") values[key] = value; });
    draft.save({ ...values, ...changed });
  };
  const notice = feedback ?? (message ? { tone: "info" as const, title: message } : null);
  if (!draft.ready) return <Skeleton className="h-48 w-full" aria-label="Carregando matrícula" />;
  return <div className="space-y-4">
    <h2 className="text-base font-semibold">Ficha de matrícula</h2>
    {notice ? <OperationToast tone={notice.tone} title={notice.title} clearParams={["saved", "submitted", "error"]} /> : null}
    {feedback?.tone === "error" ? <Alert variant="destructive"><AlertDescription>{feedback.title}</AlertDescription></Alert> : null}
    <EnrollmentStepper current={current} steps={steps} />
    <p className="text-sm text-muted-foreground">{draft.saved && !success ? "Rascunho salvo" : "Preencha os dados para continuar."} Os arquivos precisam ser selecionados novamente após recarregar.</p>
    {error ? <Alert id="enrollment-validation-error" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <form ref={formRef} noValidate className="space-y-4" onChange={() => saveLocal()} onBlur={(event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) target.setAttribute("aria-invalid", String(!target.checkValidity()));
      validateStep(current, false);
      saveLocal();
    }} onSubmit={(event) => {
      const button = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      if (button?.formNoValidate) return;
      for (let i = 0; i < steps.length; i++) {
        if (!validateStep(i, true)) { event.preventDefault(); return; }
      }
      setError("");
    }}>
      <input type="hidden" name="target_profile_id" value={targetProfileId} />
      {stepComponents.map((Step, index) => <fieldset key={initialSteps[index].id} data-step={index} hidden={index !== current} className="space-y-4"><legend className="sr-only">{initialSteps[index].title}</legend><Step bundle={restoredBundle} classes={classes} onValueChange={(name, value) => saveLocal({ [name]: value })} /></fieldset>)}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" className="min-h-11" disabled={current === 0} onClick={() => { setError(""); setCurrent(current - 1); }}>Voltar</Button>
        {current < 3 ? <Button type="button" className="min-h-11" onClick={() => { saveLocal(); if (validateStep(current, true)) { setError(""); setCurrent(current + 1); } }}>Avançar</Button> : <FormSubmitButton className="min-h-11" formAction={bundle.enrollment.status === "draft" ? submitEnrollmentAction : saveEnrollmentDraftAction} pendingLabel="Enviando…">{bundle.enrollment.status === "draft" ? "Enviar para análise" : "Salvar alterações"}</FormSubmitButton>}
        <FormSubmitButton className="min-h-11" variant="outline" formAction={saveEnrollmentDraftAction} formNoValidate pendingLabel="Salvando…">Salvar rascunho</FormSubmitButton>
      </div>
    </form>
  </div>;
}
