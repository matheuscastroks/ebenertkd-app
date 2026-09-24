import { ChevronDown } from "lucide-react";
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

export function ContractWorkspace({ contract, canSign, notice }: { contract: Contract; canSign: boolean; notice?: string }) {
  const hasSignedPdf = Boolean(contract.signed_at && contract.pdf_file_id);
  const statusLabel = contract.status === "cancelled" ? "Cancelado" : contract.status === "expired" ? "Vencido" : hasSignedPdf ? "Assinado" : "Aguardando assinatura";
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const defaultExitMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {notice ? <OperationToast tone={notice.includes("Não") ? "error" : "success"} title={notice} clearParams={["signed", "requested", "error"]} /> : null}
      <Card>
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Contrato de {contract.student_name}</CardTitle><CardDescription>Versão {contract.version_number} · vigência até {new Date(contract.ends_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</CardDescription></div><StatusBadge tone={contract.status === "cancelled" || contract.status === "expired" ? "danger" : hasSignedPdf ? "success" : "warning"}>{statusLabel}</StatusBadge></div></CardHeader>
        <CardContent>
          {hasSignedPdf ? <div className="space-y-4"><div className="rounded-lg bg-muted/60 p-3"><p className="font-medium">Documento assinado e preservado</p><p className="mt-1 break-all text-xs text-muted-foreground">Hash do PDF: {contract.pdf_hash}</p></div><Button asChild><a href={`/api/contracts/${contract.$id}/pdf`} target="_blank" rel="noreferrer">Abrir PDF assinado</a></Button></div> : canSign ? <SignaturePad contractId={contract.$id} content={contract.content_snapshot} /> : <div className="space-y-3"><div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border p-5 text-sm leading-7">{contract.content_snapshot}</div><p className="text-sm text-muted-foreground">A assinatura deve ser feita pelo aluno adulto ou pelo responsável vinculado.</p></div>}
        </CardContent>
      </Card>
      {contract.status === "signed" ? <Collapsible><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base">Cancelamento</CardTitle><CardDescription>Até o dia 20 do mês anterior, a sugestão de taxa é zero. Depois disso, o sistema sugere uma mensalidade para revisão do professor.</CardDescription></div><CollapsibleTrigger asChild><Button variant="outline">Solicitar cancelamento<ChevronDown aria-hidden="true" /></Button></CollapsibleTrigger></div></CardHeader><CollapsibleContent><CardContent><form action={requestCancellationAction} className="grid gap-4 md:grid-cols-2"><input type="hidden" name="contract_id" value={contract.$id} /><Field><FieldLabel htmlFor="cancellation-month">Mês de saída</FieldLabel><Input id="cancellation-month" name="target_exit_month" type="month" min={defaultExitMonth} defaultValue={defaultExitMonth} required /></Field><Field className="md:col-span-2"><FieldLabel htmlFor="cancellation-reason">Motivo (opcional)</FieldLabel><Textarea id="cancellation-reason" name="reason" maxLength={2000} /></Field><FormSubmitButton variant="outline" className="md:w-fit" pendingLabel="Enviando…">Enviar solicitação</FormSubmitButton></form></CardContent></CollapsibleContent></Card></Collapsible> : null}
    </div>
  );
}
