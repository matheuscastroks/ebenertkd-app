"use client";

import { useMemo, useState } from "react";
import { Check, CircleSlash2, ShieldCheck } from "lucide-react";
import { saveAttendanceAction } from "@/app/actions/attendance";
import { FeedbackAlert } from "@/components/shared/feedback-alert";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { AttendanceStatus } from "@/features/classes/attendance-rules";
import { cn } from "cn";

type AttendanceRow = {
  classEnrollmentId: string;
  studentName: string;
  belt?: string | null;
  photoDocumentId?: string | null;
  status?: AttendanceStatus;
};

const options: { value: AttendanceStatus; label: string; icon: typeof Check; active: string }[] = [
  { value: "present", label: "Presente", icon: Check, active: "border-success bg-success/10 text-success-foreground" },
  { value: "absent", label: "Falta", icon: CircleSlash2, active: "border-destructive bg-destructive/10 text-destructive" },
  { value: "excused", label: "Justificada", icon: ShieldCheck, active: "border-warning bg-warning/10 text-warning-foreground" }
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
    {notice === "saved" ? <FeedbackAlert tone="success" title="Chamada salva" description="A frequência desta aula foi atualizada." /> : null}
    {notice === "reason" ? <FeedbackAlert tone="warning" title="Informe o motivo da correção" description="Chamadas concluídas exigem uma justificativa para qualquer alteração." /> : null}
    {notice === "error" ? <FeedbackAlert tone="danger" title="Não foi possível salvar a chamada" description="Confira se todos os alunos receberam um status e tente novamente." /> : null}

    <div className="sticky top-3 z-10 space-y-3 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{selectedCount} de {rows.length} alunos marcados</p><p className="text-sm text-muted-foreground">A chamada é salva em um único lote.</p></div><Button type="button" variant="outline" onClick={() => setStatuses(Object.fromEntries(rows.map((row) => [row.classEnrollmentId, "present"]))) }>Marcar todos presentes</Button></div>
      <Progress value={rows.length ? (selectedCount / rows.length) * 100 : 0} aria-label={`${selectedCount} de ${rows.length} alunos marcados`} />
    </div>

    {rows.length === 0 ? <FeedbackAlert tone="info" title="Turma sem alunos ativos" description="Ative uma matrícula vinculada a esta turma antes de realizar a chamada." /> : rows.map((row) => <Card key={row.classEnrollmentId}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3"><StudentAvatar name={row.studentName} photoDocumentId={row.photoDocumentId} size="lg" /><div className="min-w-0"><p className="truncate font-medium">{row.studentName}</p><p className="text-sm text-muted-foreground">{row.belt ?? "Graduação não informada"}</p></div></div>
        <Separator />
        <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-3" role="group" aria-label={`Presença de ${row.studentName}`}>
          {options.map(({ value, label, icon: Icon, active }) => <Button key={value} type="button" variant="outline" className={cn("h-11", statuses[row.classEnrollmentId] === value && active)} aria-pressed={statuses[row.classEnrollmentId] === value} onClick={() => setStatuses((current) => ({ ...current, [row.classEnrollmentId]: value }))}><Icon aria-hidden="true" />{label}</Button>)}
        </div>
      </CardContent>
    </Card>)}

    {lessonCompleted && changed ? <Field><FieldLabel htmlFor="correction-reason">Motivo da correção</FieldLabel><Textarea id="correction-reason" name="correction_reason" required minLength={3} placeholder="Ex.: presença corrigida após conferência com o professor." /><FieldDescription>Este motivo fica registrado na trilha de auditoria.</FieldDescription></Field> : null}
    <div className="sticky bottom-3 z-10 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur"><FormSubmitButton className="h-11 w-full sm:w-auto" disabled={!complete || (lessonCompleted && changed === false)} pendingLabel="Salvando chamada…">{lessonCompleted ? "Salvar correção" : "Concluir chamada"}</FormSubmitButton></div>
  </form>;
}
