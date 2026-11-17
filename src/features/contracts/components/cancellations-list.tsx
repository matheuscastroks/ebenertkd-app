import { Field, FieldLabel } from "@/components/ui/field";
import { ConfirmationForm } from "@/features/billing/components/confirmation-form";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { Suspense } from "react";
import { decideCancellationAction } from "@/app/actions/cancellations";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ListItemsSkeleton } from "@/components/skeletons";
import { centsToReaisInput, formatBrl } from "@/lib/money";
import { listCancellationRequests } from "@/features/contracts/cancellation-service";
import { getContract } from "@/features/contracts/contract-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { AlertTriangle, Calendar, CheckCircle2, Clock, UserRound, XCircle } from "lucide-react";

export async function CancellationsList() {
  const requests = await listCancellationRequests();
  const rows = await Promise.all(
    requests.map(async (request) => ({
      request,
      contract: await getContract(request.contract_id),
    }))
  );

  if (!rows.length) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <CheckCircle2 className="size-10 text-muted-foreground/60 mb-3" />
          <p className="font-semibold text-foreground">Nenhuma solicitação de cancelamento</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Quando alunos ou responsáveis solicitarem encerramento do contrato, elas aparecerão aqui para moderação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map(({ request, contract }) => {
        const isPending = request.status === "pending";
        const isApproved = request.status === "approved";

        return (
          <Card key={request.$id} className="border-border/80 shadow-sm transition-colors hover:border-border">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <UserRound className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{contract.student_name}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        Saída: {new Date(request.target_exit_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        Aviso: {new Date(request.notice_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div>
                  <StatusBadge tone={isPending ? "warning" : isApproved ? "success" : "neutral"}>
                    {isPending ? "Pendente de análise" : isApproved ? "Aprovado" : "Rejeitado"}
                  </StatusBadge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {request.reason ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs sm:text-sm">
                  <span className="font-semibold block text-foreground mb-1">Motivo alegado pelo solicitante:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{request.reason}</p>
                </div>
              ) : null}

              {isPending ? (
                <ConfirmationForm id={`cancel-${request.$id}`} action={decideCancellationAction} className="rounded-xl border border-border bg-warning-soft p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-warning-foreground dark:text-warning-foreground">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>Sugestão de cálculo automático: {formatBrl(request.suggested_fee_cents)}</span>
                  </div>

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
                        className="h-11 font-mono font-medium"
                      />
                    </Field>
                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor={`notes-${request.$id}`}>Justificativa para o aluno</FieldLabel>
                      <Textarea
                        id={`notes-${request.$id}`} name="notes"
                        required
                        minLength={3}
                        placeholder="Descreva as condições da rescisão ou motivo do valor decidido..."
                        className="min-h-[44px] rounded-xl resize-none text-sm"
                      />
                    </Field>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <ConsequenceDialog trigger={<Button type="button" variant="default" className="min-h-11">Aprovar rescisão</Button>} title={`Rescisão de ${contract.student_name}`} summary={[{ label: "Aluno", value: contract.student_name }, { label: "Saída", value: new Date(request.target_exit_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }) }, { label: "Taxa decidida", value: formatBrl(request.suggested_fee_cents), field: "fee_reais", kind: "money" }, { label: "Justificativa", value: "", field: "notes" }]} effect="O contrato será encerrado nas condições informadas e o aluno será notificado." confirmLabel="Aprovar rescisão" action={decideCancellationAction} formId={`cancel-${request.$id}`} values={{ decision: "approved" }} />
                    <ConsequenceDialog trigger={<Button type="button" variant="outline" className="min-h-11">Rejeitar pedido</Button>} title={`Rescisão de ${contract.student_name}`} summary={[{ label: "Aluno", value: contract.student_name }, { label: "Saída", value: new Date(request.target_exit_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }) }, { label: "Taxa decidida", value: formatBrl(request.suggested_fee_cents), field: "fee_reais", kind: "money" }, { label: "Justificativa", value: "", field: "notes" }]} effect="O pedido será rejeitado. O contrato continua vigente e o aluno receberá a justificativa." confirmLabel="Rejeitar pedido" action={decideCancellationAction} formId={`cancel-${request.$id}`} values={{ decision: "rejected" }} />
                  </div>
                </ConfirmationForm>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold">Decisão: </span>
                    <span className="text-muted-foreground">{request.decision_notes || "Sem observações registradas."}</span>
                  </div>
                  <div className="font-medium">
                    Taxa final: <span className="font-semibold text-foreground font-mono">{formatBrl(request.decided_fee_cents ?? 0)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

