import { StudentAvatar } from "@/features/students/components/student-avatar";
import Link from "next/link";
import { confirmChampionshipAction, recordResultAction, reviewRegistrationDocumentAction, submitToFederationAction } from "@/app/actions/championships";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CancelRegistrationDialog } from "@/features/events/components/cancel-registration-dialog";
import { RegistrationStatusBadge } from "@/features/events/components/status-badges";
import type { ChampionshipRow } from "@/features/events/championship-queries";
import { formatEventDay } from "@/features/events/dates";
import { DEADLINE_KIND_LABEL, daysUntilDeadline, deadlineState, sortDeadlines } from "@/features/events/rules/deadline-rules";
import { formatWeightKg } from "@/features/events/rules/eligibility-rules";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL } from "@/features/events/rules/readiness-rules";
import type { EventDeadline, EventMedal } from "@/features/events/types";
import { examFeeLabels, examFeeTones } from "@/features/exams/labels";
import { formatBrl } from "@/lib/money";

const MEDAL_LABEL: Record<EventMedal, string> = { gold: "Ouro", silver: "Prata", bronze: "Bronze", none: "Participação" };

/** Linha do tempo do cronograma da federação: filiação, inscrição, troca de categoria e pesagem. */
export function DeadlineTimeline({ deadlines, now = new Date() }: { deadlines: EventDeadline[]; now?: Date }) {
  if (deadlines.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum prazo cadastrado. Prazos geram lembretes para você e para a equipe.</p>;
  }
  return (
    <ol className="divide-y divide-border rounded-lg border border-border">
      {sortDeadlines(deadlines).map((deadline) => {
        const state = deadlineState(deadline, now);
        const days = daysUntilDeadline(deadline, now);
        return (
          <li key={deadline.$id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span>
              <span className="font-medium">{deadline.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{DEADLINE_KIND_LABEL[deadline.kind]}</span>
            </span>
            <span className="flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
              {formatEventDay(deadline.due_at)}
              <StatusBadge tone={state === "passed" ? "neutral" : state === "today" ? "danger" : days <= 3 ? "warning" : "info"}>{state === "passed" ? "Encerrado" : state === "today" ? "Hoje" : `Em ${days} ${days === 1 ? "dia" : "dias"}`}</StatusBadge>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function paymentCell(row: ChampionshipRow) {
  const items = [
    { label: "Academia", charge: row.charge, cents: row.registration.price_cents },
    { label: "Federação", charge: row.federationCharge, cents: row.registration.federation_price_cents ?? 0 }
  ].filter((item) => item.cents > 0);
  if (!items.length) return <span className="text-sm text-muted-foreground">Gratuito</span>;
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.label} className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{item.label}</span>
          <span className="tabular-nums">{formatBrl(item.cents)}</span>
          {item.charge ? <StatusBadge tone={examFeeTones[item.charge.status]}>{examFeeLabels[item.charge.status]}</StatusBadge> : <span>sem cobrança</span>}
        </div>
      ))}
    </div>
  );
}

/** Equipe do campeonato: pendências, confirmação, desfazer envio, recusa e cancelamento. */
export function ChampionshipTeamTable({ rows, returnTo }: { rows: ChampionshipRow[]; returnTo: string }) {
  if (rows.length === 0) {
    return <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Nenhum atleta ainda. Alunos e responsáveis manifestam interesse em Eventos; você confirma a equipe aqui.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Atleta</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { registration } = row;
            const interested = ["interested", "pending_approval", "waitlisted"].includes(registration.status);
            const paid = [row.charge, row.federationCharge].some((charge) => charge && !["pending", "overdue", "cancelled"].includes(charge.status));
            return (
              <TableRow key={registration.$id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <StudentAvatar name={row.name} sex={row.sex} photoDocumentId={row.photoDocumentId} size="sm" />
                    <div className="min-w-0">
                      {row.name}
                      <div className="text-xs font-normal text-muted-foreground">
                        {[row.beltName, row.ageClass, row.sex === "masculino" ? "Masc." : row.sex === "feminino" ? "Fem." : null, registration.declared_weight_grams ? formatWeightKg(registration.declared_weight_grams) : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{row.option?.label ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <RegistrationStatusBadge status={registration.status} />
                    {registration.external_submitted_at ? <StatusBadge tone="success">Enviado à federação</StatusBadge> : null}
                  </div>
                  {interested || registration.status === "confirmed" ? (
                    row.readiness.ready ? null : (
                      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {row.readiness.missing.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </TableCell>
                <TableCell>{paymentCell(row)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {interested ? (
                      <>
                        <form action={confirmChampionshipAction}>
                          <input type="hidden" name="registration_id" value={registration.$id} />
                          <input type="hidden" name="return_to" value={returnTo} />
                          <FormSubmitButton size="sm" className="min-h-9" pendingLabel="Confirmando…">
                            Confirmar na equipe
                          </FormSubmitButton>
                        </form>
                        {!row.readiness.ready ? (
                          <form action={confirmChampionshipAction}>
                            <input type="hidden" name="registration_id" value={registration.$id} />
                            <input type="hidden" name="return_to" value={returnTo} />
                            <input type="hidden" name="force" value="on" />
                            <FormSubmitButton size="sm" variant="outline" className="min-h-9" pendingLabel="Confirmando…">
                              Confirmar mesmo assim
                            </FormSubmitButton>
                          </form>
                        ) : null}
                        <CancelRegistrationDialog mode="reject" registrationId={registration.$id} returnTo={returnTo} personName={row.name} hasPaidCharge={paid} />
                      </>
                    ) : null}
                    {registration.status === "confirmed" && registration.external_submitted_at ? (
                      <form action={submitToFederationAction}>
                        <input type="hidden" name="registration_id" value={registration.$id} />
                        <input type="hidden" name="submitted" value="0" />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <FormSubmitButton size="sm" variant="outline" className="min-h-9" pendingLabel="Salvando…">
                          Desfazer envio
                        </FormSubmitButton>
                      </form>
                    ) : null}
                    {["interested", "pending_approval", "confirmed", "waitlisted"].includes(registration.status) ? <CancelRegistrationDialog registrationId={registration.$id} returnTo={returnTo} personName={row.name} hasPaidCharge={paid} /> : null}
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

/** Confirmados e sem pendências ainda não enviados: marcados por padrão, desmarque quem fica de fora. */
export function FederationSubmitPanel({ rows, returnTo }: { rows: ChampionshipRow[]; returnTo: string }) {
  const ready = rows.filter((row) => row.registration.status === "confirmed" && !row.registration.external_submitted_at && row.readiness.ready);
  const waiting = rows.filter((row) => row.registration.status === "confirmed" && !row.registration.external_submitted_at && !row.readiness.ready).length;
  return (
    <form action={submitToFederationAction} className="space-y-3 rounded-xl bg-card p-4 shadow-xs sm:p-5">
      <input type="hidden" name="return_to" value={returnTo} />
      <div className="space-y-0.5">
        <h3 className="text-base font-semibold">Enviar à federação</h3>
        <p className="text-sm text-muted-foreground">Baixe a lista em CSV, envie à federação e marque os atletas aqui. {waiting ? `${waiting} confirmado${waiting > 1 ? "s" : ""} com pendência não aparece${waiting > 1 ? "m" : ""} nesta lista.` : ""}</p>
      </div>
      {ready.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum atleta pronto para enviar.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ready.map((row) => (
            <li key={row.registration.$id}>
              <label htmlFor={`submit-${row.registration.$id}`} className="flex min-h-11 items-center gap-3 rounded-lg bg-muted px-3 text-sm">
                <Checkbox id={`submit-${row.registration.$id}`} name="registration_id" value={row.registration.$id} defaultChecked />
                <span className="min-w-0 truncate">
                  {row.name} <span className="text-muted-foreground">· {row.option?.label}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <FormSubmitButton className="min-h-11" disabled={ready.length === 0} pendingLabel="Marcando…">
        Marcar como enviados
      </FormSubmitButton>
    </form>
  );
}

/** Documentos das inscrições: abrir, aprovar e recusar com motivo. */
export function DocumentsPanel({ rows, returnTo }: { rows: ChampionshipRow[]; returnTo: string }) {
  const withDocs = rows.filter((row) => row.documents.length > 0);
  if (withDocs.length === 0) {
    return <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Nenhum documento enviado. Autorização e termo assinados, atestado e carteira da federação aparecem aqui para revisão.</p>;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
      {withDocs.map((row) => (
        <li key={row.registration.$id} className="space-y-2 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold">{row.name}</p>
          <ul className="space-y-2">
            {row.documents.map((document) => (
              <li key={document.$id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/api/event-documents/${document.$id}`} target="_blank" className="font-medium text-primary underline-offset-4 hover:underline">
                    {DOCUMENT_KIND_LABEL[document.kind]}
                  </Link>
                  <StatusBadge tone={document.status === "approved" ? "success" : document.status === "rejected" ? "danger" : "warning"}>{DOCUMENT_STATUS_LABEL[document.status]}</StatusBadge>
                  {document.rejection_reason ? <span className="text-xs text-muted-foreground">{document.rejection_reason}</span> : null}
                </span>
                {document.status === "pending" ? (
                  <span className="flex items-center gap-2">
                    <form action={reviewRegistrationDocumentAction}>
                      <input type="hidden" name="document_id" value={document.$id} />
                      <input type="hidden" name="decision" value="approved" />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <FormSubmitButton size="sm" className="min-h-9" pendingLabel="Aprovando…">
                        Aprovar
                      </FormSubmitButton>
                    </form>
                    <RejectDocumentDialog documentId={document.$id} returnTo={returnTo} personName={row.name} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function RejectDocumentDialog({ documentId, returnTo, personName }: { documentId: string; returnTo: string; personName: string }) {
  return (
    <ResponsiveDialog
      trigger={
        <Button variant="outline" size="sm" className="min-h-9">
          Recusar
        </Button>
      }
      title="Recusar documento"
      description={`${personName}. A família é avisada e reenvia o arquivo.`}
    >
      <form action={reviewRegistrationDocumentAction} className="space-y-4 pt-2">
        <input type="hidden" name="document_id" value={documentId} />
        <input type="hidden" name="decision" value="rejected" />
        <input type="hidden" name="return_to" value={returnTo} />
        <Field>
          <FieldLabel htmlFor={`reject-reason-${documentId}`}>Motivo</FieldLabel>
          <Textarea id={`reject-reason-${documentId}`} name="reason" required maxLength={255} rows={3} placeholder="Ex.: arquivo ilegível ou sem assinatura" />
        </Field>
        <FormSubmitButton variant="destructive" className="min-h-11 w-full" pendingLabel="Salvando…">
          Confirmar recusa
        </FormSubmitButton>
      </form>
    </ResponsiveDialog>
  );
}

/** Resultado e medalha por atleta confirmado (ou já concluído). */
export function ResultsEditor({ rows, returnTo }: { rows: ChampionshipRow[]; returnTo: string }) {
  const eligible = rows.filter((row) => ["confirmed", "checked_in", "completed"].includes(row.registration.status));
  if (eligible.length === 0) {
    return <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Confirme atletas na equipe para registrar colocação e medalha depois do campeonato.</p>;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
      {eligible.map((row) => (
        <li key={row.registration.$id} className="space-y-2 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {row.name} <span className="font-normal text-muted-foreground">· {row.option?.label}</span>
            </p>
            {row.result ? <StatusBadge tone={row.result.medal === "none" ? "neutral" : "success"}>{MEDAL_LABEL[row.result.medal]}{row.result.placement ? ` · ${row.result.placement}º` : ""}</StatusBadge> : null}
          </div>
          <form action={recordResultAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_6rem_1fr_auto] sm:items-end">
            <input type="hidden" name="registration_id" value={row.registration.$id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <Field>
              <FieldLabel htmlFor={`medal-${row.registration.$id}`}>Resultado</FieldLabel>
              <Select name="medal" defaultValue={row.result?.medal ?? "none"}>
                <SelectTrigger id={`medal-${row.registration.$id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEDAL_LABEL) as EventMedal[]).map((medal) => (
                    <SelectItem key={medal} value={medal}>
                      {MEDAL_LABEL[medal]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`placement-${row.registration.$id}`}>Colocação</FieldLabel>
              <Input id={`placement-${row.registration.$id}`} name="placement" defaultValue={row.result?.placement ?? ""} inputMode="numeric" placeholder="—" className="h-11 tabular-nums" />
            </Field>
            <Field>
              <FieldLabel htmlFor={`result-notes-${row.registration.$id}`}>Observação</FieldLabel>
              <Input id={`result-notes-${row.registration.$id}`} name="notes" defaultValue={row.result?.notes ?? ""} maxLength={500} className="h-11" />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <FormSubmitButton className="min-h-11" pendingLabel="Salvando…">
                {row.result ? "Atualizar" : "Registrar"}
              </FormSubmitButton>
              {row.registration.status !== "completed" ? (
                <FormSubmitButton name="absent" value="1" variant="outline" className="min-h-11" pendingLabel="Salvando…">
                  Não compareceu
                </FormSubmitButton>
              ) : null}
            </div>
          </form>
        </li>
      ))}
    </ul>
  );
}
