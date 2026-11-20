import Link from "next/link";
import { updateWeightAction, uploadRegistrationDocumentAction } from "@/app/actions/championships";
import { confirmInterestAction } from "@/app/actions/events";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatWeightKg } from "@/features/events/rules/eligibility-rules";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from "@/features/events/rules/readiness-rules";
import type { StudentEventEntry } from "@/features/events/student-events-service";
import { formatEventDay } from "@/features/events/dates";
import type { EventDeadline, EventMedal } from "@/features/events/types";
import { sortDeadlines, deadlineState } from "@/features/events/rules/deadline-rules";

type Viewer = { kind: "self" } | { kind: "guardian"; dependentName: string } | { kind: "minor" };

const MEDAL_LABEL: Record<EventMedal, string> = { gold: "Medalha de ouro", silver: "Medalha de prata", bronze: "Medalha de bronze", none: "Participação" };

const STEPS = [
  { key: "interest", label: "Interesse" },
  { key: "team", label: "Na equipe" },
  { key: "federation", label: "Enviado à federação" }
] as const;

function currentStep(entry: StudentEventEntry) {
  if (entry.registration.external_submitted_at) return 2;
  if (["confirmed", "checked_in", "completed"].includes(entry.registration.status)) return 1;
  return 0;
}

/** Cronograma da federação para o aluno e o responsável. */
export function StudentDeadlineList({ deadlines }: { deadlines: EventDeadline[] }) {
  if (!deadlines.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground" aria-label="Prazos da federação">
      {sortDeadlines(deadlines).map((deadline) => (
        <li key={deadline.$id} className={deadlineState(deadline) === "passed" ? "line-through" : undefined}>
          {deadline.label}: <span className="tabular-nums">{formatEventDay(deadline.due_at)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Detalhes da inscrição em campeonato: etapas, pendências, peso, documentos e resultado.
 * O menor só acompanha; o responsável ou o aluno adulto autoriza, corrige o peso e envia documentos.
 */
export function ChampionshipEntryDetails({ entry, viewer, returnTo }: { entry: StudentEventEntry; viewer: Viewer; returnTo: string }) {
  const { registration, documents = [], result } = entry;
  const step = currentStep(entry);
  const active = ["interested", "pending_approval", "confirmed"].includes(registration.status);
  const canManage = viewer.kind !== "minor" && active;
  const needsAuthorization = viewer.kind === "guardian" && registration.status === "interested" && !registration.guardian_authorized_at;

  return (
    <div className="mt-2 space-y-3 border-t border-border pt-3 text-sm">
      <ol className="flex flex-wrap items-center gap-2" aria-label="Andamento da inscrição">
        {STEPS.map((item, index) => (
          <li key={item.key}>
            <StatusBadge tone={index < step ? "success" : index === step ? "info" : "neutral"} aria-current={index === step ? "step" : undefined}>
              {index + 1}. {item.label}
            </StatusBadge>
          </li>
        ))}
      </ol>

      {registration.declared_weight_grams ? (
        <p className="text-muted-foreground">
          Peso declarado: <span className="font-medium tabular-nums text-foreground">{formatWeightKg(registration.declared_weight_grams)}</span>
          {entry.weightLocked ? " · fechado para alterações" : ""}
        </p>
      ) : null}

      {needsAuthorization ? (
        <form action={confirmInterestAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="registration_id" value={registration.$id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <p className="text-muted-foreground">{viewer.kind === "guardian" ? `Autorize a participação de ${viewer.dependentName} e aceite o termo de responsabilidade.` : ""}</p>
          <FormSubmitButton size="sm" className="min-h-9" pendingLabel="Autorizando…">
            Autorizar participação
          </FormSubmitButton>
        </form>
      ) : null}
      {viewer.kind === "minor" && registration.status === "interested" && !registration.guardian_authorized_at ? <p className="text-muted-foreground">Aguardando a autorização do responsável.</p> : null}

      {canManage && !entry.weightLocked ? (
        <ResponsiveDialog trigger={<Button variant="outline" size="sm" className="min-h-9">Corrigir peso</Button>} title="Corrigir o peso" description="O novo peso precisa continuar dentro da categoria escolhida.">
          <form action={updateWeightAction} className="space-y-4 pt-2">
            <input type="hidden" name="registration_id" value={registration.$id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <Field>
              <FieldLabel htmlFor={`weight-edit-${registration.$id}`}>Peso (kg)</FieldLabel>
              <Input id={`weight-edit-${registration.$id}`} name="weight_kg" required inputMode="decimal" defaultValue={registration.declared_weight_grams ? String(registration.declared_weight_grams / 1000).replace(".", ",") : ""} className="h-11 tabular-nums" />
            </Field>
            <FormSubmitButton className="min-h-11 w-full" pendingLabel="Salvando…">
              Salvar peso
            </FormSubmitButton>
          </form>
        </ResponsiveDialog>
      ) : null}

      {viewer.kind !== "minor" ? (
        <div className="space-y-2">
          <p className="font-medium">Documentos</p>
          {documents.length ? (
            <ul className="space-y-1">
              {documents.map((document) => (
                <li key={document.$id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/api/event-documents/${document.$id}`} target="_blank" className="font-medium text-primary underline-offset-4 hover:underline">
                    {DOCUMENT_KIND_LABEL[document.kind]}
                  </Link>
                  <StatusBadge tone={document.status === "approved" ? "success" : document.status === "rejected" ? "danger" : "warning"}>{DOCUMENT_STATUS_LABEL[document.status]}</StatusBadge>
                  {document.rejection_reason ? <span className="text-muted-foreground">{document.rejection_reason}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nenhum documento enviado. Se a federação pedir a autorização ou o termo assinado, anexe aqui.</p>
          )}
          {canManage ? (
            <ResponsiveDialog trigger={<Button variant="outline" size="sm" className="min-h-9">Enviar documento</Button>} title="Enviar documento" description="Imagem (JPG, PNG, WebP) ou PDF de até 5 MB. O professor revisa antes de enviar à federação.">
              <form action={uploadRegistrationDocumentAction} className="space-y-4 pt-2">
                <input type="hidden" name="registration_id" value={registration.$id} />
                <input type="hidden" name="return_to" value={returnTo} />
                <Field>
                  <FieldLabel htmlFor={`doc-kind-${registration.$id}`}>Tipo</FieldLabel>
                  <Select name="kind" defaultValue={viewer.kind === "guardian" ? "guardian_authorization" : "medical"}>
                    <SelectTrigger id={`doc-kind-${registration.$id}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DOCUMENT_KIND_LABEL) as Array<keyof typeof DOCUMENT_KIND_LABEL>).map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {DOCUMENT_KIND_LABEL[kind]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`doc-file-${registration.$id}`}>Arquivo</FieldLabel>
                  <Input id={`doc-file-${registration.$id}`} name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="h-11" />
                </Field>
                <FormSubmitButton className="min-h-11 w-full" pendingLabel="Enviando…">
                  Enviar para revisão
                </FormSubmitButton>
              </form>
            </ResponsiveDialog>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <p className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={result.medal === "none" ? "neutral" : "success"}>{MEDAL_LABEL[result.medal]}</StatusBadge>
          {result.placement ? <span className="tabular-nums text-muted-foreground">{result.placement}º lugar</span> : null}
          {result.notes ? <span className="text-muted-foreground">{result.notes}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
