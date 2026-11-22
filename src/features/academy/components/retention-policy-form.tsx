"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { previewRetentionImpactAction, saveRetentionPolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import type { RetentionPolicy } from "@/features/academy/defaults";
import { retentionImpactNotes } from "@/features/academy/impact-notes";
import type { RetentionImpact } from "@/features/academy/impact-rules";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { parseIntegerInput } from "@/features/billing/money-input";

type FieldKey = keyof RetentionPolicy;
type FieldSpec = { key: FieldKey; label: string; help: string };

const CRITICAL_FIELDS: FieldSpec[] = [
  { key: "critical_consecutive_absences", label: "Faltas seguidas", help: "Quantas faltas seguidas, sem abono, colocam o aluno em risco crítico." },
  { key: "critical_days_without_presence", label: "Dias sem treinar", help: "Dias desde a última presença a partir dos quais o risco é crítico." },
  { key: "critical_rate_pct", label: "Frequência abaixo de (%)", help: "Frequência na janela abaixo deste percentual (com aulas suficientes) é risco crítico." },
  { key: "critical_min_lessons", label: "Mínimo de aulas na janela", help: "Só avalia a frequência percentual quando houve pelo menos este número de aulas na janela." }
];

const WARNING_FIELDS: FieldSpec[] = [
  { key: "warning_consecutive_absences", label: "Faltas seguidas", help: "Faltas seguidas que colocam o aluno em atenção. Precisa ser menor que a do nível crítico." },
  { key: "warning_days_without_presence", label: "Dias sem treinar", help: "Dias sem treinar que colocam o aluno em atenção. Precisa ser menor que a do nível crítico." },
  { key: "warning_rate_pct", label: "Frequência abaixo de (%)", help: "Frequência na janela abaixo deste percentual (com aulas suficientes) coloca o aluno em atenção." },
  { key: "warning_min_lessons", label: "Mínimo de aulas na janela", help: "Aulas mínimas na janela para avaliar a frequência percentual." }
];

const LEVEL_LABELS = [
  { key: "critical", label: "Risco crítico" },
  { key: "warning", label: "Em atenção" },
  { key: "healthy", label: "Regular" }
] as const;

/** Limiares de risco de evasão do painel de retenção, com a nova contagem por nível antes de salvar. */
export function RetentionPolicyForm({ policy, revision }: { policy: RetentionPolicy; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveRetentionPolicyAction, "Regras de retenção atualizadas");
  const [values, setValues] = useState<Record<FieldKey, string>>(() => Object.fromEntries(Object.entries(policy).map(([key, value]) => [key, String(value)])) as Record<FieldKey, string>);
  const [impact, setImpact] = useState<RetentionImpact | null>(null);
  const [impactFailed, setImpactFailed] = useState(false);
  const [calculating, startCalculating] = useTransition();

  const after: RetentionPolicy = useMemo(
    () => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, parseIntegerInput(value)])) as RetentionPolicy,
    [values]
  );
  const notes = retentionImpactNotes(policy, after);

  const calculateImpact = () => {
    const source = document.getElementById(formId) as HTMLFormElement | null;
    if (!source) return;
    const data = new FormData(source);
    startCalculating(async () => {
      const result = await previewRetentionImpactAction(data).catch(() => ({ ok: false as const }));
      setImpactFailed(!result.ok);
      setImpact(result.ok ? result.impact : null);
    });
  };

  const renderField = ({ key, label, help }: FieldSpec) => (
    <ConfigField key={key} id={key} label={label} help={help} error={fieldErrors[key]}>
      <Input id={key} name={key} inputMode="numeric" value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} required />
    </ConfigField>
  );

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />
      <Card>
        <CardHeader>
          <CardTitle>Risco de evasão</CardTitle>
          <CardDescription>Quando o painel de retenção marca um aluno como em atenção ou em risco crítico. Faltas abonadas não contam.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Risco crítico</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{CRITICAL_FIELDS.map(renderField)}</div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Em atenção</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{WARNING_FIELDS.map(renderField)}</div>
          </div>
          <div className="w-full sm:max-w-xs">
            {renderField({ key: "window_days", label: "Janela de frequência (dias)", help: "Período considerado para calcular a frequência percentual e a contagem de aulas." })}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Button type="button" variant="outline" className="min-h-11" onClick={calculateImpact} disabled={calculating}>
              {calculating ? "Calculando…" : "Ver a nova contagem por nível de risco"}
            </Button>
            {impact ? (
              <div role="status" className="space-y-1 text-sm">
                <p className="text-muted-foreground">{impact.total} aluno{impact.total === 1 ? "" : "s"} ativo{impact.total === 1 ? "" : "s"} avaliado{impact.total === 1 ? "" : "s"}.</p>
                <ul className="divide-y divide-border">
                  {LEVEL_LABELS.map(({ key, label }) => (
                    <li key={key} className="flex items-center justify-between gap-3 py-1.5">
                      <span>{label}</span>
                      <span className="tabular-nums">{impact.before[key]} hoje, {impact.after[key]} com estes valores</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {impactFailed ? <p role="alert" className="text-sm text-destructive">Não foi possível calcular agora. Confira os valores e tente de novo.</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar regras de retenção</Button>}
          title="Salvar regras de retenção?"
          effect={notes.length > 0 ? notes.join(" ") : "Nenhum valor foi alterado em relação ao que já está salvo."}
          summary={[
            { label: "Crítico: faltas seguidas", value: String(after.critical_consecutive_absences) },
            { label: "Crítico: dias sem treinar", value: String(after.critical_days_without_presence) },
            { label: "Atenção: faltas seguidas", value: String(after.warning_consecutive_absences) },
            { label: "Atenção: dias sem treinar", value: String(after.warning_days_without_presence) },
            { label: "Janela de frequência", value: `${after.window_days} dias` }
          ]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
