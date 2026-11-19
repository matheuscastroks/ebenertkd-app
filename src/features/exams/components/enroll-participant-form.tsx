"use client";

import { useId, useMemo, useState } from "react";
import { addExamParticipantAction } from "@/app/actions/exams";
import { useBeltRanks } from "@/components/academy-config-provider";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UserPlusIcon } from "@/components/ui/user-plus";
import { examTargetRanks } from "@/features/academy/belt-rules";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { RankSelect } from "@/features/students/components/rank-select";

export function EnrollParticipantForm({
  eventId,
  studentId,
  currentRankKey,
  allowSkipGrades = true,
  defaultFeeReais,
  rankFeesReais = {},
}: {
  eventId: string;
  studentId: string;
  currentRankKey?: string | null;
  /** Política de exame: permite inscrever para qualquer graduação acima ou só para a próxima. */
  allowSkipGrades?: boolean;
  defaultFeeReais: string;
  /** Taxa por graduação alvo (R$), quando a academia definiu uma. Tem prioridade sobre a taxa da banca. */
  rankFeesReais?: Record<string, string>;
}) {
  const formId = useId();
  const ranks = useBeltRanks();
  const targetOptions = useMemo(() => examTargetRanks(ranks, currentRankKey, allowSkipGrades), [ranks, currentRankKey, allowSkipGrades]);

  const [selected, setSelected] = useState<string>(targetOptions[0]?.rank_key ?? "");
  const [fee, setFee] = useState(rankFeesReais[targetOptions[0]?.rank_key ?? ""] ?? defaultFeeReais);

  const targetFieldId = `${formId}-target-rank`;
  const feeFieldId = `${formId}-fee`;

  const changeTarget = (value: string) => {
    setSelected(value);
    setFee(rankFeesReais[value] ?? defaultFeeReais);
  };

  return (
    <form action={addExamParticipantAction} className="space-y-4 pt-2">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="student_id" value={studentId} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Atual:</span>
          <BeltBadge rankKey={currentRankKey} size="sm" />
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <BeltBadge rankKey={selected} size="sm" />
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor={targetFieldId}>Graduação pretendida</FieldLabel>
        <RankSelect
          id={targetFieldId}
          name="target_rank_key"
          value={selected}
          onValueChange={changeTarget}
          options={targetOptions}
          className="min-h-11"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={feeFieldId}>Taxa individual do exame (R$)</FieldLabel>
        <Input
          id={feeFieldId}
          name="fee_reais"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={fee}
          onChange={(event) => setFee(event.target.value)}
          required
          className="h-11 tabular-nums"
        />
        <FieldDescription>Vence na data do exame.</FieldDescription>
      </Field>

      <FormSubmitButton className="min-h-11 w-full" pendingLabel="Inscrevendo aluno…">
        <UserPlusIcon className="size-4" aria-hidden="true" />
        Confirmar inscrição no exame
      </FormSubmitButton>
    </form>
  );
}
