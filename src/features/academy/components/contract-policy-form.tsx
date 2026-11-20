"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { saveContractPolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import type { ContractPolicy, ExitFeeMode } from "@/features/academy/defaults";
import { exitFeeText } from "@/features/academy/contract-policy";
import { contractImpactNotes } from "@/features/academy/impact-notes";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { centsToInput, parseIntegerInput, parseMoneyInput } from "@/features/billing/money-input";
import { ROUTES } from "@/lib/navigation/routes";

const EXIT_MODE_LABELS: Record<ExitFeeMode, string> = {
  one_monthly_fee: "Uma mensalidade",
  fixed: "Valor fixo",
  none: "Sem encargo"
};

/** Regras de contrato: duração, prazo de cancelamento, encargo de saída e rematrícula. */
export function ContractPolicyForm({
  policy,
  revision,
  templateUsesVariables
}: {
  policy: ContractPolicy;
  revision: number;
  /** `null` quando não há modelo publicado para conferir. */
  templateUsesVariables: boolean | null;
}) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveContractPolicyAction, "Regras de contrato atualizadas");
  const [duration, setDuration] = useState(String(policy.default_duration_months));
  const [noticeDay, setNoticeDay] = useState(String(policy.cancellation_notice_day));
  const [mode, setMode] = useState<ExitFeeMode>(policy.exit_fee_mode);
  const [fixedFee, setFixedFee] = useState(policy.exit_fee_cents > 0 ? centsToInput(policy.exit_fee_cents) : "");
  const [rematriculation, setRematriculation] = useState(String(policy.rematriculation_after_months));
  const [reminders, setReminders] = useState(policy.renewal_reminder_days.join(", "));

  const after: ContractPolicy = useMemo(() => ({
    ...policy,
    default_duration_months: parseIntegerInput(duration),
    cancellation_notice_day: parseIntegerInput(noticeDay),
    exit_fee_mode: mode,
    exit_fee_cents: mode === "fixed" ? parseMoneyInput(fixedFee) : 0,
    rematriculation_after_months: parseIntegerInput(rematriculation),
    renewal_reminder_days: reminders
      .split(/[,;\s]+/)
      .filter((item) => item.trim() !== "")
      .map((item) => Math.trunc(Number(item)))
      .filter((item) => Number.isFinite(item) && item > 0)
      .sort((a, b) => b - a)
  }), [policy, duration, noticeDay, mode, fixedFee, rematriculation, reminders]);
  const notes = contractImpactNotes(policy, after, templateUsesVariables);

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />

      <Card>
        <CardHeader>
          <CardTitle>Vigência</CardTitle>
          <CardDescription>Sugestão de duração ao aprovar a matrícula e ao renovar o contrato.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ConfigField id="default_duration_months" label="Duração padrão (meses)" error={fieldErrors.default_duration_months} help="Só preenche a data de término sugerida. Você pode alterar as datas em cada matrícula.">
            <Input id="default_duration_months" name="default_duration_months" inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} required />
          </ConfigField>
          <ConfigField id="rematriculation_after_months" label="Rematrícula após afastamento (meses)" error={fieldErrors.rematriculation_after_months} help="Quem volta depois deste tempo afastado pode precisar de uma nova matrícula. Entra no texto do contrato.">
            <Input id="rematriculation_after_months" name="rematriculation_after_months" inputMode="numeric" value={rematriculation} onChange={(event) => setRematriculation(event.target.value)} required />
          </ConfigField>
          <ConfigField id="renewal_reminder_days" label="Avisos de renovação (dias antes do fim)" error={fieldErrors.renewal_reminder_days} help="Dias antes do término do contrato em que a renovação é lembrada. Separe por vírgula. Ex.: 30, 7." className="sm:col-span-2">
            <Input id="renewal_reminder_days" name="renewal_reminder_days" inputMode="text" placeholder="Ex.: 30, 7" value={reminders} onChange={(event) => setReminders(event.target.value)} required />
          </ConfigField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cancelamento</CardTitle>
          <CardDescription>
            Cada contrato guarda a regra do dia em que foi emitido. Mudar aqui vale só para os próximos contratos.{" "}
            <Link href={ROUTES.adminContractTemplate} className="font-medium text-foreground underline underline-offset-4">Editar texto do contrato</Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ConfigField id="cancellation_notice_day" label="Dia limite do aviso" error={fieldErrors.cancellation_notice_day} help="Quem avisa a saída até este dia do mês anterior sai sem encargo. Depois dele, vale o encargo abaixo. De 1 a 28.">
            <Input id="cancellation_notice_day" name="cancellation_notice_day" inputMode="numeric" value={noticeDay} onChange={(event) => setNoticeDay(event.target.value)} required />
          </ConfigField>
          <ConfigField id="exit_fee_mode" label="Encargo de saída" error={fieldErrors.exit_fee_mode} help="O que é cobrado de quem avisa depois do dia limite.">
            <Select name="exit_fee_mode" value={mode} onValueChange={(value) => setMode(value as ExitFeeMode)}>
              <SelectTrigger id="exit_fee_mode" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(EXIT_MODE_LABELS) as ExitFeeMode[]).map((key) => (
                  <SelectItem key={key} value={key}>{EXIT_MODE_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConfigField>
          {mode === "fixed" ? (
            <ConfigField id="exit_fee" label="Valor fixo do encargo" error={fieldErrors.exit_fee_cents}>
              <InputGroup>
                <InputGroupAddon><InputGroupText>R$</InputGroupText></InputGroupAddon>
                <InputGroupInput id="exit_fee" name="exit_fee" inputMode="decimal" value={fixedFee} onChange={(event) => setFixedFee(event.target.value)} />
              </InputGroup>
            </ConfigField>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar regras de contrato</Button>}
          title="Salvar regras de contrato?"
          effect={notes.length > 0 ? notes.join(" ") : "Nenhum valor foi alterado em relação ao que já está salvo."}
          summary={[
            { label: "Duração padrão", value: `${after.default_duration_months} meses` },
            { label: "Dia limite do aviso", value: `dia ${after.cancellation_notice_day}` },
            { label: "Encargo de saída", value: exitFeeText(after) },
            { label: "Rematrícula após", value: `${after.rematriculation_after_months} meses` },
            { label: "Avisos de renovação", value: `${after.renewal_reminder_days.join(", ")} dias antes` }
          ]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
