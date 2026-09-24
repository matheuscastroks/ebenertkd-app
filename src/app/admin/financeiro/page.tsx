import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FeedbackAlert } from "@/components/shared/feedback-alert";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChargeStatus } from "@/features/billing/types";
import { BillingTable } from "@/features/billing/components/billing-table";
import { getBillingOverview } from "@/features/billing/report-service";
import { listTrainingClasses } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const statusLabels = { pending: "Pendente", proof_under_review: "Em análise", paid: "Pago", overdue: "Inadimplente", cancelled: "Cancelado" } as const;
const allowedStatuses = new Set<ChargeStatus>(["pending", "proof_under_review", "paid", "overdue", "cancelled"]);

export default async function AdminBillingPage({ searchParams }: { searchParams: Promise<{ status?: string; competence?: string; student?: string; trainingClass?: string; type?: string; error?: string; updated?: string }> }) {
  const actor = await requireProfile("admin");
  const params = await searchParams;
  const status = allowedStatuses.has(params.status as ChargeStatus) ? params.status as ChargeStatus : undefined;
  const types = new Set(["monthly_fee", "enrollment_fee", "exam_fee", "exit_fee"] as const);
  const type = types.has(params.type as never) ? params.type as "monthly_fee" | "enrollment_fee" | "exam_fee" | "exit_fee" : undefined;
  const trainingClass = params.trainingClass === "all" ? undefined : params.trainingClass;
  const [data, classes] = await Promise.all([getBillingOverview({ status, competence: /^\d{4}-\d{2}$/.test(params.competence ?? "") ? params.competence : undefined, student: params.student, trainingClass, type }), listTrainingClasses(true)]);
  const exportQuery = new URLSearchParams({ ...(status ? { status } : {}), ...(params.competence ? { competence: params.competence } : {}), ...(params.student ? { student: params.student } : {}), ...(trainingClass ? { trainingClass } : {}), ...(type ? { type } : {}) });
  return <PortalShell profile={actor} activePath={ROUTES.adminBilling} title="Financeiro" subtitle="Cobranças, comprovantes e recebimentos em uma visão operacional.">
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Recebido no mês" value={money(data.summary.receivedCents)} tone="success" /><MetricCard label="Pendente" value={money(data.summary.pendingCents)} tone="warning" /><MetricCard label="Inadimplente" value={money(data.summary.overdueCents)} tone="danger" /><MetricCard label="Em análise" value={money(data.summary.underReviewCents)} tone="info" /></div>
      <p className="text-sm text-muted-foreground">No período: <strong className="text-foreground">{data.summary.paidCharges}</strong> cobrança(s) paga(s) por <strong className="text-foreground">{data.summary.distinctPayingStudents}</strong> aluno(s) distinto(s).</p>
      <div className="space-y-3 rounded-xl border bg-card p-4"><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><Field><FieldLabel htmlFor="billing-student">Aluno</FieldLabel><Input id="billing-student" name="student" placeholder="Buscar nome" defaultValue={params.student} /></Field><Field><FieldLabel htmlFor="billing-competence">Competência</FieldLabel><Input id="billing-competence" name="competence" type="month" defaultValue={params.competence} /></Field><Field><FieldLabel htmlFor="billing-class">Turma</FieldLabel><Select name="trainingClass" defaultValue={trainingClass ?? "all"}><SelectTrigger id="billing-class" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{classes.map((item) => <SelectItem key={item.$id} value={item.$id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel htmlFor="billing-type">Tipo</FieldLabel><Select name="type" defaultValue={type ?? "all"}><SelectTrigger id="billing-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="monthly_fee">Mensalidade</SelectItem><SelectItem value="enrollment_fee">Matrícula</SelectItem><SelectItem value="exam_fee">Exame</SelectItem><SelectItem value="exit_fee">Saída</SelectItem></SelectContent></Select></Field><Field><FieldLabel htmlFor="billing-status">Status</FieldLabel><Select name="status" defaultValue={status ?? "all"}><SelectTrigger id="billing-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><div className="flex items-end gap-2"><Button type="submit" className="flex-1">Aplicar</Button><Button asChild variant="outline"><Link href={ROUTES.adminBilling}>Limpar</Link></Button></div></form><div className="flex flex-wrap justify-end gap-2"><Button asChild variant="outline"><Link href={`${ROUTES.adminBilling}/exportar?${exportQuery}`}>Exportar CSV</Link></Button><Button asChild><Link href={ROUTES.adminBillingSettings}>Configurar PIX</Link></Button></div></div>
      {params.error ? <FeedbackAlert tone="danger" title="Não foi possível concluir a operação" description="Revise os dados e tente novamente." /> : null}{params.updated ? <FeedbackAlert tone="success" title="Operação registrada com sucesso" /> : null}
      {data.charges.length === 0 ? <EmptyState title="Nenhuma cobrança encontrada" description="Ajuste os filtros para consultar outro período ou grupo de alunos." action={<Button asChild variant="outline"><Link href={ROUTES.adminBilling}>Limpar filtros</Link></Button>} /> : <BillingTable charges={data.charges} names={data.names} proofsByCharge={data.proofsByCharge} payments={data.payments} />}
    </div>
  </PortalShell>;
}
