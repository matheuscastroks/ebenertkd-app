import { ChevronDown, FileCheck, FileDown, FileText, AlertCircle } from "lucide-react";
import { requestCancellationAction } from "@/app/actions/cancellations";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/features/contracts/components/signature-pad";
import type { Contract } from "@/features/contracts/types";

export function ContractWorkspace({
  contract,
  canSign,
  notice,
}: {
  contract: Contract;
  canSign: boolean;
  notice?: string;
}) {
  const hasSignedPdf = Boolean(contract.signed_at && contract.pdf_file_id);
  const statusLabel =
    contract.status === "cancelled"
      ? "Cancelado"
      : contract.status === "expired"
        ? "Vencido"
        : hasSignedPdf
          ? "Assinado"
          : "Aguardando assinatura";

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const defaultExitMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="w-full min-w-0 space-y-6">
      {notice ? (
        <OperationToast
          tone={notice.includes("Não") ? "error" : "success"}
          title={notice}
          clearParams={["signed", "requested", "error"]}
        />
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {hasSignedPdf ? <FileCheck className="size-5" /> : <FileText className="size-5" />}
              </div>
              <div>
                <CardTitle className="text-lg">Contrato de {contract.student_name}</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  Versão {contract.version_number} • Vigência até{" "}
                  {new Date(contract.ends_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </CardDescription>
              </div>
            </div>
            <div>
              <StatusBadge
                tone={
                  contract.status === "cancelled" || contract.status === "expired"
                    ? "danger"
                    : hasSignedPdf
                      ? "success"
                      : "warning"
                }
              >
                {statusLabel}
              </StatusBadge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {hasSignedPdf ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <FileCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Documento assinado digitalmente e preservado
                  </p>
                  <p className="text-xs text-muted-foreground break-all font-mono">
                    SHA-256: {contract.pdf_hash}
                  </p>
                </div>
                <Button asChild className="h-11 font-medium shrink-0 w-full sm:w-auto">
                  <a href={`/api/contracts/${contract.$id}/pdf`} target="_blank" rel="noreferrer">
                    <FileDown className="mr-2 size-4" />
                    Baixar PDF assinado
                  </a>
                </Button>
              </div>
            </div>
          ) : canSign ? (
            <SignaturePad contractId={contract.$id} content={contract.content_snapshot} />
          ) : (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/80 bg-muted/10 p-5 text-xs sm:text-sm leading-relaxed font-mono">
                {contract.content_snapshot}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                <AlertCircle className="size-4 shrink-0" />
                <span>A assinatura deve ser realizada pelo aluno adulto ou pelo responsável legal vinculado na plataforma.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {contract.status === "signed" ? (
        <Collapsible>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Solicitar encerramento / rescisão</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    Notificações realizadas até o dia 20 do mês anterior isentam mensalidade extra. Após essa data, o sistema sugere 1 mensalidade de aviso prévio.
                  </CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="h-10 shrink-0 font-medium">
                    Opções de encerramento
                    <ChevronDown className="ml-2 size-4 transition-transform duration-200" aria-hidden="true" />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-2 border-t border-border/40">
                <form action={requestCancellationAction} className="grid gap-4 sm:grid-cols-2 pt-4">
                  <input type="hidden" name="contract_id" value={contract.$id} />
                  <Field>
                    <FieldLabel htmlFor="cancellation-month" className="text-xs sm:text-sm font-semibold">
                      Mês pretendido de saída
                    </FieldLabel>
                    <Input
                      id="cancellation-month"
                      name="target_exit_month"
                      type="month"
                      min={defaultExitMonth}
                      defaultValue={defaultExitMonth}
                      required
                      className="h-11"
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="cancellation-reason" className="text-xs sm:text-sm font-semibold">
                      Motivo (opcional)
                    </FieldLabel>
                    <Textarea
                      id="cancellation-reason"
                      name="reason"
                      maxLength={2000}
                      placeholder="Descreva o motivo da saída se desejar..."
                      className="min-h-[80px] rounded-xl text-sm resize-none"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <FormSubmitButton
                      variant="outline"
                      className="h-11 w-full sm:w-auto font-medium border-destructive/40 text-destructive hover:bg-destructive/10"
                      pendingLabel="Enviando solicitação…"
                    >
                      Enviar pedido de cancelamento
                    </FormSubmitButton>
                  </div>
                </form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : null}
    </div>
  );
}
