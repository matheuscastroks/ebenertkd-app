import { EVENT_TYPE_LABEL } from "@/features/events/labels";
import { getAcademyIdentity } from "@/features/academy/config-service";
import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { CardGridSkeleton, ListItemsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/features/auth/types";
import { AddToCalendarButton } from "@/features/classes/components/add-to-calendar-button";
import { findFirstOccurrenceDate } from "@/features/classes/student-calendar-rules";
import { getStudentCalendarData } from "@/features/classes/student-calendar-service";
import { requireCapability } from "@/lib/auth/session";
import { formatBusinessDateBr } from "@/lib/dates";
import { ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, Clock, MapPin } from "@/components/ui/icons";

async function StudentCalendarContent({ profile }: { profile: Profile }) {
  const [data, identity] = await Promise.all([getStudentCalendarData(profile), getAcademyIdentity()]);
  const { trainingClass, upcomingSessions, upcomingExams } = data;
  const firstClassDate =
    trainingClass && trainingClass.weekdays.length > 0
      ? findFirstOccurrenceDate(trainingClass.weekdays)
      : null;

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="weekly-schedule-heading"
        className="rounded-xl border border-border bg-card p-5 shadow-xs"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 id="weekly-schedule-heading" className="text-base font-semibold">
              Grade semanal da sua turma
            </h2>
            {trainingClass ? (
              <p className="text-sm text-muted-foreground">
                {trainingClass.name} · {trainingClass.weekdays.join(", ")}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sua turma será vinculada assim que sua matrícula for aprovada.
              </p>
            )}
          </div>

          {trainingClass ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="size-4" aria-hidden="true" />
                {trainingClass.start_time} às {trainingClass.end_time}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {trainingClass.location || "Dojang principal"}
              </span>
              {firstClassDate ? (
                <AddToCalendarButton
                  uid={`class-weekly-${trainingClass.$id}`}
                  title={`Taekwondo · ${trainingClass.name}`}
                  date={firstClassDate}
                  startTime={trainingClass.start_time}
                  endTime={trainingClass.end_time}
                  location={trainingClass.location}
                  description={`Treino semanal da turma ${trainingClass.name} (${trainingClass.weekdays.join(", ")}). Portal ${identity.short_name}.`}
                  recurrenceWeekdays={trainingClass.weekdays}
                  fileName={`grade-${trainingClass.$id}`}
                  label="Salvar grade na agenda"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="upcoming-sessions-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="upcoming-sessions-heading" className="text-base font-semibold">
              Próximos treinos (21 dias)
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {upcomingSessions.length} sess{upcomingSessions.length === 1 ? "ão" : "ões"}
            </span>
          </div>

          {upcomingSessions.length === 0 ? (
            <EmptyState
              title="Nenhum treino previsto ainda"
              description="Quando sua turma estiver ativa, seus próximos horários aparecerão automaticamente aqui."
              action={
                <Button asChild variant="outline" className="min-h-11">
                  <Link href={ROUTES.studentAttendance}>Ver minha frequência</Link>
                </Button>
              }
            />
          ) : (
            <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              {upcomingSessions.map((session) => (
                <li
                  key={session.id}
                  className="t-interactive-row flex flex-col gap-3 px-4 py-3.5 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {session.weekday} ·{" "}
                        <span className="tabular-nums">{formatBusinessDateBr(session.date)}</span>
                      </p>
                      <StatusBadge tone={session.kind === "makeup" ? "info" : "neutral"}>
                        {session.kind === "makeup" ? "Reposição" : "Treino regular"}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {session.startTime} às {session.endTime}
                      </span>
                      {" · "}
                      {session.className}
                      {session.location ? ` · ${session.location}` : ""}
                    </p>
                  </div>

                  <AddToCalendarButton
                    uid={session.id}
                    title={`Taekwondo · ${session.className}`}
                    date={session.date}
                    startTime={session.startTime}
                    endTime={session.endTime}
                    location={session.location}
                    description={`Treino agendado pelo portal ${identity.short_name}.`}
                    fileName={`treino-${session.date}`}
                    label="Adicionar à agenda"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="upcoming-exams-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="upcoming-exams-heading" className="text-base font-semibold">
              Próximos eventos
            </h2>
            <Button asChild variant="ghost" size="sm" className="min-h-9">
              <Link href={ROUTES.studentEvents}>
                Eventos
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-xs">
              Nenhum evento marcado no calendário no momento.
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              {upcomingExams.map((exam) => (
                <li key={exam.id} className="space-y-3 p-4 sm:p-5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{exam.name}</p>
                      <StatusBadge tone={exam.type === "belt_exam" ? "info" : "neutral"}>
                        {EVENT_TYPE_LABEL[exam.type]}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Data:{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {formatBusinessDateBr(exam.date)}
                      </span>
                      {" · "}
                      {exam.location || "Local a confirmar"}
                    </p>
                  </div>

                  <AddToCalendarButton
                    uid={`exam-${exam.id}`}
                    title={exam.name}
                    date={exam.date}
                    location={exam.location}
                    description={`${EVENT_TYPE_LABEL[exam.type]} · ${identity.short_name}.`}
                    fileName={`evento-${exam.date}`}
                    label="Salvar na agenda"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default async function StudentCalendarPage() {
  const profile = await requireCapability("student");

  return (
    <PortalShell
      profile={profile}
      title="Treinos"
      subtitle="Seus horários e os próximos treinos."
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense
          fallback={
            <div className="space-y-6">
              <CardGridSkeleton count={1} />
              <ListItemsSkeleton count={4} />
            </div>
          }
        >
          <StudentCalendarContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
