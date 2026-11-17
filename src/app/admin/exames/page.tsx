import { Suspense } from "react";
import Link from "next/link";
import { createExamEventAction } from "@/app/actions/exams";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { DateField } from "@/components/shared/date-field";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getExamsOverview } from "@/features/exams/service";
import { formatBrl } from "@/lib/money";
import { adminExamPath, ROUTES } from "@/lib/navigation/routes";
import { requireProfile } from "@/lib/auth/session";
import {
  ArrowRight,
  Award,
  Calendar,
  CalendarDays,
  DollarSign,
  MapPin,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { CardGridSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

const labels = {
  planned: "Planejado",
  confirmed: "Confirmado · Inscrições abertas",
  completed: "Concluído",
  cancelled: "Cancelado",
} as const;

const tones = {
  planned: "neutral",
  confirmed: "info",
  completed: "success",
  cancelled: "danger",
} as const;

async function ExamEventsContent() {
  const overview = await getExamsOverview();
  const { events, nextUpcomingEvent, totalActiveParticipants, totalProjectedRevenueCents } = overview;

  return (
    <div className="space-y-6">
      {/* 1. Barra de KPIs Operacionais (Topo da Página) */}
      <p className="text-sm text-muted-foreground" aria-label="Métricas de exames">
        Próximo exame: {nextUpcomingEvent ? new Date(nextUpcomingEvent.event_date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "nenhum agendado"} · {totalActiveParticipants} inscritos · Taxas previstas: {formatBrl(totalProjectedRevenueCents)}
      </p>

      {/* 2. Lista de Exames com Calendário Visual */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Eventos agendados</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Selecione um evento para avaliar candidatos na banca, gerenciar cobranças e homologar graduações.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Award className="size-12 text-muted-foreground/50 mb-3" />
              <p className="font-semibold text-foreground text-base">Nenhum exame de faixa agendado</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Cadastre o primeiro exame de graduação para abrir as inscrições aos praticantes elegíveis da academia.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => {
              const eventDate = new Date(event.event_date);
              const monthStr = eventDate
                .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
                .replace(".", "")
                .toUpperCase();
              const dayStr = eventDate.toLocaleDateString("pt-BR", {
                day: "2-digit",
                timeZone: "UTC",
              });
              const yearStr = eventDate.toLocaleDateString("pt-BR", {
                year: "numeric",
                timeZone: "UTC",
              });
              const weekdayStr = eventDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                timeZone: "UTC",
              });

              return (
                <Card
                  key={event.$id}
                  className="shadow-xs rounded-2xl border-border/80 hover:border-primary/50 transition-colors hover:shadow-md flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header Row: Visual Calendar Block + Main Info */}
                    <div className="flex items-start gap-4">
                      {/* Bloco Visual de Calendário */}
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center shrink-0 w-14 rounded-xl border overflow-hidden shadow-2xs text-center select-none",
                          event.status === "completed"
                            ? "border-muted bg-muted/40"
                            : event.status === "cancelled"
                              ? "border-destructive/30 bg-destructive/5 opacity-60"
                              : "border-primary/30 bg-primary/5"
                        )}
                        aria-hidden="true"
                      >
                        <span
                          className={cn(
                            "w-full text-sm font-semibold  py-0.5 ",
                            event.status === "completed"
                              ? "bg-muted text-muted-foreground"
                              : event.status === "cancelled"
                                ? "bg-destructive/20 text-destructive font-semibold"
                                : "bg-primary text-primary-foreground"
                          )}
                        >
                          {monthStr}
                        </span>
                        <span className="text-xl font-semibold text-foreground py-1 leading-none">
                          {dayStr}
                        </span>
                        <span className="text-sm text-muted-foreground pb-1 font-medium">
                          {yearStr}
                        </span>
                      </div>

                      {/* Informações Centrais do Evento */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge tone={tones[event.status]}>
                            {labels[event.status]}
                          </StatusBadge>
                          {event.participantCount > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                              {event.participantCount} {event.participantCount === 1 ? "candidato" : "candidatos"}
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2 pt-0.5">
                          {event.name}
                        </h3>

                        <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1.5 capitalize">
                            <Calendar className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <span>{weekdayStr}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{event.location ?? "Dojang Ebener TKD"}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Row: Preço e Botão de Ação */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                      <div className="flex flex-col">
                        <span className="text-sm   text-muted-foreground font-medium">
                          Taxa individual
                        </span>
                        <span className="text-sm font-semibold font-mono text-foreground">
                          {formatBrl(event.default_fee_cents)}
                        </span>
                      </div>

                      <Button asChild variant="outline" className="h-10 font-semibold px-4">
                        <Link href={adminExamPath(event.$id)}>
                          <span>Gerenciar banca</span>
                          <ArrowRight className="ml-1.5 size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
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
      subtitle="Organize bancas examinadoras, inscrições de alunos, taxas e lançamento de novas graduações."
      breadcrumbs={[{ label: "Exames de faixa" }]}
      headerActions={
        <ResponsiveDialog
          trigger={
            <Button className="h-10 font-medium">
              <Plus className="mr-2 size-4" />
              Novo exame
            </Button>
          }
          title="Novo exame de faixa"
          description="Cadastre um novo evento de avaliação. A taxa informada será o valor padrão para as inscrições."
        >
          <form action={createExamEventAction} className="grid gap-4 sm:grid-cols-2 pt-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="exam-name" className="text-xs sm:text-sm font-semibold">
                Nome do evento
              </FieldLabel>
              <Input
                id="exam-name"
                name="name"
                placeholder="Ex.: 32º Exame de Faixas — Segundo Semestre"
                required
                className="h-11"
              />
            </Field>

            <DateField id="exam-date" name="event_date" label="Data do exame" required />

            <Field>
              <FieldLabel htmlFor="exam-fee" className="text-xs sm:text-sm font-semibold">
                Taxa padrão por aluno (R$)
              </FieldLabel>
              <Input
                id="exam-fee"
                name="default_fee_reais"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="150,00"
                required
                className="h-11 font-mono font-medium"
              />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="exam-location" className="text-xs sm:text-sm font-semibold">
                Local da avaliação
              </FieldLabel>
              <Input
                id="exam-location"
                name="location"
                placeholder="Ex.: Dojang Central Ebener TKD"
                className="h-11"
              />
            </Field>

            <div className="sm:col-span-2 pt-2">
              <FormSubmitButton className="h-11 w-full font-medium" pendingLabel="Criando evento…">
                <Sparkles className="mr-2 size-4" />
                Cadastrar exame de faixa
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
            title="Exame cancelado com sucesso"
            description="O evento foi arquivado como cancelado no histórico."
            clearParams={["cancelled"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível criar o exame"
            description="Revise a data, local e valor estipulado e tente novamente."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={<CardGridSkeleton count={4} columns={2} />}>
          <ExamEventsContent />
        </Suspense>
      </div>
    </PortalShell>
  );
}
