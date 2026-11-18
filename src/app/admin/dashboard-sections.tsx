import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { ClipboardCheckIcon } from "@/components/ui/clipboard-check";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BillingOverviewChart } from "@/features/billing/components/billing-overview-chart";
import { listEnrollmentsForReview } from "@/features/students/service";
import { getBillingOverview } from "@/features/billing/report-service";
import { listTrainingClasses } from "@/features/classes/service";
import { getTodayWeekday } from "@/features/classes/schedule";
import { listExamEvents } from "@/features/exams/service";
import { ROUTES, adminClassPath, adminEnrollmentPath } from "@/lib/navigation/routes";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export async function UrgentTasksSection() {
  const results = await Promise.allSettled([
    listEnrollmentsForReview({ status: "submitted", page: 1 }),
    listEnrollmentsForReview({ status: "under_review", page: 1 }),
    getBillingOverview({ status: "proof_under_review", page: 1 }),
  ]);
  if (results.some((result) => result.status === "rejected")) {
    return <Alert variant="destructive"><AlertTitle>Não foi possível carregar pendências</AlertTitle><AlertDescription>Confira sua conexão e tente novamente.<Button asChild variant="outline" className="min-h-11"><Link href={ROUTES.admin}>Tentar novamente</Link></Button></AlertDescription></Alert>;
  }
  const [submitted, reviewing, billing] = results;
  if (submitted.status !== "fulfilled" || reviewing.status !== "fulfilled" || billing.status !== "fulfilled") return null;
  const enrollments = [...submitted.value.rows, ...reviewing.value.rows].filter((item, index, list) => list.findIndex((row) => row.student.$id === item.student.$id) === index);
  const proofs = billing.value.charges;
  if (!enrollments.length && !proofs.length) return <p className="text-sm text-muted-foreground">Tudo em dia. Nenhuma matrícula ou comprovante aguardando conferência.</p>;
  return <section className="space-y-3" aria-label="Pendências">
    <h2 className="text-base font-semibold">Aguardando sua conferência</h2>
    <ul className="divide-y divide-border">
      {enrollments.slice(0, 5).map(({ student, enrollment }) => <li key={student.$id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{student.full_name}</p><p className="text-sm text-muted-foreground">{enrollment?.status === "under_review" ? "Matrícula em análise" : "Matrícula enviada"}</p></div><Button asChild className="min-h-11" variant="outline"><Link href={adminEnrollmentPath(student.$id)}>Analisar<ArrowRightIcon aria-hidden="true" /></Link></Button></li>)}
      {proofs.slice(0, 5).map((charge) => {
        const name = billing.value.names.get(charge.student_id) ?? "Aluno não identificado";
        return <li key={charge.$id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{name}</p><p className="text-sm text-muted-foreground">Comprovante · {money(charge.amount_cents)}</p></div><Button asChild className="min-h-11" variant="outline"><Link href={`${ROUTES.adminBilling}?status=proof_under_review&student=${encodeURIComponent(name)}#cobranca-${charge.$id}`}>Conferir<ArrowRightIcon aria-hidden="true" /></Link></Button></li>;
      })}
    </ul>
    <div className="flex flex-wrap gap-3"><Button asChild variant="ghost" className="min-h-11"><Link href={ROUTES.adminEnrollments}>Ver matrículas</Link></Button><Button asChild variant="ghost" className="min-h-11"><Link href={`${ROUTES.adminBilling}?status=proof_under_review`}>Ver comprovantes</Link></Button></div>
  </section>;
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
  const exam = (await listExamEvents()).filter((item) => !["cancelled", "completed"].includes(item.status) && item.event_date.slice(0, 10) >= today).sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  return <section className="space-y-3"><h2 className="text-base font-semibold">Próximo exame de faixa</h2>{exam ? <div className="space-y-2"><p className="text-sm font-medium">{exam.name}</p><p className="text-sm">{new Date(exam.event_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {exam.location || "Local não informado"}</p><Button asChild variant="outline" className="min-h-11"><Link href={`${ROUTES.adminExams}/${exam.$id}`}>Ver exame<ArrowRightIcon aria-hidden="true" /></Link></Button></div> : <p className="text-sm text-muted-foreground">Nenhum exame agendado.</p>}</section>;
}
