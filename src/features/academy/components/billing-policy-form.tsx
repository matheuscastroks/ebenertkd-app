"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { saveBillingPolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import { DUE_DAY_MAX, DUE_DAY_MIN, type BillingPolicy } from "@/features/academy/defaults";
import { billingImpactNotes } from "@/features/academy/impact-notes";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { centsToInput, parseIntegerInput, parseMoneyInput } from "@/features/billing/money-input";
import { formatBrl } from "@/lib/money";
import { ROUTES } from "@/lib/navigation/routes";

const DAYS = Array.from({ length: DUE_DAY_MAX - DUE_DAY_MIN + 1 }, (_, index) => DUE_DAY_MIN + index);

/** Política financeira: mensalidade padrão, taxa de matrícula, dias de vencimento e aviso de reajuste. */
export function BillingPolicyForm({ policy, revision }: { policy: BillingPolicy; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveBillingPolicyAction, "Política financeira atualizada");
  const [fee, setFee] = useState(centsToInput(policy.default_monthly_fee_cents));
  const [enrollmentEnabled, setEnrollmentEnabled] = useState(policy.enrollment_fee_enabled);
  const [enrollmentFee, setEnrollmentFee] = useState(policy.enrollment_fee_cents > 0 ? centsToInput(policy.enrollment_fee_cents) : "");
  const [days, setDays] = useState<number[]>(policy.due_day_options);
  const [notice, setNotice] = useState(String(policy.adjustment_min_notice_days));
  const [leadDays, setLeadDays] = useState(String(policy.charge_lead_days));

  const after: BillingPolicy = useMemo(() => ({
    ...policy,
    default_monthly_fee_cents: parseMoneyInput(fee),
    enrollment_fee_enabled: enrollmentEnabled,
    enrollment_fee_cents: parseMoneyInput(enrollmentFee),
    due_day_options: [...days].sort((a, b) => a - b),
    adjustment_min_notice_days: parseIntegerInput(notice),
    charge_lead_days: parseIntegerInput(leadDays)
  }), [policy, fee, enrollmentEnabled, enrollmentFee, days, notice, leadDays]);
  const notes = billingImpactNotes(policy, after);

  const toggleDay = (day: number, checked: boolean) => setDays((current) => (checked ? [...new Set([...current, day])] : current.filter((item) => item !== day)));

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />

      <Card>
        <CardHeader>
          <CardTitle>Mensalidade e matrícula</CardTitle>
          <CardDescription>
            Valores sugeridos ao aprovar uma matrícula. Para mudar o valor dos alunos atuais, use o{" "}
            <Link href={ROUTES.adminBillingAdjustment} className="relative inline-block leading-6 font-medium text-foreground underline underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-2.5">reajuste de mensalidade</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ConfigField id="default_monthly_fee" label="Mensalidade padrão" error={fieldErrors.default_monthly_fee_cents} help="Vem preenchida na aprovação de novas matrículas. Você pode ajustar o valor de cada aluno.">
            <InputGroup>
              <InputGroupAddon><InputGroupText>R$</InputGroupText></InputGroupAddon>
              <InputGroupInput id="default_monthly_fee" name="default_monthly_fee" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} required />
            </InputGroup>
          </ConfigField>
          <ConfigField id="adjustment_min_notice_days" label="Aviso mínimo de reajuste (dias)" error={fieldErrors.adjustment_min_notice_days} help="Antecedência recomendada entre o aviso e a vigência do novo valor. A tela de reajuste alerta quando o prazo é menor.">
            <Input id="adjustment_min_notice_days" name="adjustment_min_notice_days" inputMode="numeric" value={notice} onChange={(event) => setNotice(event.target.value)} required />
          </ConfigField>

          <ConfigField id="charge_lead_days" label="Gerar a mensalidade antes (dias)" error={fieldErrors.charge_lead_days} help="A rotina diária cria a cobrança da competência com esta antecedência em relação ao dia 1. Cobranças já geradas não mudam.">
            <Input id="charge_lead_days" name="charge_lead_days" inputMode="numeric" value={leadDays} onChange={(event) => setLeadDays(event.target.value)} required />
          </ConfigField>

          <div className="space-y-3 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-3">
              <Switch id="enrollment_fee_enabled" name="enrollment_fee_enabled" checked={enrollmentEnabled} onCheckedChange={setEnrollmentEnabled} />
              <Label htmlFor="enrollment_fee_enabled">Cobrar taxa de matrícula</Label>
            </div>
            {enrollmentEnabled ? (
              <ConfigField id="enrollment_fee" label="Valor da taxa de matrícula" error={fieldErrors.enrollment_fee_cents} help="Gerada uma única vez quando a matrícula é aprovada, com o vencimento da primeira mensalidade.">
                <InputGroup className="sm:max-w-xs">
                  <InputGroupAddon><InputGroupText>R$</InputGroupText></InputGroupAddon>
                  <InputGroupInput id="enrollment_fee" name="enrollment_fee" inputMode="decimal" value={enrollmentFee} onChange={(event) => setEnrollmentFee(event.target.value)} />
                </InputGroup>
              </ConfigField>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dias de vencimento</CardTitle>
          <CardDescription>Dias que o aluno pode escolher ao preencher a ficha. Entre {DUE_DAY_MIN} e {DUE_DAY_MAX}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <fieldset className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-9">
            <legend className="sr-only">Dias de vencimento oferecidos</legend>
            {DAYS.map((day) => (
              <div key={day} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3">
                <Checkbox id={`due-day-${day}`} name="due_day_options" value={String(day)} checked={days.includes(day)} onCheckedChange={(checked) => toggleDay(day, checked === true)} />
                <Label htmlFor={`due-day-${day}`} className="flex-1 cursor-pointer tabular-nums">{day}</Label>
              </div>
            ))}
          </fieldset>
          {fieldErrors.due_day_options ? <p role="alert" className="text-sm text-destructive">{fieldErrors.due_day_options}</p> : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar política financeira</Button>}
          title="Salvar política financeira?"
          effect={notes.length > 0 ? notes.join(" ") : "Nenhum valor foi alterado em relação ao que já está salvo."}
          summary={[
            { label: "Mensalidade padrão", value: formatBrl(after.default_monthly_fee_cents) },
            { label: "Taxa de matrícula", value: after.enrollment_fee_enabled ? formatBrl(after.enrollment_fee_cents) : "Não cobrada" },
            { label: "Dias de vencimento", value: after.due_day_options.join(", ") || "Nenhum" },
            { label: "Aviso mínimo de reajuste", value: `${after.adjustment_min_notice_days} dias` },
            { label: "Geração da mensalidade", value: `${after.charge_lead_days} dias antes` }
          ]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
