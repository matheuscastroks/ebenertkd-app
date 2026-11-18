"use client";

import { useId } from "react";
import { ConfirmationForm } from "@/features/billing/components/confirmation-form";
import { ConsequenceDialog } from "./consequence-dialog";
import { formatBrl } from "@/lib/money";
import Link from "next/link";
import { ExternalLink, FileText } from "@/components/ui/icons";
import { CheckIcon } from "@/components/ui/check";
import { XIcon } from "@/components/ui/x";
import {
  adjustChargeAction,
  decidePaymentProofAction,
  recordManualPaymentAction,
  reversePaymentAction
} from "@/app/actions/billing";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { DateField } from "@/components/shared/date-field";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const instanceId = useId();
  const summary = [{ label: "Aluno", value: studentName }, { label: "Valor", value: formatBrl(charge.amount_cents) }, { label: "Competência", value: new Date(`${charge.competence}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).replace(". de ", "/").replace(" de ", "/") }];
  const actionable = ["pending", "overdue", "proof_under_review"].includes(charge.status);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {actionable || proof ? (
        <ResponsiveDialog
          trigger={
            <Button
              size="sm"
              variant={proof ? "outline" : "ghost"}
              className="min-h-11 touch-manipulation md:min-h-9"
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
                  <Attachment className="w-full">
                    <AttachmentMedia>
                      <FileText aria-hidden="true" />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>Comprovante anexado pelo aluno</AttachmentTitle>
                      <AttachmentDescription>Versão {proof.version}</AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction asChild size="sm" variant="outline">
                        <Link
                          href={`/api/payment-proofs/${proof.$id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink aria-hidden="true" />
                          Visualizar arquivo
                        </Link>
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>

                  {/* Aprovar Comprovante */}
                  <ConfirmationForm id={`approve-${instanceId}-${proof.$id}`} action={decidePaymentProofAction} className="space-y-3 border-t border-border pt-4">
                    <input type="hidden" name="proof_id" value={proof.$id} />
                    <input type="hidden" name="decision" value="approved" />
                    <p className="text-sm font-semibold">
                      Aprovar recebimento
                    </p>
                    <div className="grid items-end gap-3 sm:grid-cols-2">
                      <DateField
                        id={`paid-at-${instanceId}-${proof.$id}`}
                        name="paid_at"
                        label="Data efetiva do pagamento"
                        defaultValue={today()}
                        max={today()}
                        required
                      />
                      <div className="flex items-end">
                        <ConsequenceDialog trigger={<Button type="button" className="min-h-11"><CheckIcon aria-hidden="true" />Aprovar comprovante</Button>} title="Aprovar comprovante?" summary={[...summary, { label: "Data do pagamento", value: today(), field: "paid_at", kind: "date" }]} effect="A cobrança será marcada como paga e o aluno verá a confirmação." confirmLabel="Aprovar comprovante" action={decidePaymentProofAction} formId={`approve-${instanceId}-${proof.$id}`} />
                      </div>
                    </div>
                  </ConfirmationForm>

                  {/* Recusar Comprovante */}
                  <ConfirmationForm
                    id={`reject-form-${instanceId}-${proof.$id}`} action={decidePaymentProofAction}
                    className="space-y-3 border-t border-border pt-4"
                  >
                    <input type="hidden" name="proof_id" value={proof.$id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <p className="text-sm font-semibold">
                      Recusar comprovante
                    </p>
                    <Field>
                      <FieldLabel htmlFor={`reject-${instanceId}-${proof.$id}`}>Motivo da recusa</FieldLabel>
                      <Input
                        id={`reject-${instanceId}-${proof.$id}`}
                        name="reason"
                        placeholder="Ex.: comprovante ilegível, valor divergente ou comprovante de agendamento"
                        className="h-11 text-sm"
                        required
                      />
                      <FieldDescription>
                        O aluno receberá esta orientação no portal e poderá enviar um novo arquivo.
                      </FieldDescription>
                    </Field>
                    <ConsequenceDialog trigger={<Button type="button" variant="outline" className="min-h-11 text-destructive"><XIcon aria-hidden="true" />Recusar comprovante</Button>} title="Recusar comprovante?" summary={summary} effect="O aluno receberá o motivo e poderá enviar outro comprovante. A cobrança continua em aberto." confirmLabel="Recusar comprovante" destructive action={decidePaymentProofAction} formId={`reject-form-${instanceId}-${proof.$id}`} />
                  </ConfirmationForm>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="payment" className="pt-4">
              <ConfirmationForm id={`manual-${instanceId}-${charge.$id}`} action={recordManualPaymentAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="charge_id" value={charge.$id} />
                <Field>
                  <FieldLabel htmlFor={`amount-${instanceId}-${charge.$id}`}>Valor recebido (R$)</FieldLabel>
                  <Input
                    id={`amount-${instanceId}-${charge.$id}`}
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
                  id={`manual-paid-at-${instanceId}-${charge.$id}`}
                  name="paid_at"
                  label="Data do pagamento"
                  defaultValue={today()}
                  max={today()}
                  required
                />
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={`notes-${instanceId}-${charge.$id}`}>Observação interna</FieldLabel>
                  <Input
                    id={`notes-${instanceId}-${charge.$id}`}
                    name="notes"
                    placeholder="Ex.: PIX conferido no extrato bancário do Banco Inter"
                    className="h-11 text-sm"
                    required
                  />
                </Field>
                <div className="sm:col-span-2">
                  <ConsequenceDialog trigger={<Button type="button" className="min-h-11">Confirmar pagamento manual</Button>} title="Registrar pagamento manual?" summary={[...summary.filter((item) => item.label !== "Valor"), { label: "Valor recebido", value: formatBrl(charge.amount_cents), field: "amount_reais", kind: "money" }, { label: "Data do pagamento", value: today(), field: "paid_at", kind: "date" }]} effect="A cobrança será marcada como paga. Confira o recebimento antes de confirmar." confirmLabel="Registrar pagamento" action={recordManualPaymentAction} formId={`manual-${instanceId}-${charge.$id}`} />
                </div>
              </ConfirmationForm>
            </TabsContent>

            <TabsContent value="adjustment" className="pt-4">
              <form action={adjustChargeAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="charge_id" value={charge.$id} />
                <Field>
                  <FieldLabel htmlFor={`adjust-amount-${instanceId}-${charge.$id}`}>Novo valor (R$)</FieldLabel>
                  <Input
                    id={`adjust-amount-${instanceId}-${charge.$id}`}
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
                  id={`due-${instanceId}-${charge.$id}`}
                  name="due_date"
                  label="Novo vencimento"
                  defaultValue={charge.due_date.slice(0, 10)}
                  required
                />
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={`reason-${instanceId}-${charge.$id}`}>Motivo do ajuste</FieldLabel>
                  <Input
                    id={`reason-${instanceId}-${charge.$id}`}
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
        <ConsequenceDialog trigger={<Button size="sm" variant="ghost" className="min-h-11 md:min-h-9">Estornar</Button>} title={`Estornar pagamento de ${studentName}?`} summary={[...summary.filter((item) => item.label !== "Valor"), { label: "Valor estornado", value: formatBrl(payment.amount_cents) }, { label: "Pagamento original", value: new Date(payment.paid_at).toLocaleDateString("pt-BR", { timeZone: "UTC" }) }]} effect="A cobrança volta a ficar em aberto: Pendente ou Em atraso, conforme o vencimento. O estorno ficará registrado no histórico." confirmLabel="Confirmar estorno" destructive action={reversePaymentAction}>
          <input type="hidden" name="payment_id" value={payment.$id} />
          <Field><FieldLabel htmlFor={`reversal-${instanceId}-${payment.$id}`}>Motivo do estorno</FieldLabel><Input id={`reversal-${instanceId}-${payment.$id}`} name="reason" required minLength={3} /></Field>
        </ConsequenceDialog>
      ) : null}
    </div>
  );
}
