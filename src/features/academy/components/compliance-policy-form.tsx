"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { previewComplianceImpactAction, saveCompliancePolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import type { CompliancePolicy } from "@/features/academy/defaults";
import { complianceImpactNotes } from "@/features/academy/impact-notes";
import type { ComplianceImpact } from "@/features/academy/impact-rules";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { parseIntegerInput } from "@/features/billing/money-input";

const listText = (list: readonly number[]) => list.join(", ");
const parseList = (text: string) =>
  text
    .split(/[,;\s]+/)
    .filter((item) => item.trim() !== "")
    .map((item) => Math.trunc(Number(item)))
    .filter((item) => Number.isFinite(item));

/** Atestado médico e PAR-Q: validade, janela de alerta, lembretes e quantos alunos ficariam irregulares. */
export function CompliancePolicyForm({ policy, revision }: { policy: CompliancePolicy; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveCompliancePolicyAction, "Regras de documentos atualizadas");
  const [medicalValidity, setMedicalValidity] = useState(String(policy.medical_validity_days));
  const [medicalWindow, setMedicalWindow] = useState(String(policy.medical_expiring_window_days));
  const [parqValidity, setParqValidity] = useState(String(policy.parq_validity_days));
  const [parqWindow, setParqWindow] = useState(String(policy.parq_expiring_window_days));
  const [reminders, setReminders] = useState(listText(policy.parq_reminder_days));
  const [impact, setImpact] = useState<ComplianceImpact | null>(null);
  const [impactFailed, setImpactFailed] = useState(false);
  const [calculating, startCalculating] = useTransition();

  const after: CompliancePolicy = useMemo(
    () => ({
      medical_validity_days: parseIntegerInput(medicalValidity),
      medical_expiring_window_days: parseIntegerInput(medicalWindow),
      parq_validity_days: parseIntegerInput(parqValidity),
      parq_expiring_window_days: parseIntegerInput(parqWindow),
      parq_reminder_days: parseList(reminders).sort((a, b) => b - a)
    }),
    [medicalValidity, medicalWindow, parqValidity, parqWindow, reminders]
  );
  const notes = complianceImpactNotes(policy, after);

  const calculateImpact = () => {
    const source = document.getElementById(formId) as HTMLFormElement | null;
    if (!source) return;
    const data = new FormData(source);
    startCalculating(async () => {
      const result = await previewComplianceImpactAction(data).catch(() => ({ ok: false as const }));
      setImpactFailed(!result.ok);
      setImpact(result.ok ? result.impact : null);
    });
  };

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />
      <Card>
        <CardHeader>
          <CardTitle>Atestado médico e PAR-Q</CardTitle>
          <CardDescription>Por quanto tempo cada documento vale e quando o aluno e o responsável são avisados. Vale também para os documentos já enviados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ConfigField id="medical_validity_days" label="Validade do atestado (dias)" error={fieldErrors.medical_validity_days} help="Contada da aprovação do atestado pelo professor.">
              <Input id="medical_validity_days" name="medical_validity_days" inputMode="numeric" value={medicalValidity} onChange={(event) => setMedicalValidity(event.target.value)} required />
            </ConfigField>
            <ConfigField id="medical_expiring_window_days" label="Alerta antes de vencer (dias)" error={fieldErrors.medical_expiring_window_days} help="Quantos dias antes do vencimento o atestado aparece como 'vence em breve'.">
              <Input id="medical_expiring_window_days" name="medical_expiring_window_days" inputMode="numeric" value={medicalWindow} onChange={(event) => setMedicalWindow(event.target.value)} required />
            </ConfigField>
            <ConfigField id="parq_validity_days" label="Validade do PAR-Q (dias)" error={fieldErrors.parq_validity_days} help="Contada da data da assinatura do questionário.">
              <Input id="parq_validity_days" name="parq_validity_days" inputMode="numeric" value={parqValidity} onChange={(event) => setParqValidity(event.target.value)} required />
            </ConfigField>
            <ConfigField id="parq_expiring_window_days" label="Alerta antes de vencer (dias)" error={fieldErrors.parq_expiring_window_days} help="Quantos dias antes do vencimento o PAR-Q aparece como 'vence em breve'.">
              <Input id="parq_expiring_window_days" name="parq_expiring_window_days" inputMode="numeric" value={parqWindow} onChange={(event) => setParqWindow(event.target.value)} required />
            </ConfigField>
            <ConfigField id="parq_reminder_days" label="Lembretes do PAR-Q (dias antes)" error={fieldErrors.parq_reminder_days} help="Dias antes do vencimento em que o aluno ou responsável recebe o aviso. Use 0 para o dia do vencimento. Deixe vazio para não enviar lembretes." className="sm:col-span-2">
              <Input id="parq_reminder_days" name="parq_reminder_days" inputMode="text" placeholder="Ex.: 30, 7, 0" value={reminders} onChange={(event) => setReminders(event.target.value)} />
            </ConfigField>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Button type="button" variant="outline" className="min-h-11" onClick={calculateImpact} disabled={calculating}>
              {calculating ? "Calculando…" : "Ver quantos alunos ficariam irregulares"}
            </Button>
            {impact ? (
              <p role="status" className="text-sm">
                Hoje, {impact.irregularNow} de {impact.total} aluno{impact.total === 1 ? "" : "s"} {impact.irregularNow === 1 ? "tem" : "têm"} atestado ou PAR-Q vencido.
                Com estes valores, {impact.irregularProposed}: {impact.becomingIrregular} {impact.becomingIrregular === 1 ? "passa" : "passam"} a ficar irregular{impact.becomingIrregular === 1 ? "" : "es"} e {impact.becomingRegular} {impact.becomingRegular === 1 ? "volta" : "voltam"} a ficar em dia.
              </p>
            ) : null}
            {impactFailed ? <p role="alert" className="text-sm text-destructive">Não foi possível calcular agora. Confira os valores e tente de novo.</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar regras de documentos</Button>}
          title="Salvar regras de documentos?"
          effect={notes.length > 0 ? notes.join(" ") : "Nenhum valor foi alterado em relação ao que já está salvo."}
          summary={[
            { label: "Validade do atestado", value: `${after.medical_validity_days} dias` },
            { label: "Validade do PAR-Q", value: `${after.parq_validity_days} dias` },
            { label: "Lembretes do PAR-Q", value: after.parq_reminder_days.length > 0 ? after.parq_reminder_days.join(", ") : "Nenhum" }
          ]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
