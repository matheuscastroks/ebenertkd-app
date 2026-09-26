import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingOverview } from "@/features/billing/report-service";
import { listTrainingClasses } from "@/features/classes/service";
import { listExamEvents } from "@/features/exams/service";
import { countEnrollmentsRequiringReview } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import {
  AlertCircle,
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  UsersRound,
  WalletCards
} from "lucide-react";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export default async function AdminPage() {
  const profile = await requireProfile("admin");
  const [pendingEnrollments, classes, billing, exams] = await Promise.all([
    countEnrollmentsRequiringReview(),
    listTrainingClasses(),
    getBillingOverview({ page: 1 }),
    listExamEvents()
  ]);

  const upcomingExam = exams
    .filter(
      (exam) =>
        exam.status !== "cancelled" &&
        exam.status !== "completed" &&
        exam.event_date.slice(0, 10) >= new Date().toISOString().slice(0, 10)
    )
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  const hasPendingEnrollments = pendingEnrollments > 0;
  const hasPendingProofs = billing.summary.underReviewCents > 0;
  const hasUrgentTasks = hasPendingEnrollments || hasPendingProofs;

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.admin}
      title={`Olá, ${profile.full_name.split(" ")[0]}`}
      subtitle="Acompanhe as tarefas pendentes e o resumo operacional de hoje."
    >
      {/* 1. Tarefas que exigem atenção imediata (Hierarquia de Causa e Efeito) */}
      {hasUrgentTasks ? (
        <Card className="border-warning/50 bg-warning/5 dark:bg-warning/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-warning" aria-hidden="true" />
              <CardTitle className="text-base font-semibold">
                Itens aguardando sua conferência
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              {hasPendingEnrollments ? (
                <p>
                  <strong>{pendingEnrollments}</strong> matrícula
                  {pendingEnrollments === 1 ? "" : "s"} precisa
                  {pendingEnrollments === 1 ? "" : "m"} de análise documental e aprovação.
                </p>
              ) : null}
              {hasPendingProofs ? (
                <p>
                  Comprovantes de pagamento aguardando conferência (
                  <strong>{money(billing.summary.underReviewCents)}</strong> em análise).
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {hasPendingEnrollments ? (
                <Button asChild size="sm">
                  <Link href={ROUTES.adminEnrollments}>
                    <ClipboardCheck aria-hidden="true" />
                    Analisar matrículas
                  </Link>
                </Button>
              ) : null}
              {hasPendingProofs ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ROUTES.adminBilling}?status=proof_under_review`}>
                    <FileCheck aria-hidden="true" />
                    Conferir comprovantes
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
          <span>Nenhuma matrícula ou comprovante pendente de conferência no momento.</span>
        </div>
      )}

      {/* 2. Resumo Operacional Financeiro e de Treinos */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo operacional">
        <MetricCard
          label="Recebido no mês"
          value={money(billing.summary.receivedCents)}
          tone="success"
          helper={`${billing.summary.distinctPayingStudents} aluno${billing.summary.distinctPayingStudents === 1 ? "" : "s"} com mensalidade paga`}
          icon={<WalletCards aria-hidden="true" />}
        />
        <MetricCard
          label="Mensalidades em atraso"
          value={money(billing.summary.overdueCents)}
          tone={billing.summary.overdueCents > 0 ? "danger" : "neutral"}
          helper={billing.summary.overdueCents > 0 ? "Exige cobrança ou contato" : "Nenhum atraso"}
          icon={<AlertCircle aria-hidden="true" />}
        />
        <MetricCard
          label="Turmas ativas"
          value={classes.length}
          helper="Grade semanal da academia"
          icon={<CalendarDays aria-hidden="true" />}
        />
        <MetricCard
          label="Alunos adimplentes"
          value={billing.summary.distinctPayingStudents}
          tone="info"
          icon={<UsersRound aria-hidden="true" />}
        />
      </section>

      {/* 3. Agenda de Exames e Ações Operacionais */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Próximo exame de faixa</CardTitle>
              <Award className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingExam ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{upcomingExam.name}</span>
                  <Badge variant="secondary">
                    {new Date(upcomingExam.event_date).toLocaleDateString("pt-BR", {
                      timeZone: "UTC"
                    })}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Local: {upcomingExam.location || "Dojô principal"}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ROUTES.adminExams}/${upcomingExam.$id}`}>
                    Ver inscritos e detalhes
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Nenhum exame de graduação agendado para as próximas semanas.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href={ROUTES.adminExams}>Planejar novo exame</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operação diária</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Acesse rapidamente as turmas para chamada ou emita novos comunicados para os alunos.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.adminClasses}>Gerenciar turmas e chamada</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.adminBilling}>Visão financeira completa</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.notifications}>Enviar aviso</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
