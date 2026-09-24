import Link from "next/link";
import { adjustChargeAction, decidePaymentProofAction, recordManualPaymentAction, reversePaymentAction } from "@/app/actions/billing";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ChargeStatus } from "@/features/billing/types";
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
  const [data, classes] = await Promise.all([getBillingOverview({ status, competence: /^\d{4}-\d{2}$/.test(params.competence ?? "") ? params.competence : undefined, student: params.student, trainingClass: params.trainingClass, type }), listTrainingClasses(true)]);
  return <PortalShell profile={actor} activePath={ROUTES.adminBilling} title="Financeiro" subtitle="Cobranças, comprovantes e recebimentos em uma visão operacional.">
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Recebido no mês', data.summary.receivedCents], ['Pendente', data.summary.pendingCents], ['Inadimplente', data.summary.overdueCents], ['Em análise', data.summary.underReviewCents]].map(([label, value]) => <Card key={String(label)}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{money(Number(value))}</p></CardContent></Card>)}
      </div>
      <p className="text-sm text-muted-foreground">No período: <strong className="text-foreground">{data.summary.paidCharges}</strong> cobrança(s) paga(s) por <strong className="text-foreground">{data.summary.distinctPayingStudents}</strong> aluno(s) distinto(s).</p>
      <div className="flex flex-wrap items-end justify-between gap-3"><form className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-sm">Aluno<Input name="student" placeholder="Buscar nome" defaultValue={params.student} /></label><label className="grid gap-1 text-sm">Competência<Input name="competence" type="month" defaultValue={params.competence} /></label><label className="grid gap-1 text-sm">Turma<select name="trainingClass" defaultValue={params.trainingClass ?? ""} className="h-9 rounded-md border bg-background px-3"><option value="">Todas</option>{classes.map((item) => <option key={item.$id} value={item.$id}>{item.name}</option>)}</select></label><label className="grid gap-1 text-sm">Tipo<select name="type" defaultValue={type ?? ""} className="h-9 rounded-md border bg-background px-3"><option value="">Todos</option><option value="monthly_fee">Mensalidade</option><option value="enrollment_fee">Matrícula</option><option value="exam_fee">Exame</option><option value="exit_fee">Saída</option></select></label><label className="grid gap-1 text-sm">Status<select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border bg-background px-3"><option value="">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Button type="submit">Filtrar</Button></form><div className="flex gap-2"><Button asChild variant="outline"><Link href={`${ROUTES.adminBilling}/exportar?${new URLSearchParams({ ...(status ? { status } : {}), ...(params.competence ? { competence: params.competence } : {}), ...(params.student ? { student: params.student } : {}), ...(params.trainingClass ? { trainingClass: params.trainingClass } : {}), ...(type ? { type } : {}) })}`}>Exportar CSV</Link></Button><Button asChild><Link href={ROUTES.adminBillingSettings}>Configurar PIX</Link></Button></div></div>
      {params.error ? <p className="text-sm text-destructive">Não foi possível concluir a operação. Revise os dados.</p> : null}{params.updated ? <p className="text-sm text-emerald-700">Operação registrada com sucesso.</p> : null}
      <div className="space-y-4">{data.charges.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma cobrança para o filtro informado.</CardContent></Card> : data.charges.map((charge) => {
        const proof = data.proofsByCharge.get(charge.$id);
        const payment = data.payments.find((item) => item.charge_id === charge.$id && item.status === "confirmed");
        return <Card key={charge.$id}><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">{data.names.get(charge.student_id) ?? "Aluno"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{charge.description} · vence {charge.due_date.slice(0, 10)}</p></div><Badge variant={charge.status === "overdue" ? "destructive" : "outline"}>{statusLabels[charge.status]}</Badge></CardHeader><CardContent className="space-y-4"><p className="text-xl font-semibold">{money(charge.amount_cents)}</p>
          {proof ? <div className="rounded-lg border p-3"><p className="mb-3 text-sm">Comprovante v{proof.version} · <Link className="underline" href={`/api/payment-proofs/${proof.$id}`}>visualizar arquivo</Link></p><div className="flex flex-wrap gap-2"><form action={decidePaymentProofAction} className="flex flex-wrap gap-2"><input type="hidden" name="proof_id" value={proof.$id} /><input type="hidden" name="decision" value="approved" /><Input name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><Button type="submit">Aprovar</Button></form><form action={decidePaymentProofAction} className="flex flex-wrap gap-2"><input type="hidden" name="proof_id" value={proof.$id} /><input type="hidden" name="decision" value="rejected" /><Input name="reason" placeholder="Motivo da recusa" required /><Button type="submit" variant="destructive">Recusar</Button></form></div></div> : null}
          {["pending", "overdue", "proof_under_review"].includes(charge.status) ? <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Registrar pagamento manual ou ajustar</summary><div className="mt-4 grid gap-4 lg:grid-cols-2"><form action={recordManualPaymentAction} className="grid gap-2"><input type="hidden" name="charge_id" value={charge.$id} /><Input name="amount_cents" type="number" min="1" defaultValue={charge.amount_cents} required /><Input name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><Input name="notes" placeholder="Observação do recebimento" required /><Button type="submit">Confirmar manualmente</Button></form><form action={adjustChargeAction} className="grid gap-2"><input type="hidden" name="charge_id" value={charge.$id} /><Input name="amount_cents" type="number" min="0" defaultValue={charge.amount_cents} required /><Input name="due_date" type="date" defaultValue={charge.due_date.slice(0, 10)} required /><Input name="reason" placeholder="Motivo do ajuste" required /><Button type="submit" variant="outline">Salvar ajuste</Button></form></div></details> : null}
          {payment ? <form action={reversePaymentAction} className="flex flex-wrap gap-2"><input type="hidden" name="payment_id" value={payment.$id} /><Input name="reason" placeholder="Motivo do estorno" required /><Button type="submit" variant="outline">Estornar pagamento</Button></form> : null}
        </CardContent></Card>;
      })}</div>
    </div>
  </PortalShell>;
}
