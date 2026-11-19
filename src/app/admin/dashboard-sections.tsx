import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { ClipboardCheckIcon } from "@/components/ui/clipboard-check";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/shared/status-badge";
import { BillingOverviewChart } from "@/features/billing/components/billing-overview-chart";
import { getAcademyIdentity } from "@/features/academy/config-service";
import { listEnrollmentsForReview } from "@/features/students/service";
import { getBillingOverview } from "@/features/billing/report-service";
import { listTrainingClasses } from "@/features/classes/service";
import { getTodayWeekday } from "@/features/classes/schedule";
import { listExamEvents } from "@/features/exams/service";
import { ROUTES, adminClassPath, adminEnrollmentPath } from "@/lib/navigation/routes";
import { Calendar, FileText, MapPin, ReceiptText } from "@/components/ui/icons";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

/** Cartão "Configure sua academia": aparece enquanto o assistente de primeiros passos não foi concluído. Não bloqueia o painel. */
export async function SetupCardSection() {
  const identity = await getAcademyIdentity();
  if (identity.setup_completed_at) return null;
  return (
    <Alert>
      <AlertTitle>Configure sua academia</AlertTitle>
      <AlertDescription>
        Em cinco passos curtos você confirma nome, graduações, mensalidade, PIX e contrato. Tudo já funciona com os valores atuais; ajuste quando quiser.
        <Button asChild className="min-h-11 mt-2">
          <Link href={ROUTES.adminAcademySetup}>Começar configuração</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export async function UrgentTasksSection() {
  const results = await Promise.allSettled([
    listEnrollmentsForReview({ status: "submitted", page: 1 }),
    listEnrollmentsForReview({ status: "under_review", page: 1 }),
    getBillingOverview({ status: "proof_under_review", page: 1 }),
  ]);
  if (results.some((result) => result.status === "rejected")) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar pendências</AlertTitle>
        <AlertDescription>
          Confira sua conexão e tente novamente.
          <Button asChild variant="outline" className="min-h-11 mt-2">
            <Link href={ROUTES.admin}>Tentar novamente</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const [submitted, reviewing, billing] = results;
  if (submitted.status !== "fulfilled" || reviewing.status !== "fulfilled" || billing.status !== "fulfilled") return null;
  const enrollments = [...submitted.value.rows, ...reviewing.value.rows].filter(
    (item, index, list) => list.findIndex((row) => row.student.$id === item.student.$id) === index
  );
  const proofs = billing.value.charges;
  const totalUrgent = enrollments.length + proofs.length;

  if (!enrollments.length && !proofs.length) {
    return (
      <section className="space-y-3" aria-label="Pendências">
        <h2 className="text-base font-semibold">Aguardando sua conferência</h2>
        <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground shadow-xs">
          Tudo em dia! Nenhuma matrícula ou comprovante aguardando conferência no momento.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-label="Pendências">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Aguardando sua conferência</h2>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-text tabular-nums">
            {totalUrgent} {totalUrgent === 1 ? "item" : "itens"}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
        <ul className="t-stagger divide-y divide-border">
          {enrollments.slice(0, 5).map(({ student, enrollment }) => (
            <li
              key={student.$id}
              className="t-interactive-row flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/40 sm:px-5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {enrollment?.status === "under_review" ? "Matrícula em análise" : "Nova matrícula enviada"}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="min-h-9 shrink-0">
                <Link href={adminEnrollmentPath(student.$id)}>
                  Analisar
                  <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </li>
          ))}

          {proofs.slice(0, 5).map((charge) => {
            const name = billing.value.names.get(charge.student_id) ?? "Aluno não identificado";
            return (
              <li
                key={charge.$id}
                className="t-interactive-row flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/40 sm:px-5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
                    <ReceiptText className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      Comprovante PIX · <span className="tabular-nums font-medium">{money(charge.amount_cents)}</span>
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="min-h-9 shrink-0">
                  <Link href={`${ROUTES.adminBilling}?status=proof_under_review&student=${encodeURIComponent(name)}#cobranca-${charge.$id}`}>
                    Conferir
                    <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/20 px-4 py-2.5 sm:px-5">
          <Button asChild variant="ghost" size="sm" className="min-h-9 text-xs text-muted-foreground hover:text-foreground">
            <Link href={ROUTES.adminEnrollments}>Ver todas as matrículas ({enrollments.length})</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="min-h-9 text-xs text-muted-foreground hover:text-foreground">
            <Link href={`${ROUTES.adminBilling}?status=proof_under_review`}>Ver todos os comprovantes ({proofs.length})</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Hora atual em São Paulo no formato HH:MM, para destacar o próximo treino do dia. */
function nowTime() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function TodayClassesSection() {
  const classes = (await listTrainingClasses()).filter((item) => item.status === "active" && item.weekdays.includes(getTodayWeekday())).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const now = nowTime();
  // Só o próximo treino (ou o que está acontecendo) recebe a ação primária da tela.
  const nextId = (classes.find((item) => item.end_time > now) ?? classes.at(-1))?.$id;
  return <section className="space-y-3" aria-label="Treinos de hoje">
    <h2 className="text-base font-semibold">Treinos de hoje</h2>
    {classes.length ? <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {classes.map((item) => <li key={item.$id} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground"><span className="tabular-nums">{item.start_time} às {item.end_time}</span> · {item.location || "Local não informado"}</p>
        </div>
        <Button asChild variant={item.$id === nextId ? "default" : "outline"} className="min-h-11"><Link href={adminClassPath(item.$id)}><ClipboardCheckIcon aria-hidden="true" />Fazer chamada</Link></Button>
      </li>)}
    </ul> : <p className="text-sm text-muted-foreground">Nenhum treino agendado para hoje. A grade fica em Turmas.</p>}
  </section>;
}

export async function AdminMetricsSection() {
  const billing = await getBillingOverview({ page: 1 });
  return (
    <section
      aria-label="Resumo financeiro"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border"
    >
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-4 sm:px-5">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
            Recebido no mês
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-success-foreground">
            {money(billing.summary.receivedCents)}
          </p>
        </div>
        <div className="p-4 sm:px-5">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span
              className={
                billing.summary.overdueCents > 0
                  ? "size-2 shrink-0 rounded-full bg-destructive"
                  : "size-2 shrink-0 rounded-full bg-muted-foreground"
              }
              aria-hidden="true"
            />
            Mensalidades em atraso
          </p>
          <p
            className={
              billing.summary.overdueCents > 0
                ? "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-destructive"
                : "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground"
            }
          >
            {money(billing.summary.overdueCents)}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Comparativo financeiro do mês</p>
        <BillingOverviewChart
          monthlySeries={billing.monthlySeries}
          receivedCents={billing.summary.receivedCents}
          pendingCents={billing.summary.pendingCents}
          overdueCents={billing.summary.overdueCents}
          underReviewCents={billing.summary.underReviewCents}
        />
      </div>
    </section>
  );
}

export async function NextExamSection() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const exam = (await listExamEvents())
    .filter((item) => !["cancelled", "completed"].includes(item.status) && item.event_date.slice(0, 10) >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  return (
    <section className="space-y-3" aria-label="Próximo exame">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Próximo exame de faixa</h2>
        {exam ? (
          <Button asChild variant="ghost" size="sm" className="min-h-9 text-xs text-muted-foreground hover:text-foreground">
            <Link href={ROUTES.adminExams}>Ver todas as bancas</Link>
          </Button>
        ) : null}
      </div>

      {exam ? (
        <div className="t-interactive-row flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-4 min-w-0">
            {/* Bloco de Data Estilo Calendário Apple */}
            <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-center select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-text">
                {new Date(exam.event_date).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "")}
              </span>
              <span className="text-lg font-bold leading-none tabular-nums text-foreground">
                {new Date(exam.event_date).toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "UTC" })}
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <p className="truncate text-base font-semibold text-foreground">{exam.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {new Date(exam.event_date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {exam.location || "Local a definir"}
                </span>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" className="min-h-11 shrink-0 font-medium">
            <Link href={`${ROUTES.adminExams}/${exam.$id}`}>
              Abrir banca de exame
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-center shadow-xs sm:p-8">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Calendar className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhum exame de faixa agendado</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Crie uma banca para agendar a próxima data de avaliação e começar a inscrever os alunos elegíveis.
          </p>
          <Button asChild size="sm" variant="outline" className="min-h-9 mt-2">
            <Link href={ROUTES.adminExams}>Acessar bancas de exame</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
