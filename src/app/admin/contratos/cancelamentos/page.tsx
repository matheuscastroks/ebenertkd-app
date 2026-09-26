import { decideCancellationAction } from "@/app/actions/cancellations";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { centsToReaisInput, formatBrl } from "@/lib/money";
import { listCancellationRequests } from "@/features/contracts/cancellation-service";
import { getContract } from "@/features/contracts/contract-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { AlertTriangle, Calendar, CheckCircle2, Clock, UserRound, XCircle } from "lucide-react";

export default async function CancellationsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const admin = await requireProfile("admin");
  const [requests, query] = await Promise.all([listCancellationRequests(), searchParams]);
  const rows = await Promise.all(
    requests.map(async (request) => ({
      request,
      contract: await getContract(request.contract_id),
    }))
  );

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminContracts}
      title="Solicitações de cancelamento"
      subtitle="A taxa sugerida leva em conta o aviso prévio até o dia 20; a decisão de isenção ou cobrança cabe ao professor."
      breadcrumbs={[
        { label: "Contratos", href: ROUTES.adminContracts },
        { label: "Cancelamentos" },
      ]}
    >
      <OperationToast
        tone="success"
        title="Decisão registrada com sucesso"
        description="A solicitação de cancelamento foi atualizada e o status arquivado."
        id="cancellation-updated"
        clearParams={["updated"]}
        enabled={Boolean(query.updated)}
      />
      <OperationToast
        tone="error"
        title="Não foi possível registrar a decisão"
        description="Revise os valores e justificativa informados e tente novamente."
        id="cancellation-error"
        clearParams={["error"]}
        enabled={Boolean(query.error)}
      />

      <div className="w-full min-w-0 space-y-4">
        {rows.length ? (
          rows.map(({ request, contract }) => {
            const isPending = request.status === "pending";
            const isApproved = request.status === "approved";

            return (
              <Card key={request.$id} className="border-border/80 shadow-sm transition-all hover:border-border">
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
                    <form action={decideCancellationAction} className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>Sugestão de cálculo automático: {formatBrl(request.suggested_fee_cents)}</span>
                      </div>

                      <input type="hidden" name="request_id" value={request.$id} />
                      <div className="grid gap-4 sm:grid-cols-3">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold">Taxa decidida (R$)</span>
                          <Input
                            name="fee_reais"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            defaultValue={centsToReaisInput(request.suggested_fee_cents)}
                            required
                            className="h-11 font-mono font-medium"
                          />
                        </label>
                        <label className="grid gap-2 sm:col-span-2">
                          <span className="text-sm font-semibold">Justificativa para o aluno</span>
                          <Textarea
                            name="notes"
                            required
                            minLength={3}
                            placeholder="Descreva as condições da rescisão ou motivo do valor decidido..."
                            className="min-h-[44px] rounded-xl resize-none text-sm"
                          />
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                          name="decision"
                          value="approved"
                          type="submit"
                          className="h-11 font-medium sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="mr-2 size-4" />
                          Aprovar rescisão
                        </Button>
                        <Button
                          name="decision"
                          value="rejected"
                          type="submit"
                          variant="outline"
                          className="h-11 font-medium sm:flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="mr-2 size-4" />
                          Rejeitar pedido
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs sm:text-sm">
                      <div>
                        <span className="font-semibold">Decisão: </span>
                        <span className="text-muted-foreground">{request.decision_notes || "Sem observações registradas."}</span>
                      </div>
                      <div className="font-medium">
                        Taxa final: <span className="font-bold text-foreground font-mono">{formatBrl(request.decided_fee_cents ?? 0)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <CheckCircle2 className="size-10 text-muted-foreground/60 mb-3" />
              <p className="font-semibold text-foreground">Nenhuma solicitação de cancelamento</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Quando alunos ou responsáveis solicitarem encerramento do contrato, elas aparecerão aqui para moderação.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
