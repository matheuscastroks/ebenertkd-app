"use client";

import { useMemo, useState } from "react";
import { Check, CircleSlash2, ShieldCheck } from "lucide-react";
import { saveAttendanceAction } from "@/app/actions/attendance";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { AttendanceStatus } from "@/features/classes/attendance-rules";
import { cn } from "@/lib/utils";

type AttendanceRow = {
  classEnrollmentId: string;
  studentName: string;
  belt?: string | null;
  gub?: number | null;
  photoDocumentId?: string | null;
  status?: AttendanceStatus;
};

const options: { value: AttendanceStatus; label: string; icon: typeof Check; active: string }[] = [
  { value: "present", label: "Presente", icon: Check, active: "border-success bg-success-soft text-success-foreground" },
  { value: "absent", label: "Falta", icon: CircleSlash2, active: "border-destructive bg-danger-soft text-danger-text" },
  { value: "excused", label: "Justificada", icon: ShieldCheck, active: "border-warning bg-warning-soft text-warning-foreground" }
];

export function AttendanceSheet({ classId, lessonId, lessonCompleted, rows, notice }: { classId: string; lessonId: string; lessonCompleted: boolean; rows: AttendanceRow[]; notice?: "saved" | "reason" | "error" }) {
  const initial = useMemo(() => Object.fromEntries(rows.filter((row) => row.status).map((row) => [row.classEnrollmentId, row.status!])), [rows]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(initial);
  const selectedCount = rows.filter((row) => statuses[row.classEnrollmentId]).length;
  const complete = rows.length > 0 && selectedCount === rows.length;
  const changed = rows.some((row) => row.status && statuses[row.classEnrollmentId] !== row.status);

  return <form action={saveAttendanceAction} className="space-y-4">
    <input type="hidden" name="class_id" value={classId} />
    <input type="hidden" name="lesson_id" value={lessonId} />
    {Object.entries(statuses).map(([id, status]) => <input key={id} type="hidden" name={`attendance:${id}`} value={status} />)}
    {notice === "saved" ? <OperationToast tone="success" title="Chamada salva" description="A frequência desta aula foi atualizada com sucesso." clearParams={["saved"]} /> : null}
    {notice === "reason" ? <OperationToast tone="warning" title="Informe o motivo da correção" description="Chamadas concluídas exigem uma justificativa para qualquer alteração." clearParams={["error"]} /> : null}
    {notice === "error" ? <OperationToast tone="error" title="Não foi possível salvar a chamada" description="Confira se todos os alunos receberam um status e tente novamente." clearParams={["error"]} /> : null}

    <div className="sticky top-3 z-10 space-y-3 rounded-xl border bg-background p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold tabular-nums">{selectedCount} de {rows.length} alunos marcados</p>
          <p className="text-sm text-muted-foreground">Salvar só ao concluir</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rows.length === 0 || complete}
          className="min-h-11 touch-manipulation font-medium"
          onClick={() => setStatuses((current) => ({ ...Object.fromEntries(rows.map((row) => [row.classEnrollmentId, "present"])), ...current }))}
        >
          <Check className="size-4" aria-hidden="true" />
          Marcar restantes como presentes
        </Button>
      </div>
      <Progress value={rows.length ? (selectedCount / rows.length) * 100 : 0} aria-label={`${selectedCount} de ${rows.length} alunos marcados`} />
    </div>

    {rows.length === 0 ? <EmptyState title="Turma sem alunos ativos" description="Ative uma matrícula vinculada a esta turma antes de realizar a chamada." /> : rows.map((row) => <Card key={row.classEnrollmentId}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <StudentAvatar name={row.studentName} photoDocumentId={row.photoDocumentId} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium">{row.studentName}</p>
            <div className="mt-0.5">
              <BeltBadge belt={row.belt} gub={row.gub} size="sm" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Presença de ${row.studentName}`}>
          {options.map(({ value, label, icon: Icon, active }) => <Button key={value} type="button" variant="outline" className={cn("h-11 touch-manipulation px-1 text-sm max-[389px]:[&_svg]:hidden", statuses[row.classEnrollmentId] === value && active)} aria-pressed={statuses[row.classEnrollmentId] === value} onClick={() => setStatuses((current) => ({ ...current, [row.classEnrollmentId]: value }))}><Icon aria-hidden="true" />{label}</Button>)}
        </div>
      </CardContent>
    </Card>)}

    {lessonCompleted && changed ? <Field><FieldLabel htmlFor="correction-reason">Motivo da correção</FieldLabel><Textarea id="correction-reason" name="correction_reason" required minLength={3} placeholder="Ex.: presença corrigida após conferência com o professor." /><FieldDescription>Este motivo fica registrado na trilha de auditoria.</FieldDescription></Field> : null}
    <div className="sticky bottom-20 z-10 rounded-xl border bg-background p-3 shadow-xs md:bottom-3"><FormSubmitButton className="h-11 w-full sm:w-auto" disabled={!complete || (lessonCompleted && changed === false)} pendingLabel="Salvando chamada…">{lessonCompleted ? "Salvar correção" : "Concluir chamada"}</FormSubmitButton></div>
  </form>;
}
