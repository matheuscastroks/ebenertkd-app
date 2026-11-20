"use client";

import { useId, useMemo, useState } from "react";
import { saveNotificationsPolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import type { NotificationsPolicy } from "@/features/academy/defaults";
import { notificationsImpactNotes } from "@/features/academy/impact-notes";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { parseIntegerInput } from "@/features/billing/money-input";

const parseList = (text: string) =>
  text
    .split(/[,;\s]+/)
    .filter((item) => item.trim() !== "")
    .map((item) => Math.trunc(Number(item)))
    .filter((item) => Number.isFinite(item));

/** Descreve a régua em linguagem simples: "3 dias antes, no dia, 3 dias depois". */
export function describeStages(stages: readonly number[]): string {
  if (stages.length === 0) return "nenhum lembrete fixo";
  return [...stages]
    .sort((a, b) => a - b)
    .map((day) => (day === 0 ? "no vencimento" : day < 0 ? `${-day} ${day === -1 ? "dia" : "dias"} antes` : `${day} ${day === 1 ? "dia" : "dias"} depois`))
    .join(", ");
}

/** Régua de lembretes de pagamento e alerta de vencimento próximo. */
export function NotificationsPolicyForm({ policy, revision }: { policy: NotificationsPolicy; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveNotificationsPolicyAction, "Régua de lembretes atualizada");
  const [stages, setStages] = useState(policy.payment_stages.join(", "));
  const [weeklyFrom, setWeeklyFrom] = useState(String(policy.overdue_weekly_from_day));
  const [dueSoon, setDueSoon] = useState(String(policy.due_soon_alert_days));

  const after: NotificationsPolicy = useMemo(
    () => ({ payment_stages: parseList(stages).sort((a, b) => a - b), overdue_weekly_from_day: parseIntegerInput(weeklyFrom), due_soon_alert_days: parseIntegerInput(dueSoon) }),
    [stages, weeklyFrom, dueSoon]
  );
  const notes = notificationsImpactNotes(policy, after);

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />
      <Card>
        <CardHeader>
          <CardTitle>Lembretes de pagamento</CardTitle>
          <CardDescription>Quando o responsável é avisado sobre uma mensalidade. Os lembretes saem pela rotina diária.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ConfigField id="payment_stages" label="Dias da régua" error={fieldErrors.payment_stages} help="Dias em relação ao vencimento. Número negativo é antes do vencimento, 0 é o dia e positivo é depois (atraso). Ex.: -3, 0, 3." className="sm:col-span-2">
            <Input id="payment_stages" name="payment_stages" inputMode="text" placeholder="Ex.: -3, 0, 3" value={stages} onChange={(event) => setStages(event.target.value)} />
          </ConfigField>
          <ConfigField id="overdue_weekly_from_day" label="Lembrete semanal a partir de (dias de atraso)" error={fieldErrors.overdue_weekly_from_day} help="A partir deste dia de atraso o lembrete se repete a cada 7 dias. Precisa ser depois do último dia da régua.">
            <Input id="overdue_weekly_from_day" name="overdue_weekly_from_day" inputMode="numeric" value={weeklyFrom} onChange={(event) => setWeeklyFrom(event.target.value)} required />
          </ConfigField>
          <ConfigField id="due_soon_alert_days" label="Alerta de vencimento próximo (dias)" error={fieldErrors.due_soon_alert_days} help="No aplicativo, mensalidades que vencem em até este número de dias aparecem como pendência.">
            <Input id="due_soon_alert_days" name="due_soon_alert_days" inputMode="numeric" value={dueSoon} onChange={(event) => setDueSoon(event.target.value)} required />
          </ConfigField>
          <p className="text-sm text-muted-foreground sm:col-span-2">Com estes valores: {describeStages(after.payment_stages)}; depois, toda semana a partir do {after.overdue_weekly_from_day}º dia de atraso.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar régua de lembretes</Button>}
          title="Salvar régua de lembretes?"
          effect={notes.length > 0 ? notes.join(" ") : "Nenhum valor foi alterado em relação ao que já está salvo."}
          summary={[
            { label: "Régua", value: describeStages(after.payment_stages) },
            { label: "Lembrete semanal a partir de", value: `${after.overdue_weekly_from_day} dias de atraso` },
            { label: "Alerta de vencimento próximo", value: `${after.due_soon_alert_days} dias` }
          ]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
