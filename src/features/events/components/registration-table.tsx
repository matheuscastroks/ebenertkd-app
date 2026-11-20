import { approveRegistrationAction } from "@/app/actions/events";
import { PersonAvatar } from "@/components/shared/avatar-group";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CancelRegistrationDialog } from "@/features/events/components/cancel-registration-dialog";
import { RegistrationStatusBadge } from "@/features/events/components/status-badges";
import type { EventRegistrationRow } from "@/features/events/event-service";
import { examFeeLabels, examFeeTones } from "@/features/exams/labels";
import { formatBrl } from "@/lib/money";

const CANCELLABLE = ["interested", "pending_approval", "confirmed", "waitlisted"];
const REJECTABLE = ["interested", "pending_approval", "waitlisted"];

export function paymentLabel(row: EventRegistrationRow) {
  if (row.isGuest) return row.registration.price_cents > 0 ? { text: "A combinar", tone: "neutral" as const } : { text: "Gratuito", tone: "neutral" as const };
  if (!row.charge) return row.registration.price_cents > 0 ? { text: "Sem cobrança", tone: "neutral" as const } : { text: "Gratuito", tone: "neutral" as const };
  return { text: examFeeLabels[row.charge.status], tone: examFeeTones[row.charge.status] };
}

/** Inscritos com ações do professor: aprovar, recusar e cancelar (com decisão financeira quando há pagamento). */
export function RegistrationTable({ rows, returnTo }: { rows: EventRegistrationRow[]; returnTo: string }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Nenhuma inscrição ainda. Quando alguém se inscrever, aparece aqui.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Participante</TableHead>
            <TableHead>Opção</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { registration } = row;
            const payment = paymentLabel(row);
            const paid = row.charge ? !["pending", "overdue", "cancelled"].includes(row.charge.status) : false;
            return (
              <TableRow key={registration.$id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={row.name} imageUrl={row.imageUrl} size="sm" />
                    <span className="min-w-0">
                      {row.name}
                      {row.isGuest ? <span className="ml-2 text-xs font-normal text-muted-foreground">convidado</span> : null}
                      {registration.companions > 0 ? <span className="ml-2 text-xs font-normal text-muted-foreground">+{registration.companions}</span> : null}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{row.option?.label ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <RegistrationStatusBadge status={registration.status} />
                    {registration.status === "waitlisted" && registration.waitlist_position ? <span className="text-xs text-muted-foreground">{registration.waitlist_position}º</span> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={payment.tone}>{payment.text}</StatusBadge>
                    {registration.price_cents > 0 ? <span className="text-xs tabular-nums text-muted-foreground">{formatBrl(registration.price_cents)}</span> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {registration.status === "pending_approval" ? (
                      <form action={approveRegistrationAction}>
                        <input type="hidden" name="registration_id" value={registration.$id} />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <FormSubmitButton size="sm" className="min-h-9" pendingLabel="Aprovando…">
                          Aprovar
                        </FormSubmitButton>
                      </form>
                    ) : null}
                    {REJECTABLE.includes(registration.status) ? <CancelRegistrationDialog mode="reject" registrationId={registration.$id} returnTo={returnTo} personName={row.name} hasPaidCharge={paid} /> : null}
                    {CANCELLABLE.includes(registration.status) ? <CancelRegistrationDialog registrationId={registration.$id} returnTo={returnTo} personName={row.name} hasPaidCharge={paid} /> : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
