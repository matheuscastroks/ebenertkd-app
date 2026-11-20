import { registerForEventAction } from "@/app/actions/events";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StudentOpenEvent } from "@/features/events/student-events-service";
import { formatBrl } from "@/lib/money";

type Who = { kind: "self" } | { kind: "guardian"; dependentName: string } | { kind: "minor" };

/**
 * Inscrição em até 3 passos numa só caixa: opção (com motivos de inelegibilidade), acompanhantes e termos.
 * O menor só manifesta interesse; o responsável confirma depois.
 */
export function RegisterDialog({
  item,
  studentProfileId,
  returnTo,
  who,
  showFinancial
}: {
  item: StudentOpenEvent;
  studentProfileId: string;
  returnTo: string;
  who: Who;
  showFinancial: boolean;
}) {
  const { event } = item;
  const eligible = item.options.filter((entry) => entry.eligible && !entry.mine);
  const defaultOption = eligible[0]?.option.$id ?? item.options[0]?.option.$id ?? "";
  const maxCompanions = event.max_companions ?? 0;
  const interest = who.kind === "minor";
  const full = item.seatsLeft === 0 || eligible.every((entry) => entry.seatsLeft === 0);
  const label = interest ? "Tenho interesse" : full ? "Entrar na lista de espera" : "Inscrever-se";

  return (
    <ResponsiveDialog
      trigger={
        <Button className="min-h-11" disabled={eligible.length === 0}>
          {label}
        </Button>
      }
      title={interest ? "Manifestar interesse" : "Inscrição"}
      description={event.title}
    >
      <form action={registerForEventAction} className="space-y-4 pt-2">
        <input type="hidden" name="event_id" value={event.$id} />
        <input type="hidden" name="student_profile_id" value={studentProfileId} />
        <input type="hidden" name="return_to" value={returnTo} />

        <Field>
          <FieldLabel htmlFor={`option-${event.$id}`}>Opção</FieldLabel>
          <Select name="option_id" defaultValue={defaultOption}>
            <SelectTrigger id={`option-${event.$id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.options.map((entry) => (
                <SelectItem key={entry.option.$id} value={entry.option.$id} disabled={!entry.eligible || Boolean(entry.mine)}>
                  {entry.option.label}
                  {showFinancial && entry.option.price_cents > 0 ? ` · ${formatBrl(entry.option.price_cents)}` : ""}
                  {entry.mine ? " · já inscrito" : ""}
                  {!entry.eligible ? ` · ${entry.reasons[0]}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {maxCompanions > 0 && !interest ? (
          <Field>
            <FieldLabel htmlFor={`companions-${event.$id}`}>Acompanhantes</FieldLabel>
            <Input id={`companions-${event.$id}`} name="companions" type="number" min={0} max={maxCompanions} defaultValue={0} inputMode="numeric" className="h-11 tabular-nums" />
            <FieldDescription>
              Até {maxCompanions}.{showFinancial && (event.companion_price_cents ?? 0) > 0 ? ` Cada um: ${formatBrl(event.companion_price_cents ?? 0)}.` : ""}
            </FieldDescription>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor={`notes-${event.$id}`}>Observações (opcional)</FieldLabel>
          <Textarea id={`notes-${event.$id}`} name="notes" maxLength={500} rows={2} />
        </Field>

        {interest ? (
          <p className="text-sm text-muted-foreground">O responsável recebe um aviso para confirmar a vaga.</p>
        ) : (
          <label className="flex items-start gap-3 text-sm leading-relaxed" htmlFor={`terms-${event.$id}`}>
            <Checkbox id={`terms-${event.$id}`} name="accepted_terms" required className="mt-0.5" />
            <span>
              {who.kind === "guardian"
                ? `Autorizo a participação de ${who.dependentName} e aceito as condições do evento.`
                : "Li e aceito as condições do evento e declaro estar apto para a prática."}
            </span>
          </label>
        )}

        <FormSubmitButton className="min-h-11 w-full" pendingLabel="Enviando…">
          {label}
        </FormSubmitButton>
      </form>
    </ResponsiveDialog>
  );
}

/** Convidado sem conta (aulão, seminário, confraternização): só nome e WhatsApp. Aguarda aprovação do professor. */
export function GuestRegisterDialog({ item, returnTo }: { item: StudentOpenEvent; returnTo: string }) {
  const { event } = item;
  const option = item.options[0]?.option;
  if (!option) return null;
  return (
    <ResponsiveDialog
      trigger={
        <Button variant="outline" className="min-h-11">
          Inscrever convidado
        </Button>
      }
      title="Inscrever convidado"
      description={`${event.title}. O professor confirma a vaga e combina o pagamento pessoalmente.`}
    >
      <form action={registerForEventAction} className="space-y-4 pt-2">
        <input type="hidden" name="event_id" value={event.$id} />
        <input type="hidden" name="option_id" value={option.$id} />
        <input type="hidden" name="return_to" value={returnTo} />
        <Field>
          <FieldLabel htmlFor={`guest-name-${event.$id}`}>Nome do convidado</FieldLabel>
          <Input id={`guest-name-${event.$id}`} name="guest_name" required minLength={3} maxLength={128} className="h-11" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`guest-contact-${event.$id}`}>WhatsApp</FieldLabel>
          <Input id={`guest-contact-${event.$id}`} name="guest_contact" type="tel" inputMode="tel" required placeholder="(21) 9 6518-8988" className="h-11" />
          <FieldDescription>Usado só para avisos deste evento e apagado depois dele.</FieldDescription>
        </Field>
        <label className="flex items-start gap-3 text-sm leading-relaxed" htmlFor={`guest-terms-${event.$id}`}>
          <Checkbox id={`guest-terms-${event.$id}`} name="accepted_terms" required className="mt-0.5" />
          <span>O convidado concorda com as condições do evento e está apto para a prática.</span>
        </label>
        <FormSubmitButton className="min-h-11 w-full" pendingLabel="Enviando…">
          Enviar convidado
        </FormSubmitButton>
      </form>
    </ResponsiveDialog>
  );
}
