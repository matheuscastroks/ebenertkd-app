import Link from "next/link";
import { CalendarPlus, ClipboardCheck, MapPin } from "lucide-react";
import { createLessonAction } from "@/app/actions/attendance";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { DateField } from "@/components/shared/date-field";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { listLessonsForClass } from "@/features/classes/lesson-service";
import { getClassAttendanceSummary } from "@/features/classes/attendance-service";
import { ClassAttendanceSummary } from "@/features/classes/components/class-attendance-summary";
import { getTrainingClass } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { adminLessonPath, ROUTES } from "@/lib/navigation/routes";

const lessonStatus = {
  open: { label: "Chamada aberta", tone: "info" },
  completed: { label: "Concluída", tone: "success" },
  cancelled: { label: "Cancelada", tone: "neutral" }
} as const;

export default async function ClassLessonsPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ error?: string }> }) {
  const [admin, { classId }, query] = await Promise.all([requireProfile("admin"), params, searchParams]);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const [trainingClass, lessons, attendanceSummary] = await Promise.all([getTrainingClass(classId), listLessonsForClass(classId), getClassAttendanceSummary(classId, today.slice(0, 7))]);
  const todayLesson = lessons.find((lesson) => lesson.lesson_date.slice(0, 10) === today && lesson.start_time === trainingClass.start_time);

  return <PortalShell profile={admin} activePath={ROUTES.adminClasses} title={trainingClass.name} subtitle={`${trainingClass.weekdays.join(", ")} · ${trainingClass.start_time}–${trainingClass.end_time}`}>
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {query.error ? <OperationToast tone="error" title="Não foi possível criar a aula" description="Confira a data, o horário e se a turma está ativa." clearParams={["error"]} /> : null}
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="space-y-1"><p className="font-medium">Agenda da turma</p><p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden="true" />{trainingClass.location ?? "Local não informado"}</p></div><div className="flex flex-wrap gap-2">{todayLesson ? <Button asChild><Link href={adminLessonPath(classId, todayLesson.$id)}><ClipboardCheck aria-hidden="true" />Abrir chamada de hoje</Link></Button> : <form action={createLessonAction}><input type="hidden" name="class_id" value={classId} /><input type="hidden" name="lesson_date" value={today} /><input type="hidden" name="start_time" value={trainingClass.start_time} /><input type="hidden" name="end_time" value={trainingClass.end_time} /><input type="hidden" name="lesson_type" value="regular" /><FormSubmitButton disabled={trainingClass.status !== "active"} pendingLabel="Criando aula…"><CalendarPlus aria-hidden="true" />Criar aula de hoje</FormSubmitButton></form>}<ResponsiveDialog trigger={<Button variant="outline"><CalendarPlus aria-hidden="true" />Criar reposição</Button>} title="Nova aula de reposição" description="Escolha uma data e um horário diferentes da agenda regular."><form action={createLessonAction} className="space-y-4"><input type="hidden" name="class_id" value={classId} /><input type="hidden" name="lesson_type" value="makeup" /><DateField id="makeup-date" name="lesson_date" label="Data" required /><div className="grid grid-cols-2 gap-3"><Field><FieldLabel htmlFor="makeup-start">Início</FieldLabel><Input id="makeup-start" name="start_time" type="time" defaultValue={trainingClass.start_time} required /></Field><Field><FieldLabel htmlFor="makeup-end">Término</FieldLabel><Input id="makeup-end" name="end_time" type="time" defaultValue={trainingClass.end_time} required /></Field></div><FormSubmitButton pendingLabel="Criando reposição…">Criar e abrir chamada</FormSubmitButton></form></ResponsiveDialog></div></CardContent></Card>

      <section className="space-y-3"><div><h2 className="text-lg font-semibold">Aulas registradas</h2><p className="text-sm text-muted-foreground">Abra uma aula para realizar ou corrigir a chamada.</p></div>{lessons.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma aula criada para esta turma.</CardContent></Card> : <div className="grid gap-3 md:grid-cols-2">{lessons.map((lesson) => { const status = lessonStatus[lesson.status]; return <Card key={lesson.$id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{new Date(lesson.lesson_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</CardTitle><CardDescription>{lesson.start_time}–{lesson.end_time} · {lesson.lesson_type === "makeup" ? "Reposição" : "Regular"}</CardDescription></div><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div></CardHeader><CardContent><Button asChild variant={lesson.status === "completed" ? "outline" : "default"}><Link href={adminLessonPath(classId, lesson.$id)}>{lesson.status === "completed" ? "Revisar chamada" : "Fazer chamada"}</Link></Button></CardContent></Card>; })}</div>}</section>
      <ClassAttendanceSummary {...attendanceSummary} />
    </div>
  </PortalShell>;
}
