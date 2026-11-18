import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { PlusIcon } from "@/components/ui/plus";
import { createExamEventAction } from "@/app/actions/exams";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { DateField } from "@/components/shared/date-field";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { examEventLabels, examEventTones, formatExamDate } from "@/features/exams/labels";
import { getExamsOverview } from "@/features/exams/service";
import { LocationSelect } from "@/features/locations/components/location-select";
import { listLocations } from "@/features/locations/locations-service";
import { formatBrl } from "@/lib/money";
import { adminExamPath, ROUTES } from "@/lib/navigation/routes";
import { requireProfile } from "@/lib/auth/session";

type ExamOverview = Awaited<ReturnType<typeof getExamsOverview>>;

function ExamList({ events }: { events: ExamOverview["events"] }) {
  return (
    <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {events.map((event) => (
        <li
          key={event.$id}
          className="t-interactive-row flex flex-col gap-3 px-4 py-3.5 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-medium text-foreground">{event.name}</p>
              <StatusBadge tone={examEventTones[event.status]}>{examEventLabels[event.status]}</StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatExamDate(event.event_date, { day: "2-digit", month: "short", year: "numeric" })}
              {" · "}
              {event.location || "Local não informado"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
            <div className="text-left sm:text-right">
              <p className="text-sm font-medium tabular-nums text-foreground">
                {event.participantCount} {event.participantCount === 1 ? "candidato" : "candidatos"}
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {event.participantCount > 0
                  ? `${formatBrl(event.totalFeesCents)} previstos`
                  : `Taxa ${formatBrl(event.default_fee_cents)}`}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="h-11 shrink-0 px-3 sm:h-9">
              <Link href={adminExamPath(event.$id)}>
                Abrir banca
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function ExamEventsContent() {
  const { events, nextUpcomingEvent, totalActiveParticipants, totalProjectedRevenueCents } = await getExamsOverview();
  const active = events
    .filter((event) => event.status === "planned" || event.status === "confirmed")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const closed = events.filter((event) => event.status === "completed" || event.status === "cancelled");

  if (events.length === 0) {
    return (
      <EmptyState
        title="Nenhum exame de faixa agendado"
        description="Use Novo exame para cadastrar a primeira banca. Depois inscreva os alunos elegíveis."
      />
    );
  }

  return (
    <div className="space-y-6">
      <dl
        aria-label="Resumo dos exames"
        className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Próximo exame</dt>
          <dd className="mt-1 space-y-0.5">
            <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
              {nextUpcomingEvent
                ? formatExamDate(nextUpcomingEvent.event_date, { day: "2-digit", month: "short", year: "numeric" })
                : "Nenhum agendado"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {nextUpcomingEvent
                ? `${nextUpcomingEvent.name}${nextUpcomingEvent.location ? ` · ${nextUpcomingEvent.location}` : ""}`
                : "Use Novo exame para agendar"}
            </p>
          </dd>
        </div>
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Candidatos inscritos</dt>
          <dd className="mt-1 space-y-0.5">
            <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
              {totalActiveParticipants}
            </p>
            <p className="text-sm text-muted-foreground">aguardando avaliação</p>
          </dd>
        </div>
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Receita prevista</dt>
          <dd className="mt-1 space-y-0.5">
            <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
              {formatBrl(totalProjectedRevenueCents)}
            </p>
            <p className="text-sm text-muted-foreground">em taxas de inscrição</p>
          </dd>
        </div>
      </dl>

      <section className="space-y-3" aria-labelledby="exames-abertos">
        <h2 id="exames-abertos" className="text-base font-semibold">Exames em aberto</h2>
        {active.length ? (
          <ExamList events={active} />
        ) : (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">
            Nenhum exame em aberto. Use Novo exame para agendar a próxima banca.
          </p>
        )}
      </section>

      {closed.length ? (
        <details open={active.length === 0} className="group space-y-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDownIcon className="size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-open:-scale-y-100 motion-reduce:transition-none" aria-hidden="true" />
            Concluídos e cancelados ({closed.length})
          </summary>
          <ExamList events={closed} />
        </details>
      ) : null}
    </div>
  );
}

function ExamsOverviewSkeleton() {
  return (
    <div aria-label="Carregando exames…" aria-busy="true" className="space-y-6">
      <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-2 p-4 sm:px-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando exames…</span>
    </div>
  );
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const [admin, locations, query] = await Promise.all([
    requireProfile("admin"),
    listLocations(),
    searchParams,
  ]);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminExams}
      title="Exames de faixa"
      subtitle="Agende bancas, inscreva alunos e registre as novas graduações."
      breadcrumbs={[{ label: "Exames de faixa" }]}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="min-h-11">
            <Link href={ROUTES.adminExamEligibility}>Elegibilidade</Link>
          </Button>
          <ResponsiveDialog
            size="xl"
            trigger={
              <Button className="min-h-11">
                <PlusIcon className="size-4" aria-hidden="true" />
                Novo exame
              </Button>
            }
            title="Novo exame de faixa"
            description="A taxa informada será o valor padrão das inscrições."
          >
          <form action={createExamEventAction} className="grid gap-4 pt-2 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="exam-name">Nome do evento</FieldLabel>
              <Input id="exam-name" name="name" placeholder="Ex.: Exame de faixas do 2º semestre" required className="h-11" />
            </Field>

            <DateField id="exam-date" name="event_date" label="Data do exame" required />

            <Field>
              <FieldLabel htmlFor="exam-fee">Taxa padrão por aluno (R$)</FieldLabel>
              <Input id="exam-fee" name="default_fee_reais" type="number" inputMode="decimal" min="0" step="0.01" placeholder="150,00" required className="h-11 tabular-nums" />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="exam-location">Local da avaliação</FieldLabel>
              <LocationSelect
                id="exam-location"
                name="location"
                locations={locations}
                placeholder="Selecione o dojang ou local do exame"
              />
            </Field>

            <div className="pt-2 sm:col-span-2">
              <FormSubmitButton className="min-h-11 w-full" pendingLabel="Criando exame…">
                Cadastrar exame de faixa
              </FormSubmitButton>
            </div>
          </form>
        </ResponsiveDialog>
        </div>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        {query.cancelled ? (
          <OperationToast
            tone="success"
            title="Exame cancelado"
            description="O evento foi arquivado como cancelado no histórico."
            clearParams={["cancelled"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível criar o exame"
            description="Revise a data, o local e a taxa e tente novamente."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={<ExamsOverviewSkeleton />}>
          <ExamEventsContent />
        </Suspense>
      </div>
    </PortalShell>
  );
}
