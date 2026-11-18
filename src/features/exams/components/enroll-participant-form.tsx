"use client";

import { useId, useMemo, useState } from "react";
import { addExamParticipantAction } from "@/app/actions/exams";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlusIcon } from "@/components/ui/user-plus";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { beltForGub, GUB_BELT_OPTIONS } from "@/features/students/options";

type TargetGraduationOption = {
  gub: number;
  belt: string;
  label: string;
};

export function EnrollParticipantForm({
  eventId,
  studentId,
  currentBelt,
  currentGub,
  defaultFeeReais,
}: {
  eventId: string;
  studentId: string;
  currentBelt?: string | null;
  currentGub: number;
  defaultFeeReais: string;
}) {
  const formId = useId();
  const targetOptions = useMemo<TargetGraduationOption[]>(() => {
    const higherGubs = GUB_BELT_OPTIONS.filter((opt) => opt.gub < currentGub)
      .map((opt) => ({
        gub: opt.gub,
        belt: opt.belt,
        label: `${opt.belt} (${opt.gub}º GUB)`,
      }))
      .sort((a, b) => b.gub - a.gub);

    return [
      ...higherGubs,
      { gub: 0, belt: "Preta", label: "Preta (1º Dan)" },
    ];
  }, [currentGub]);

  const [selectedGub, setSelectedGub] = useState<number>(
    currentGub > 0 ? currentGub - 1 : 0
  );
  const selectedBelt = beltForGub(selectedGub) ?? "Branca";

  const targetFieldId = `${formId}-target-gub`;
  const feeFieldId = `${formId}-fee`;

  return (
    <form action={addExamParticipantAction} className="space-y-4 pt-2">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="target_gub" value={selectedGub} />
      <input type="hidden" name="target_belt" value={selectedBelt} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Atual:</span>
          <BeltBadge belt={currentBelt} gub={currentGub} size="sm" />
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowRightIcon
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <BeltBadge belt={selectedBelt} gub={selectedGub} size="sm" />
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor={targetFieldId}>Graduação pretendida</FieldLabel>
        <Select
          value={String(selectedGub)}
          onValueChange={(value) => setSelectedGub(Number(value))}
        >
          <SelectTrigger id={targetFieldId} className="min-h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {targetOptions.map((option) => (
              <SelectItem key={option.gub} value={String(option.gub)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={feeFieldId}>
          Taxa individual do exame (R$)
        </FieldLabel>
        <Input
          id={feeFieldId}
          name="fee_reais"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          defaultValue={defaultFeeReais}
          required
          className="h-11 tabular-nums"
        />
        <FieldDescription>Vence na data do exame.</FieldDescription>
      </Field>

      <FormSubmitButton
        className="min-h-11 w-full"
        pendingLabel="Inscrevendo aluno…"
      >
        <UserPlusIcon className="size-4" aria-hidden="true" />
        Confirmar inscrição no exame
      </FormSubmitButton>
    </form>
  );
}
