import { decideCancellationAction } from "@/app/actions/cancellations";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { centsToReaisInput, formatBrl } from "@/lib/money";
import { listCancellationRequests } from "@/features/contracts/cancellation-service";
import { getContract } from "@/features/contracts/contract-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function CancellationsPage({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  const admin = await requireProfile("admin");
  const [requests, query] = await Promise.all([listCancellationRequests(), searchParams]);
  const rows = await Promise.all(requests.map(async (request) => ({ request, contract: await getContract(request.contract_id) })));
  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminContracts}
      title="Solicitações de cancelamento"
      subtitle="A sugestão segue a data do aviso; a decisão final permanece com o professor."
    >
      <OperationToast
        tone="success"
        title="Decisão registrada"
        description="A solicitação de cancelamento foi atualizada."
        id="cancellation-updated"
        clearParams={["updated"]}
        enabled={Boolean(query.updated)}
      />
      <OperationToast
        tone="error"
        title="Não foi possível registrar a decisão"
        description="Revise os dados e tente novamente."
        id="cancellation-error"
        clearParams={["error"]}
        enabled={Boolean(query.error)}
      />

      <div className="mx-auto max-w-5xl space-y-4">
        {rows.length ? (
          rows.map(({ request, contract }) => (
            <Card key={request.$id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{contract.student_name}</CardTitle>
                    <CardDescription>
                      Saída em {new Date(request.target_exit_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })} · aviso em {new Date(request.notice_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {request.status === "pending" ? (
                  <form action={decideCancellationAction} className="grid gap-4 md:grid-cols-3">
                    <input type="hidden" name="request_id" value={request.$id} />
                    <label className="grid gap-2">
                      <span className="text-sm font-medium">Taxa decidida (R$)</span>
                      <Input name="fee_reais" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={centsToReaisInput(request.suggested_fee_cents)} required />
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm font-medium">Justificativa</span>
                      <Textarea name="notes" required minLength={3} />
                    </label>
                    <div className="flex gap-2 md:col-span-3">
                      <Button name="decision" value="approved" type="submit">Aprovar saída</Button>
                      <Button name="decision" value="rejected" type="submit" variant="outline">Rejeitar</Button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Decisão: {request.decision_notes} · taxa {formatBrl(request.decided_fee_cents ?? 0)}.
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhuma solicitação registrada.
            </CardContent>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
