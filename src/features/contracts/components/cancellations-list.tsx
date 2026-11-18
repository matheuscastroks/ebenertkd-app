import { ChevronDown } from "@/components/ui/icons";
import { decideCancellationAction } from "@/app/actions/cancellations";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationForm } from "@/features/billing/components/confirmation-form";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { listCancellationRequests } from "@/features/contracts/cancellation-service";
import { getContract } from "@/features/contracts/contract-service";
import { centsToReaisInput, formatBrl } from "@/lib/money";

type Row = { request: Awaited<ReturnType<typeof listCancellationRequests>>[number]; contract: Awaited<ReturnType<typeof getContract>> };

const exitMonth = (value: string) => new Date(value).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const day = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });

function PendingRequest({ request, contract }: Row) {
  const summary = [
    { label: "Aluno", value: contract.student_name },
    { label: "Saída", value: exitMonth(request.target_exit_month) },
    { label: "Taxa decidida", value: formatBrl(request.suggested_fee_cents), field: "fee_reais", kind: "money" as const },
    { label: "Justificativa", value: "", field: "notes" }
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{contract.student_name}</CardTitle>
            <CardDescription>Saída em {exitMonth(request.target_exit_month)} · aviso em {day(request.notice_date)}</CardDescription>
          </div>
          <StatusBadge tone="warning">Aguardando análise</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {request.reason ? (
          <div className="text-sm">
            <p className="font-medium">Motivo informado</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{request.reason}</p>
          </div>
        ) : null}

        <ConfirmationForm id={`cancel-${request.$id}`} action={decideCancellationAction} className="space-y-4 border-t border-border pt-4">
          <input type="hidden" name="request_id" value={request.$id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={`fee-${request.$id}`}>Taxa decidida (R$)</FieldLabel>
              <Input
                id={`fee-${request.$id}`} name="fee_reais"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                defaultValue={centsToReaisInput(request.suggested_fee_cents)}
                required
                className="h-11 tabular-nums"
              />
              <FieldDescription>Sugerida: {formatBrl(request.suggested_fee_cents)}, pelo aviso até o dia 20.</FieldDescription>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`notes-${request.$id}`}>Justificativa para o aluno</FieldLabel>
              <Textarea
                id={`notes-${request.$id}`} name="notes"
                required
                minLength={3}
                placeholder="Condições da saída ou motivo do valor decidido"
                className="min-h-20 text-sm"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ConsequenceDialog trigger={<Button type="button" variant="outline" className="min-h-11">Aprovar rescisão</Button>} title={`Rescisão de ${contract.student_name}`} summary={summary} effect="O contrato será encerrado nas condições informadas e o aluno será notificado." confirmLabel="Aprovar rescisão" action={decideCancellationAction} formId={`cancel-${request.$id}`} values={{ decision: "approved" }} />
            <ConsequenceDialog trigger={<Button type="button" variant="ghost" className="min-h-11">Rejeitar pedido</Button>} title={`Rescisão de ${contract.student_name}`} summary={summary} effect="O pedido será rejeitado. O contrato continua vigente e o aluno receberá a justificativa." confirmLabel="Rejeitar pedido" action={decideCancellationAction} formId={`cancel-${request.$id}`} values={{ decision: "rejected" }} />
          </div>
        </ConfirmationForm>
      </CardContent>
    </Card>
  );
}

function DecidedList({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map(({ request, contract }) => (
        <li key={request.$id} className="space-y-1 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{contract.student_name}</p>
            <StatusBadge tone={request.status === "approved" ? "success" : "neutral"}>{request.status === "approved" ? "Aprovado" : "Rejeitado"}</StatusBadge>
          </div>
          <p className="text-muted-foreground">Saída em {exitMonth(request.target_exit_month)} · taxa final <span className="tabular-nums">{formatBrl(request.decided_fee_cents ?? 0)}</span></p>
          <p className="text-muted-foreground">{request.decision_notes || "Sem observações registradas."}</p>
        </li>
      ))}
    </ul>
  );
}

export async function CancellationsList() {
  const requests = await listCancellationRequests();
  const rows: Row[] = await Promise.all(
    requests.map(async (request) => ({
      request,
      contract: await getContract(request.contract_id),
    }))
  );

  if (!rows.length) {
    return (
      <EmptyState
        title="Nenhuma solicitação de cancelamento"
        description="Quando um aluno ou responsável pedir para encerrar o contrato, o pedido aparece aqui para sua decisão."
      />
    );
  }

  const pending = rows.filter(({ request }) => request.status === "pending");
  const decided = rows.filter(({ request }) => request.status !== "pending");

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="pedidos-pendentes">
        <h2 id="pedidos-pendentes" className="text-base font-semibold">Aguardando decisão</h2>
        {pending.length ? (
          <div className="space-y-4">{pending.map((row) => <PendingRequest key={row.request.$id} {...row} />)}</div>
        ) : (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Nenhum pedido aguardando decisão.</p>
        )}
      </section>

      {decided.length ? (
        <details className="group space-y-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-open:-scale-y-100 motion-reduce:transition-none" aria-hidden="true" />
            Pedidos decididos ({decided.length})
          </summary>
          <DecidedList rows={decided} />
        </details>
      ) : null}
    </div>
  );
}
