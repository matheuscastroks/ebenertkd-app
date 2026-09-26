import Link from "next/link";
import { Calendar, CalendarPlus, ClipboardCheck, Clock, MapPin, Sparkles } from "lucide-react";
import { createLessonAction } from "@/app/actions/attendance";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { DateField } from "@/components/shared/date-field";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

const lessonStatus = {
  open: { label: "Chamada aberta", tone: "info" },
  completed: { label: "Concluída", tone: "success" },
  cancelled: { label: "Cancelada", tone: "neutral" }
} as const;

export default async function ClassLessonsPage({
  params,
  searchParams
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [admin, { classId }, query] = await Promise.all([
    requireProfile("admin"),
    params,
    searchParams
  ]);

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const [trainingClass, lessons, attendanceSummary] = await Promise.all([
    getTrainingClass(classId),
    listLessonsForClass(classId),
    getClassAttendanceSummary(classId, today.slice(0, 7))
  ]);

  const todayLesson = lessons.find(
    (lesson) =>
      lesson.lesson_date.slice(0, 10) === today &&
      lesson.start_time === trainingClass.start_time
  );

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminClasses}
      breadcrumbs={[
        { label: "Turmas", href: ROUTES.adminClasses },
        { label: trainingClass.name }
      ]}
      title={trainingClass.name}
      subtitle={`${trainingClass.weekdays.join(", ")} · ${trainingClass.start_time} às ${trainingClass.end_time}`}
    >
      <div className="w-full min-w-0 space-y-6">
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível criar a aula"
            description="Confira a data, o horário e se a turma está ativa."
            clearParams={["error"]}
          />
        ) : null}

        {/* Card Operacional da Aula de Hoje */}
        <Card className={cn(
          "border transition-all",
          todayLesson
            ? "border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-xs"
            : "border-border/80"
        )}>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Agenda da turma
                </span>
                {todayLesson ? (
                  <Badge variant="default" className="text-[11px] font-semibold">
                    <Sparkles className="size-3 mr-1" aria-hidden="true" />
                    Aula de hoje pronta
                  </Badge>
                ) : null}
              </div>
              <p className="font-semibold text-base sm:text-lg">
                {trainingClass.name}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {trainingClass.start_time} às {trainingClass.end_time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {trainingClass.location ?? "Dojô Ebenézer TKD"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {todayLesson ? (
                <Button asChild size="default" className="h-10 font-semibold touch-manipulation">
                  <Link href={adminLessonPath(classId, todayLesson.$id)}>
                    <ClipboardCheck className="size-4 mr-1.5" aria-hidden="true" />
                    Abrir chamada de hoje
                  </Link>
                </Button>
              ) : (
                <form action={createLessonAction}>
                  <input type="hidden" name="class_id" value={classId} />
                  <input type="hidden" name="lesson_date" value={today} />
                  <input type="hidden" name="start_time" value={trainingClass.start_time} />
                  <input type="hidden" name="end_time" value={trainingClass.end_time} />
                  <input type="hidden" name="lesson_type" value="regular" />
                  <FormSubmitButton
                    disabled={trainingClass.status !== "active"}
                    pendingLabel="Criando aula…"
                    className="h-10 font-semibold touch-manipulation"
                  >
                    <CalendarPlus className="size-4 mr-1.5" aria-hidden="true" />
                    Criar aula de hoje
                  </FormSubmitButton>
                </form>
              )}

              <ResponsiveDialog
                trigger={
                  <Button variant="outline" size="default" className="h-10 touch-manipulation">
                    <CalendarPlus className="size-4 mr-1.5" aria-hidden="true" />
                    Aula de reposição
                  </Button>
                }
                title="Nova aula de reposição"
                description="Escolha uma data e um horário diferentes da grade regular da turma."
              >
                <form action={createLessonAction} className="space-y-4">
                  <input type="hidden" name="class_id" value={classId} />
                  <input type="hidden" name="lesson_type" value="makeup" />
                  <DateField id="makeup-date" name="lesson_date" label="Data da aula" required />
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="makeup-start">Início</FieldLabel>
                      <Input
                        id="makeup-start"
                        name="start_time"
                        type="time"
                        defaultValue={trainingClass.start_time}
                        className="h-11"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="makeup-end">Término</FieldLabel>
                      <Input
                        id="makeup-end"
                        name="end_time"
                        type="time"
                        defaultValue={trainingClass.end_time}
                        className="h-11"
                        required
                      />
                    </Field>
                  </div>
                  <FormSubmitButton className="w-full sm:w-auto" pendingLabel="Criando reposição…">
                    Criar e abrir chamada
                  </FormSubmitButton>
                </form>
              </ResponsiveDialog>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Aulas */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Histórico de aulas</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Consulte aulas ministradas para realizar ou revisar a chamada de frequência.
            </p>
          </div>

          {lessons.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground text-center">
                Nenhuma aula criada para esta turma até o momento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {lessons.map((lesson) => {
                const status = lessonStatus[lesson.status];
                const isLessonToday = lesson.lesson_date.slice(0, 10) === today;
                return (
                  <Card key={lesson.$id} className="border-border/80 shadow-xs hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold">
                              {new Date(lesson.lesson_date).toLocaleDateString("pt-BR", {
                                timeZone: "UTC",
                                weekday: "short",
                                day: "numeric",
                                month: "short"
                              })}
                            </CardTitle>
                            {isLessonToday ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Hoje
                              </Badge>
                            ) : null}
                          </div>
                          <CardDescription className="text-xs">
                            {lesson.start_time} às {lesson.end_time} ·{" "}
                            {lesson.lesson_type === "makeup" ? "Aula de Reposição" : "Aula Regular"}
                          </CardDescription>
                        </div>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button
                        asChild
                        size="sm"
                        variant={lesson.status === "completed" ? "outline" : "default"}
                        className="h-9 w-full sm:w-auto touch-manipulation"
                      >
                        <Link href={adminLessonPath(classId, lesson.$id)}>
                          <ClipboardCheck className="size-4 mr-1.5" aria-hidden="true" />
                          {lesson.status === "completed" ? "Revisar chamada" : "Fazer chamada"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Resumo de Frequência da Turma */}
        <ClassAttendanceSummary {...attendanceSummary} />
      </div>
    </PortalShell>
  );
}
