import { Suspense } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
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
import { examEventLabels, examEventTones, formatExamDate } from "@/features/exams/labels";
import { getExamsOverview } from "@/features/exams/service";
import { formatBrl } from "@/lib/money";
import { adminExamPath, ROUTES } from "@/lib/navigation/routes";
import { requireProfile } from "@/lib/auth/session";
import { ListItemsSkeleton } from "@/components/skeletons";

type ExamOverview = Awaited<ReturnType<typeof getExamsOverview>>;

function ExamList({ events }: { events: ExamOverview["events"] }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {events.map((event) => (
        <li key={event.$id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">{event.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatExamDate(event.event_date, { day: "2-digit", month: "short", year: "numeric" })}
              {" · "}{event.location || "Local não informado"}
              {" · "}<span className="tabular-nums">{event.participantCount} {event.participantCount === 1 ? "candidato" : "candidatos"}</span>
              {" · "}Taxa <span className="tabular-nums">{formatBrl(event.default_fee_cents)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={examEventTones[event.status]}>{examEventLabels[event.status]}</StatusBadge>
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href={adminExamPath(event.$id)}>Abrir banca</Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function ExamEventsContent() {
  const { events, nextUpcomingEvent, totalActiveParticipants, totalProjectedRevenueCents } = await getExamsOverview();
  const active = events.filter((event) => event.status === "planned" || event.status === "confirmed");
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
      <p className="text-sm text-muted-foreground">
        Próximo exame: {nextUpcomingEvent ? formatExamDate(nextUpcomingEvent.event_date) : "nenhum agendado"} · <span className="tabular-nums">{totalActiveParticipants}</span> inscritos · Taxas previstas: <span className="tabular-nums">{formatBrl(totalProjectedRevenueCents)}</span>
      </p>

      <section className="space-y-3" aria-labelledby="exames-abertos">
        <h2 id="exames-abertos" className="text-base font-semibold">Exames em aberto</h2>
        {active.length ? <ExamList events={active} /> : (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Nenhum exame em aberto. Use Novo exame para agendar a próxima banca.</p>
        )}
      </section>

      {closed.length ? (
        <details className="group space-y-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            Concluídos e cancelados ({closed.length})
          </summary>
          <ExamList events={closed} />
        </details>
      ) : null}
    </div>
  );
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const [admin, query] = await Promise.all([
    requireProfile("admin"),
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
        <ResponsiveDialog
          trigger={
            <Button className="min-h-11">
              <Plus className="size-4" aria-hidden="true" />
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
              <Input id="exam-location" name="location" placeholder="Ex.: Dojang principal" className="h-11" />
            </Field>

            <div className="pt-2 sm:col-span-2">
              <FormSubmitButton className="min-h-11 w-full" pendingLabel="Criando exame…">
                Cadastrar exame
              </FormSubmitButton>
            </div>
          </form>
        </ResponsiveDialog>
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

        <Suspense fallback={<ListItemsSkeleton count={4} />}>
          <ExamEventsContent />
        </Suspense>
      </div>
    </PortalShell>
  );
}
