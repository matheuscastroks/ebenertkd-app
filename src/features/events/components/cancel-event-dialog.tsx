import { cancelEventAction } from "@/app/actions/events";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Cancelar o evento inteiro: cobranças em aberto são canceladas; havendo pagas, o professor decide o destino do valor. */
export function CancelEventDialog({ eventId, activeRegistrations, hasPaidCharges }: { eventId: string; activeRegistrations: number; hasPaidCharges: boolean }) {
  return (
    <ResponsiveDialog
      trigger={
        <Button variant="outline" className="min-h-11">
          Cancelar evento
        </Button>
      }
      title="Cancelar evento"
      description={activeRegistrations > 0 ? `${activeRegistrations} inscrição(ões) ativa(s) serão canceladas e os participantes avisados.` : "Nenhuma inscrição ativa."}
    >
      <form action={cancelEventAction} className="space-y-4 pt-2">
        <input type="hidden" name="event_id" value={eventId} />
        <Field>
          <FieldLabel htmlFor="cancel-reason">Motivo</FieldLabel>
          <Textarea id="cancel-reason" name="reason" required minLength={3} maxLength={255} rows={3} />
        </Field>
        {hasPaidCharges ? (
          <Field>
            <FieldLabel htmlFor="cancel-decision">Pagamentos já feitos</FieldLabel>
            <Select name="financial_decision" defaultValue="future_credit">
              <SelectTrigger id="cancel-decision" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="future_credit">Gerar crédito futuro</SelectItem>
                <SelectItem value="keep_charge">Manter as cobranças</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <FormSubmitButton variant="destructive" className="min-h-11 w-full" pendingLabel="Cancelando…">
          Confirmar cancelamento
        </FormSubmitButton>
      </form>
    </ResponsiveDialog>
  );
}
