import Link from "next/link";
import { adjustChargeAction, decidePaymentProofAction, recordManualPaymentAction, reversePaymentAction } from "@/app/actions/billing";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import type { Charge, Payment, PaymentProof } from "@/features/billing/types";
import { centsToReaisInput } from "@/lib/money";

const today = () => new Date().toISOString().slice(0, 10);

export function ChargeActions({ charge, studentName, proof, payment }: { charge: Charge; studentName: string; proof?: PaymentProof; payment?: Payment }) {
  const actionable = ["pending", "overdue", "proof_under_review"].includes(charge.status);
  return <div className="flex flex-wrap justify-end gap-2">
    {(actionable || proof) ? <ResponsiveDialog trigger={<Button size="sm" variant={proof ? "default" : "outline"}>{proof ? "Revisar" : "Gerenciar"}</Button>} title={`Cobrança de ${studentName}`} description={`${charge.description} · vencimento ${charge.due_date.slice(0, 10)}`}>
      <Tabs defaultValue={proof ? "proof" : "payment"} className="mt-2">
        <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="proof" disabled={!proof}>Comprovante</TabsTrigger><TabsTrigger value="payment">Pagamento</TabsTrigger><TabsTrigger value="adjustment">Ajuste</TabsTrigger></TabsList>
        <TabsContent value="proof" className="pt-4">{proof ? <div className="space-y-4"><p className="text-sm"><Link className="font-medium underline" href={`/api/payment-proofs/${proof.$id}`} target="_blank">Abrir comprovante v{proof.version}</Link></p><form action={decidePaymentProofAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="proof_id" value={proof.$id} /><input type="hidden" name="decision" value="approved" /><Field><FieldLabel htmlFor={`paid-at-${proof.$id}`}>Data do pagamento</FieldLabel><Input id={`paid-at-${proof.$id}`} name="paid_at" type="date" defaultValue={today()} required /></Field><div className="flex items-end"><FormSubmitButton pendingLabel="Aprovando…">Aprovar comprovante</FormSubmitButton></div></form><form action={decidePaymentProofAction} className="space-y-3 rounded-lg border border-destructive/20 p-3"><input type="hidden" name="proof_id" value={proof.$id} /><input type="hidden" name="decision" value="rejected" /><Field><FieldLabel htmlFor={`reject-${proof.$id}`}>Motivo da recusa</FieldLabel><Input id={`reject-${proof.$id}`} name="reason" required /><FieldDescription>O aluno verá esta orientação e poderá enviar outro arquivo.</FieldDescription></Field><FormSubmitButton variant="destructive" pendingLabel="Recusando…">Recusar comprovante</FormSubmitButton></form></div> : null}</TabsContent>
        <TabsContent value="payment" className="pt-4"><form action={recordManualPaymentAction} className="grid gap-4 sm:grid-cols-2"><input type="hidden" name="charge_id" value={charge.$id} /><Field><FieldLabel htmlFor={`amount-${charge.$id}`}>Valor recebido (R$)</FieldLabel><Input id={`amount-${charge.$id}`} name="amount_reais" type="number" inputMode="decimal" min="0.01" step="0.01" defaultValue={centsToReaisInput(charge.amount_cents)} required /></Field><Field><FieldLabel htmlFor={`manual-paid-at-${charge.$id}`}>Data do pagamento</FieldLabel><Input id={`manual-paid-at-${charge.$id}`} name="paid_at" type="date" defaultValue={today()} required /></Field><Field className="sm:col-span-2"><FieldLabel htmlFor={`notes-${charge.$id}`}>Observação</FieldLabel><Input id={`notes-${charge.$id}`} name="notes" placeholder="Ex.: PIX conferido no extrato" required /></Field><FormSubmitButton pendingLabel="Confirmando…">Confirmar pagamento</FormSubmitButton></form></TabsContent>
        <TabsContent value="adjustment" className="pt-4"><form action={adjustChargeAction} className="grid gap-4 sm:grid-cols-2"><input type="hidden" name="charge_id" value={charge.$id} /><Field><FieldLabel htmlFor={`adjust-amount-${charge.$id}`}>Novo valor (R$)</FieldLabel><Input id={`adjust-amount-${charge.$id}`} name="amount_reais" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={centsToReaisInput(charge.amount_cents)} required /></Field><Field><FieldLabel htmlFor={`due-${charge.$id}`}>Novo vencimento</FieldLabel><Input id={`due-${charge.$id}`} name="due_date" type="date" defaultValue={charge.due_date.slice(0, 10)} required /></Field><Field className="sm:col-span-2"><FieldLabel htmlFor={`reason-${charge.$id}`}>Motivo do ajuste</FieldLabel><Input id={`reason-${charge.$id}`} name="reason" required /></Field><FormSubmitButton variant="outline" pendingLabel="Salvando…">Salvar ajuste</FormSubmitButton></form></TabsContent>
      </Tabs>
    </ResponsiveDialog> : null}
    {payment ? <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="outline">Estornar</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Estornar pagamento de {studentName}?</AlertDialogTitle><AlertDialogDescription>O pagamento voltará a constar como pendente. Esta operação ficará registrada no histórico financeiro.</AlertDialogDescription></AlertDialogHeader><form action={reversePaymentAction} className="space-y-4"><input type="hidden" name="payment_id" value={payment.$id} /><Field><FieldLabel htmlFor={`reversal-${payment.$id}`}>Motivo do estorno</FieldLabel><Input id={`reversal-${payment.$id}`} name="reason" required /></Field><AlertDialogFooter><AlertDialogCancel type="button">Cancelar</AlertDialogCancel><AlertDialogAction type="submit" variant="destructive">Confirmar estorno</AlertDialogAction></AlertDialogFooter></form></AlertDialogContent></AlertDialog> : null}
  </div>;
}
