"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { previewAccessImpactAction, saveAccessPolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import type { AccessPolicy } from "@/features/academy/defaults";
import { accessImpactNotes } from "@/features/academy/impact-notes";
import type { AccessImpact } from "@/features/academy/impact-service";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { parseIntegerInput } from "@/features/billing/money-input";

/** Bloqueio do aplicativo por mensalidade: liga/desliga, janela após o pagamento e aviso antecipado. */
export function AccessPolicyForm({ policy, revision }: { policy: AccessPolicy; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveAccessPolicyAction, "Regra de acesso atualizada");
  const [enabled, setEnabled] = useState(policy.enabled);
  const [windowDays, setWindowDays] = useState(String(policy.window_days));
  const [warningDays, setWarningDays] = useState(String(policy.warning_days));
  const [impact, setImpact] = useState<AccessImpact | null>(null);
  const [impactFailed, setImpactFailed] = useState(false);
  const [calculating, startCalculating] = useTransition();

  const after: AccessPolicy = useMemo(
    () => ({ enabled, window_days: parseIntegerInput(windowDays), warning_days: parseIntegerInput(warningDays) }),
    [enabled, windowDays, warningDays]
  );
  const notes = accessImpactNotes(policy, after);

  const calculateImpact = () => {
    const source = document.getElementById(formId) as HTMLFormElement | null;
    if (!source) return;
    const data = new FormData(source);
    startCalculating(async () => {
      const result = await previewAccessImpactAction(data).catch(() => ({ ok: false as const }));
      setImpactFailed(!result.ok);
      setImpact(result.ok ? result.impact : null);
    });
  };

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />
      <Card>
        <CardHeader>
          <CardTitle>Acesso ao aplicativo</CardTitle>
          <CardDescription>O aluno com mensalidade em atraso fica sem acesso às telas de treino até enviar o comprovante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="access_enabled" name="enabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="access_enabled">Bloquear o acesso por mensalidade</Label>
          </div>
          {enabled ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ConfigField id="window_days" label="Dias de acesso após o pagamento" error={fieldErrors.window_days} help="Depois de um pagamento confirmado, o aluno tem esta quantidade de dias de acesso antes de o aplicativo pausar.">
                <Input id="window_days" name="window_days" inputMode="numeric" value={windowDays} onChange={(event) => setWindowDays(event.target.value)} required />
              </ConfigField>
              <ConfigField id="warning_days" label="Aviso antes de vencer (dias)" error={fieldErrors.warning_days} help="Quantos dias antes do fim da janela o aluno vê o aviso de que o acesso vai pausar.">
                <Input id="warning_days" name="warning_days" inputMode="numeric" value={warningDays} onChange={(event) => setWarningDays(event.target.value)} required />
              </ConfigField>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Com o bloqueio desligado, ninguém perde acesso por atraso de mensalidade.</p>
          )}

          <div className="space-y-2 rounded-lg border border-border p-3">
            <Button type="button" variant="outline" className="min-h-11" onClick={calculateImpact} disabled={calculating}>
              {calculating ? "Calculando…" : "Ver quantos alunos seriam bloqueados hoje"}
            </Button>
            {impact ? (
              <p role="status" className="text-sm">
                Hoje, {impact.lockedNow} de {impact.total} aluno{impact.total === 1 ? "" : "s"} ativo{impact.total === 1 ? "" : "s"} {impact.lockedNow === 1 ? "está bloqueado" : "estão bloqueados"}.
                Com estes valores, {impact.lockedProposed} {impact.lockedProposed === 1 ? "ficaria bloqueado" : "ficariam bloqueados"}.
              </p>
            ) : null}
            {impactFailed ? <p role="alert" className="text-sm text-destructive">Não foi possível calcular agora. Confira os valores e tente de novo.</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar regra de acesso</Button>}
          title="Salvar regra de acesso?"
          effect={notes.length > 0 ? notes.join(" ") : "Nenhum valor foi alterado em relação ao que já está salvo."}
          summary={[
            { label: "Bloqueio por mensalidade", value: after.enabled ? "Ligado" : "Desligado" },
            ...(after.enabled
              ? [
                  { label: "Dias de acesso após o pagamento", value: `${after.window_days} dias` },
                  { label: "Aviso antes de vencer", value: `${after.warning_days} dias` }
                ]
              : [])
          ]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
