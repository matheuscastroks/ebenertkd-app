import { cache, Suspense } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronDown, ClipboardCheck } from "@/components/ui/icons";
import { createLessonAction } from "@/app/actions/attendance";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton, InlineValueSkeleton } from "@/components/skeletons";
import { DateField } from "@/components/shared/date-field";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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

const RECENT_LESSONS = 5;

type LessonItem = Awaited<ReturnType<typeof listLessonsForClass>>[number];

function LessonList({ lessons, classId, today }: { lessons: LessonItem[]; classId: string; today: string }) {
  return (
    <ul className="divide-y divide-border rounded-xl bg-card">
      {lessons.map((lesson) => {
        const status = lessonStatus[lesson.status];
        const isToday = lesson.lesson_date.slice(0, 10) === today;
        const date = new Date(lesson.lesson_date).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
        return (
          <li key={lesson.$id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{isToday ? `Hoje · ${date}` : date}</p>
              <p className="text-sm text-muted-foreground">
                <span className="tabular-nums">{lesson.start_time} às {lesson.end_time}</span> · {lesson.lesson_type === "makeup" ? "Reposição" : "Regular"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <Button asChild variant="outline" size="sm" className="min-h-11 touch-manipulation">
                <Link href={adminLessonPath(classId, lesson.$id)}>
                  {lesson.status === "completed" ? "Revisar chamada" : lesson.status === "cancelled" ? "Ver aula" : "Fazer chamada"}
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const loadTrainingClass = cache((classId: string) => getTrainingClass(classId));

async function ClassTitle({ classId }: { classId: string }) {
  const trainingClass = await loadTrainingClass(classId);
  return <>{trainingClass.name}</>;
}

async function ClassSubtitle({ classId }: { classId: string }) {
  const trainingClass = await loadTrainingClass(classId);
  return <>{trainingClass.weekdays.join(", ")} · {trainingClass.start_time} às {trainingClass.end_time}</>;
}

async function ClassLessonsBody({
  classId,
  query,
}: {
  classId: string;
  query: { error?: string };
}) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const [trainingClass, lessons, attendanceSummary] = await Promise.all([
    loadTrainingClass(classId),
    listLessonsForClass(classId),
    getClassAttendanceSummary(classId, today.slice(0, 7))
  ]);

  const sortedLessons = [...lessons].sort((a, b) => b.lesson_date.localeCompare(a.lesson_date) || b.start_time.localeCompare(a.start_time));
  const recentLessons = sortedLessons.slice(0, RECENT_LESSONS);
  const olderLessons = sortedLessons.slice(RECENT_LESSONS);
  const todayLesson = lessons.find(
    (lesson) =>
      lesson.lesson_date.slice(0, 10) === today &&
      lesson.start_time === trainingClass.start_time
  );

  return (
    <div className="w-full min-w-0 space-y-6">
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível criar a aula"
            description="Confira a data, o horário e se a turma está ativa."
            clearParams={["error"]}
          />
        ) : null}

        {/* Aula de hoje: a tarefa principal da tela */}
        <section aria-labelledby="aula-de-hoje" className="flex flex-col gap-4 rounded-xl bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 space-y-1">
            <h2 id="aula-de-hoje" className="text-base font-semibold">{todayLesson ? "Aula de hoje pronta" : "Aula de hoje"}</h2>
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums">{trainingClass.start_time} às {trainingClass.end_time}</span> · {trainingClass.location || "Local não informado"}
            </p>
            {trainingClass.status !== "active" ? <p className="text-sm text-muted-foreground">Turma pausada. Ative a turma em Turmas para criar aulas.</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {todayLesson ? (
              <Button asChild className="min-h-11 touch-manipulation">
                <Link href={adminLessonPath(classId, todayLesson.$id)}>
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                  {todayLesson.status === "completed" ? "Revisar chamada" : "Fazer chamada"}
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
                  className="min-h-11 touch-manipulation"
                >
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  Criar aula de hoje
                </FormSubmitButton>
              </form>
            )}

            <ResponsiveDialog
              trigger={
                <Button variant="ghost" className="min-h-11 touch-manipulation">
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
                    <Input id="makeup-start" name="start_time" type="time" defaultValue={trainingClass.start_time} className="h-11" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="makeup-end">Término</FieldLabel>
                    <Input id="makeup-end" name="end_time" type="time" defaultValue={trainingClass.end_time} className="h-11" required />
                  </Field>
                </div>
                <FormSubmitButton className="min-h-11 w-full sm:w-auto" pendingLabel="Criando reposição…">
                  Criar e abrir chamada
                </FormSubmitButton>
              </form>
            </ResponsiveDialog>
          </div>
        </section>

        {/* Histórico: as aulas recentes ficam visíveis; as antigas, recolhidas */}
        <section className="space-y-3" aria-labelledby="historico-aulas">
          <h2 id="historico-aulas" className="text-base font-semibold">Histórico de aulas</h2>
          {lessons.length === 0 ? (
            <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">
              Nenhuma aula criada ainda. Crie a aula de hoje para fazer a primeira chamada.
            </p>
          ) : (
            <>
              <LessonList lessons={recentLessons} classId={classId} today={today} />
              {olderLessons.length ? (
                <details className="group space-y-3">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-open:-scale-y-100 motion-reduce:transition-none" aria-hidden="true" />
                    Ver {olderLessons.length} aula{olderLessons.length === 1 ? "" : "s"} anterior{olderLessons.length === 1 ? "" : "es"}
                  </summary>
                  <LessonList lessons={olderLessons} classId={classId} today={today} />
                </details>
              ) : null}
            </>
          )}
        </section>

        {/* Frequência do mês: consulta, nível terciário */}
        <ClassAttendanceSummary {...attendanceSummary} />
    </div>
  );
}

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

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Turmas", href: ROUTES.adminClasses }}
      title={
        <Suspense fallback={<InlineValueSkeleton className="h-7 w-44" />}>
          <ClassTitle classId={classId} />
        </Suspense>
      }
      subtitle={
        <Suspense fallback={<InlineValueSkeleton className="h-4 w-56" />}>
          <ClassSubtitle classId={classId} />
        </Suspense>
      }
    >
      <Suspense fallback={<InlineRowsSkeleton rows={5} label="Carregando aulas da turma…" />}>
        <ClassLessonsBody classId={classId} query={query} />
      </Suspense>
    </PortalShell>
  );
}
