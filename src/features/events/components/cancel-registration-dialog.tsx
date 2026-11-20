import { cancelRegistrationAction, rejectRegistrationAction } from "@/app/actions/events";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Cancela (ou recusa) uma inscrição. Se já houver pagamento, o professor decide entre crédito futuro
 * e manter a cobrança; sem pagamento, a cobrança em aberto é cancelada automaticamente.
 */
export function CancelRegistrationDialog({
  registrationId,
  returnTo,
  personName,
  hasPaidCharge,
  mode = "cancel",
  triggerLabel
}: {
  registrationId: string;
  returnTo: string;
  personName: string;
  hasPaidCharge: boolean;
  mode?: "cancel" | "reject";
  triggerLabel?: string;
}) {
  const reject = mode === "reject";
  return (
    <ResponsiveDialog
      trigger={
        <Button variant="outline" size="sm" className="min-h-9">
          {triggerLabel ?? (reject ? "Recusar" : "Cancelar")}
        </Button>
      }
      title={reject ? "Recusar inscrição" : "Cancelar inscrição"}
      description={`${personName}. ${hasPaidCharge ? "Há pagamento registrado: escolha o que fazer com o valor." : "A cobrança em aberto será cancelada."}`}
    >
      <form action={reject ? rejectRegistrationAction : cancelRegistrationAction} className="space-y-4 pt-2">
        <input type="hidden" name="registration_id" value={registrationId} />
        <input type="hidden" name="return_to" value={returnTo} />
        {hasPaidCharge ? (
          <Field>
            <FieldLabel htmlFor={`decision-${registrationId}`}>Pagamento já feito</FieldLabel>
            <Select name="financial_decision" defaultValue="future_credit">
              <SelectTrigger id={`decision-${registrationId}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="future_credit">Gerar crédito futuro</SelectItem>
                <SelectItem value="keep_charge">Manter a cobrança</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <FormSubmitButton variant="destructive" className="min-h-11 w-full" pendingLabel="Salvando…">
          {reject ? "Confirmar recusa" : "Confirmar cancelamento"}
        </FormSubmitButton>
      </form>
    </ResponsiveDialog>
  );
}
