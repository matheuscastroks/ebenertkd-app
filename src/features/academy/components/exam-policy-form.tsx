"use client";

import Link from "next/link";
import { useId, useMemo, useState, useTransition } from "react";
import { previewExamImpactAction, saveExamPolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import type { AbsentDecision, ExamPolicy } from "@/features/academy/defaults";
import { eligibilityImpactText, examImpactNotes } from "@/features/academy/impact-notes";
import type { EligibilityImpact } from "@/features/academy/impact-rules";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { centsToInput, parseIntegerInput, parseMoneyInput } from "@/features/billing/money-input";
import { formatBrl } from "@/lib/money";
import { ROUTES } from "@/lib/navigation/routes";

const DECISION_LABELS: Record<AbsentDecision | "none", string> = {
  none: "Perguntar a cada cancelamento",
  keep_charge: "Manter o valor arrecadado (taxa administrativa)",
  future_credit: "Conceder crédito para o próximo exame"
};

/** Regras de exame: taxa padrão, bloqueio por inadimplência, "quase pronto", pular graduações e padrões de elegibilidade. */
export function ExamPolicyForm({ policy, revision }: { policy: ExamPolicy; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveExamPolicyAction, "Regras de exame atualizadas");
  const [fee, setFee] = useState(policy.default_fee_cents != null ? centsToInput(policy.default_fee_cents) || "0" : "");
  const [block, setBlock] = useState(policy.block_on_overdue);
  const [almost, setAlmost] = useState(String(policy.almost_ready_pct));
  const [fallbackDays, setFallbackDays] = useState(String(policy.fallback_min_days));
  const [fallbackPresences, setFallbackPresences] = useState(String(policy.fallback_min_presences));
  const [skip, setSkip] = useState(policy.allow_skip_grades);
  const [decision, setDecision] = useState<AbsentDecision | "none">(policy.absent_default_decision ?? "none");
  const [impact, setImpact] = useState<EligibilityImpact | null>(null);
  const [impactFailed, setImpactFailed] = useState(false);
  const [calculating, startCalculating] = useTransition();

  const after: ExamPolicy = useMemo(
    () => ({
      default_fee_cents: fee.trim() === "" ? null : parseMoneyInput(fee),
      block_on_overdue: block,
      almost_ready_pct: parseIntegerInput(almost),
      fallback_min_days: parseIntegerInput(fallbackDays),
      fallback_min_presences: parseIntegerInput(fallbackPresences),
      allow_skip_grades: skip,
      absent_default_decision: decision === "none" ? null : decision
    }),
    [fee, block, almost, fallbackDays, fallbackPresences, skip, decision]
  );
  const notes = examImpactNotes(policy, after);

  const calculateImpact = () => {
    const source = document.getElementById(formId) as HTMLFormElement | null;
    if (!source) return;
    const data = new FormData(source);
    startCalculating(async () => {
      const result = await previewExamImpactAction(data).catch(() => ({ ok: false as const }));
      setImpactFailed(!result.ok);
      setImpact(result.ok ? result.impact : null);
    });
  };

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />

      <Card>
        <CardHeader>
          <CardTitle>Bancas e inscrições</CardTitle>
          <CardDescription>Padrões usados ao criar uma banca e ao inscrever alunos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ConfigField id="default_fee" label="Taxa padrão da banca" error={fieldErrors.default_fee_cents} help="Valor sugerido ao criar uma banca de exame. Vazio: a taxa é digitada a cada banca. A taxa de uma graduação (em Graduações) tem prioridade.">
            <InputGroup className="sm:max-w-xs">
              <InputGroupAddon>
                <InputGroupText>R$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput id="default_fee" name="default_fee" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="Sem padrão" />
            </InputGroup>
          </ConfigField>

          <div className="flex items-start gap-3">
            <Switch id="allow_skip_grades" name="allow_skip_grades" checked={skip} onCheckedChange={setSkip} className="mt-0.5" />
            <div className="space-y-0.5">
              <Label htmlFor="allow_skip_grades">Permitir pular graduações</Label>
              <p className="text-sm text-muted-foreground">Ligado: o aluno pode ser inscrito para qualquer graduação habilitada acima da atual. Desligado: só para a próxima.</p>
            </div>
          </div>

          <ConfigField id="absent_default_decision" label="Inscrição paga cancelada" error={fieldErrors.absent_default_decision} help="Decisão sugerida quando uma inscrição já paga é cancelada. Você ainda pode escolher outra em cada caso.">
            <Select name="absent_default_decision" value={decision} onValueChange={(value) => setDecision(value as AbsentDecision | "none")}>
              <SelectTrigger id="absent_default_decision" className="h-11 w-full sm:max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DECISION_LABELS) as Array<AbsentDecision | "none">).map((key) => (
                  <SelectItem key={key} value={key}>
                    {DECISION_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConfigField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Elegibilidade</CardTitle>
          <CardDescription>
            O tempo e as presenças de cada graduação ficam em{" "}
            <Link href={ROUTES.adminAcademyGrades} className="relative inline-block leading-6 font-medium text-foreground underline underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-2.5">
              Graduações
            </Link>
            . Aqui ficam o padrão para quem não tem tempo definido e as regras gerais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-3">
            <Switch id="block_on_overdue" name="block_on_overdue" checked={block} onCheckedChange={setBlock} className="mt-0.5" />
            <div className="space-y-0.5">
              <Label htmlFor="block_on_overdue">Mensalidade em atraso bloqueia a inscrição</Label>
              <p className="text-sm text-muted-foreground">Desligado: o aluno aparece como apto mesmo com atraso e o aviso financeiro continua visível.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ConfigField id="almost_ready_pct" label={'"Quase pronto" a partir de (%)'} error={fieldErrors.almost_ready_pct} help="Percentual da meta de tempo e presenças a partir do qual o aluno aparece como quase pronto.">
              <Input id="almost_ready_pct" name="almost_ready_pct" inputMode="numeric" value={almost} onChange={(event) => setAlmost(event.target.value)} required className="h-11 tabular-nums" />
            </ConfigField>
            <ConfigField id="fallback_min_days" label="Tempo mínimo padrão (dias)" error={fieldErrors.fallback_min_days} help="Usado quando uma graduação não tem tempo mínimo próprio.">
              <Input id="fallback_min_days" name="fallback_min_days" inputMode="numeric" value={fallbackDays} onChange={(event) => setFallbackDays(event.target.value)} required className="h-11 tabular-nums" />
            </ConfigField>
            <ConfigField id="fallback_min_presences" label="Presenças mínimas padrão" error={fieldErrors.fallback_min_presences} help="Usado quando uma graduação não tem presenças mínimas próprias.">
              <Input id="fallback_min_presences" name="fallback_min_presences" inputMode="numeric" value={fallbackPresences} onChange={(event) => setFallbackPresences(event.target.value)} required className="h-11 tabular-nums" />
            </ConfigField>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Button type="button" variant="outline" className="min-h-11" onClick={calculateImpact} disabled={calculating}>
              {calculating ? "Calculando…" : "Ver o impacto na elegibilidade"}
            </Button>
            {impact ? (
              <p role="status" className="text-sm">
                {eligibilityImpactText(impact)}
              </p>
            ) : null}
            {impactFailed ? (
              <p role="alert" className="text-sm text-destructive">
                Não foi possível calcular agora. Confira os valores e tente de novo.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar regras de exame</Button>}
          title="Salvar regras de exame?"
          effect={notes.length > 0 ? notes.join(" ") : "Nenhum valor foi alterado em relação ao que já está salvo."}
          summary={[
            { label: "Taxa padrão da banca", value: after.default_fee_cents == null ? "Sem padrão" : formatBrl(after.default_fee_cents) },
            { label: "Inadimplência bloqueia", value: after.block_on_overdue ? "Sim" : "Não" },
            { label: "Quase pronto", value: `${after.almost_ready_pct}%` },
            { label: "Pular graduações", value: after.allow_skip_grades ? "Permitido" : "Só a próxima" },
            { label: "Tempo e presenças padrão", value: `${after.fallback_min_days} dias · ${after.fallback_min_presences} aulas` }
          ]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
