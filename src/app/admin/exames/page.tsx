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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { listExamEvents } from "@/features/exams/service";
import { formatBrl } from "@/lib/money";
import { adminExamPath, ROUTES } from "@/lib/navigation/routes";
import { requireProfile } from "@/lib/auth/session";
import { Award, Calendar, DollarSign, MapPin, Plus, Sparkles } from "lucide-react";
import { CardGridSkeleton } from "@/components/skeletons";

const labels = {
  planned: "Planejado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
} as const;

const tones = {
  planned: "neutral",
  confirmed: "info",
  completed: "success",
  cancelled: "danger",
} as const;

async function ExamEventsList() {
  const events = await listExamEvents();

  if (events.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Award className="size-10 text-muted-foreground/60 mb-3" />
          <p className="font-semibold text-foreground">Nenhum exame de faixa agendado</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Crie o primeiro exame de graduação para abrir as inscrições aos alunos elegíveis da academia.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {events.map((event) => (
        <Card
          key={event.$id}
          className="flex flex-col justify-between border-border/80 shadow-sm transition-all hover:border-border"
        >
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Award className="size-5" />
              </div>
              <StatusBadge tone={tones[event.status]}>{labels[event.status]}</StatusBadge>
            </div>

            <div>
              <CardTitle className="text-base font-semibold leading-tight">
                {event.name}
              </CardTitle>
              <CardDescription className="flex flex-col gap-1.5 mt-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    {new Date(event.event_date).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>{event.location ?? "Local a definir"}</span>
                </span>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <DollarSign className="size-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Taxa:</span>
              <strong className="text-sm font-mono text-foreground">
                {formatBrl(event.default_fee_cents)}
              </strong>
            </div>

            <Button asChild className="h-10 font-medium px-4">
              <Link href={adminExamPath(event.$id)}>Gerenciar exame</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
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

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Eventos agendados</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Selecione um evento para inscrever praticantes aptos e registrar os resultados de graduação.
              </p>
            </div>
          </div>

          <Suspense fallback={<CardGridSkeleton count={4} columns={2} />}>
            <ExamEventsList />
          </Suspense>
        </section>
      </div>
    </PortalShell>
  );
}
