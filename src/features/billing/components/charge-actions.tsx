import Link from "next/link";
import { CheckCircle2, ExternalLink, FileText, XCircle } from "lucide-react";
import {
  adjustChargeAction,
  decidePaymentProofAction,
  recordManualPaymentAction,
  reversePaymentAction
} from "@/app/actions/billing";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { DateField } from "@/components/shared/date-field";
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

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export function ChargeActions({
  charge,
  studentName,
  proof,
  payment
}: {
  charge: Charge;
  studentName: string;
  proof?: PaymentProof;
  payment?: Payment;
}) {
  const actionable = ["pending", "overdue", "proof_under_review"].includes(charge.status);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {actionable || proof ? (
        <ResponsiveDialog
          trigger={
            <Button
              size="sm"
              variant={proof ? "default" : "outline"}
              className="h-9 touch-manipulation font-semibold"
            >
              {proof ? "Revisar comprovante" : "Gerenciar"}
            </Button>
          }
          title={`Cobrança de ${studentName}`}
          description={`${charge.description} · Vencimento em ${new Date(charge.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`}
        >
          <Tabs defaultValue={proof ? "proof" : "payment"} className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="proof" disabled={!proof}>
                Comprovante
              </TabsTrigger>
              <TabsTrigger value="payment">Pagamento</TabsTrigger>
              <TabsTrigger value="adjustment">Ajuste</TabsTrigger>
            </TabsList>

            <TabsContent value="proof" className="pt-4 space-y-4">
              {proof ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="size-4 text-primary shrink-0" aria-hidden="true" />
                      <span>Comprovante anexado pelo aluno (v{proof.version})</span>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/api/payment-proofs/${proof.$id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5"
                      >
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        Visualizar arquivo
                      </Link>
                    </Button>
                  </div>

                  {/* Aprovar Comprovante */}
                  <form action={decidePaymentProofAction} className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-3">
                    <input type="hidden" name="proof_id" value={proof.$id} />
                    <input type="hidden" name="decision" value="approved" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-success">
                      Aprovar recebimento
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DateField
                        id={`paid-at-${proof.$id}`}
                        name="paid_at"
                        label="Data efetiva do pagamento"
                        defaultValue={today()}
                        max={today()}
                        required
                      />
                      <div className="flex items-end">
                        <FormSubmitButton className="w-full h-11 touch-manipulation font-semibold" pendingLabel="Aprovando…">
                          <CheckCircle2 className="size-4 mr-1.5" aria-hidden="true" />
                          Aprovar comprovante
                        </FormSubmitButton>
                      </div>
                    </div>
                  </form>

                  {/* Recusar Comprovante */}
                  <form
                    action={decidePaymentProofAction}
                    className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3"
                  >
                    <input type="hidden" name="proof_id" value={proof.$id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                      Recusar comprovante
                    </p>
                    <Field>
                      <FieldLabel htmlFor={`reject-${proof.$id}`}>Motivo da recusa</FieldLabel>
                      <Input
                        id={`reject-${proof.$id}`}
                        name="reason"
                        placeholder="Ex.: comprovante ilegível, valor divergente ou comprovante de agendamento"
                        className="h-11 text-sm"
                        required
                      />
                      <FieldDescription>
                        O aluno receberá esta orientação no portal e poderá enviar um novo arquivo.
                      </FieldDescription>
                    </Field>
                    <FormSubmitButton
                      variant="destructive"
                      className="w-full sm:w-auto h-11 touch-manipulation font-semibold"
                      pendingLabel="Recusando…"
                    >
                      <XCircle className="size-4 mr-1.5" aria-hidden="true" />
                      Recusar comprovante
                    </FormSubmitButton>
                  </form>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="payment" className="pt-4">
              <form action={recordManualPaymentAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="charge_id" value={charge.$id} />
                <Field>
                  <FieldLabel htmlFor={`amount-${charge.$id}`}>Valor recebido (R$)</FieldLabel>
                  <Input
                    id={`amount-${charge.$id}`}
                    name="amount_reais"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    defaultValue={centsToReaisInput(charge.amount_cents)}
                    className="h-11 text-sm font-semibold"
                    required
                  />
                </Field>
                <DateField
                  id={`manual-paid-at-${charge.$id}`}
                  name="paid_at"
                  label="Data do pagamento"
                  defaultValue={today()}
                  max={today()}
                  required
                />
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={`notes-${charge.$id}`}>Observação interna</FieldLabel>
                  <Input
                    id={`notes-${charge.$id}`}
                    name="notes"
                    placeholder="Ex.: PIX conferido no extrato bancário do Banco Inter"
                    className="h-11 text-sm"
                    required
                  />
                </Field>
                <div className="sm:col-span-2">
                  <FormSubmitButton className="w-full sm:w-auto h-11 touch-manipulation font-semibold" pendingLabel="Confirmando…">
                    Confirmar pagamento manual
                  </FormSubmitButton>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="adjustment" className="pt-4">
              <form action={adjustChargeAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="charge_id" value={charge.$id} />
                <Field>
                  <FieldLabel htmlFor={`adjust-amount-${charge.$id}`}>Novo valor (R$)</FieldLabel>
                  <Input
                    id={`adjust-amount-${charge.$id}`}
                    name="amount_reais"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    defaultValue={centsToReaisInput(charge.amount_cents)}
                    className="h-11 text-sm font-semibold"
                    required
                  />
                </Field>
                <DateField
                  id={`due-${charge.$id}`}
                  name="due_date"
                  label="Novo vencimento"
                  defaultValue={charge.due_date.slice(0, 10)}
                  required
                />
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={`reason-${charge.$id}`}>Motivo do ajuste</FieldLabel>
                  <Input
                    id={`reason-${charge.$id}`}
                    name="reason"
                    placeholder="Ex.: Concessão de bolsa parcial ou desconto acordado"
                    className="h-11 text-sm"
                    required
                  />
                </Field>
                <div className="sm:col-span-2">
                  <FormSubmitButton
                    variant="outline"
                    className="w-full sm:w-auto h-11 touch-manipulation font-semibold"
                    pendingLabel="Salvando…"
                  >
                    Salvar ajuste de cobrança
                  </FormSubmitButton>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </ResponsiveDialog>
      ) : null}

      {payment ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-9 touch-manipulation">
              Estornar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Estornar pagamento de {studentName}?</AlertDialogTitle>
              <AlertDialogDescription>
                O pagamento voltará a constar como pendente. Esta operação ficará registrada no histórico de auditoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form action={reversePaymentAction} className="space-y-4">
              <input type="hidden" name="payment_id" value={payment.$id} />
              <Field>
                <FieldLabel htmlFor={`reversal-${payment.$id}`}>Motivo do estorno</FieldLabel>
                <Input
                  id={`reversal-${payment.$id}`}
                  name="reason"
                  placeholder="Ex.: comprovante duplicado ou cancelamento a pedido"
                  className="h-11 text-sm"
                  required
                />
              </Field>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                <AlertDialogAction type="submit" variant="destructive">
                  Confirmar estorno
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
