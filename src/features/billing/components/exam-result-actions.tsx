import { recordExamResultAction } from "@/app/actions/exams";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/check";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { XIcon } from "@/components/ui/x";
import { formatBrl } from "@/lib/money";

export function ExamResultActions({
  participantId,
  eventId,
  name,
  currentName,
  targetName,
  feeCents,
}: {
  participantId: string;
  eventId: string;
  name: string;
  currentName: string;
  targetName: string;
  feeCents: number;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {(
        [
          {
            result: "approved",
            label: "Aprovar",
            className:
              "bg-success-soft text-success-foreground hover:bg-success-soft hover:text-success-foreground",
            effect: `Muda a faixa de ${currentName} para ${targetName}. O resultado será publicado no portal do aluno.`,
          },
          {
            result: "failed",
            label: "Reprovar",
            className: "text-destructive hover:text-destructive",
            effect:
              "Registra reprovação. A faixa atual será mantida e o resultado ficará visível no portal.",
          },
          {
            result: "absent",
            label: "Ausente",
            className: "text-muted-foreground hover:text-foreground",
            effect: "Registra ausência. A faixa atual será mantida.",
          },
        ] as const
      ).map(({ result, label, className, effect }) => (
        <ResponsiveDialog
          key={result}
          trigger={
            <Button
              type="button"
              variant="outline"
              className={`h-11 px-3 text-sm font-medium sm:h-9 ${className}`}
            >
              {result === "approved" ? (
                <CheckIcon className="size-3.5" aria-hidden="true" />
              ) : result === "failed" ? (
                <XIcon className="size-3.5" aria-hidden="true" />
              ) : null}
              {label}
            </Button>
          }
          title={`${label}: ${name}?`}
          description={effect}
        >
          <dl className="grid grid-cols-1 gap-2 border-b border-border pb-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Aluno</dt>
              <dd className="font-medium text-foreground">{name}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Faixa atual</dt>
              <dd className="font-medium text-foreground">{currentName}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Faixa pretendida</dt>
              <dd className="font-medium text-foreground">{targetName}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Taxa do exame</dt>
              <dd className="font-medium tabular-nums text-foreground">
                {formatBrl(feeCents)}
              </dd>
            </div>
          </dl>

          <form action={recordExamResultAction} className="space-y-4 pt-4">
            <input type="hidden" name="participant_id" value={participantId} />
            <input type="hidden" name="event_id" value={eventId} />
            <input type="hidden" name="result" value={result} />

            <Field>
              <FieldLabel htmlFor={`exam-notes-${participantId}-${result}`}>
                Parecer da banca (opcional)
              </FieldLabel>
              <Input
                id={`exam-notes-${participantId}-${result}`}
                name="notes"
                placeholder="Ex.: Poomsae e lutas aprovados com destaque"
                className="h-11"
              />
            </Field>

            <FormSubmitButton
              variant={result === "failed" ? "destructive" : "default"}
              className="min-h-11 w-full"
              pendingLabel="Registrando…"
            >
              {`Confirmar: ${label.toLowerCase()}`}
            </FormSubmitButton>
          </form>
        </ResponsiveDialog>
      ))}
    </div>
  );
}
