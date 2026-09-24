import { requestCancellationAction } from "@/app/actions/cancellations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      {notice ? <p className="rounded-xl border bg-card p-4 text-sm">{notice}</p> : null}
      <Card>
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Contrato de {contract.student_name}</CardTitle><CardDescription>Versão {contract.version_number} · vigência até {new Date(contract.ends_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</CardDescription></div><Badge variant="outline">{statusLabel}</Badge></div></CardHeader>
        <CardContent>
          {hasSignedPdf ? <div className="space-y-4"><div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Documento assinado e preservado. Hash do PDF: <code className="break-all">{contract.pdf_hash}</code></div><Button asChild><a href={`/api/contracts/${contract.$id}/pdf`} target="_blank" rel="noreferrer">Abrir PDF assinado</a></Button></div> : canSign ? <SignaturePad contractId={contract.$id} content={contract.content_snapshot} /> : <div className="space-y-3"><div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border p-5 text-sm leading-7">{contract.content_snapshot}</div><p className="text-sm text-muted-foreground">A assinatura deve ser feita pelo aluno adulto ou pelo responsável vinculado.</p></div>}
        </CardContent>
      </Card>
      {contract.status === "signed" ? <Card><CardHeader><CardTitle className="text-base">Solicitar cancelamento</CardTitle><CardDescription>Até o dia 20 do mês anterior, a sugestão de taxa é zero. Depois disso, o sistema sugere uma mensalidade para revisão do professor.</CardDescription></CardHeader><CardContent><form action={requestCancellationAction} className="grid gap-4 md:grid-cols-2"><input type="hidden" name="contract_id" value={contract.$id} /><label className="grid gap-2"><span className="text-sm font-medium">Mês de saída</span><Input name="target_exit_month" type="month" min={defaultExitMonth} defaultValue={defaultExitMonth} required /></label><label className="grid gap-2 md:col-span-2"><span className="text-sm font-medium">Motivo (opcional)</span><Textarea name="reason" maxLength={2000} /></label><Button type="submit" variant="outline" className="md:w-fit">Enviar solicitação</Button></form></CardContent></Card> : null}
    </div>
  );
}
