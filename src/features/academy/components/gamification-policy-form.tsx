"use client";

import { useId, useMemo, useState } from "react";
import { saveGamificationPolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import { BADGE_METRIC_LABELS, type BadgeDefinition, type GamificationPolicy } from "@/features/academy/defaults";
import { gamificationImpactNotes } from "@/features/academy/impact-notes";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { parseIntegerInput } from "@/features/billing/money-input";

type BadgeDraft = { id: string; title: string; description: string; metric: BadgeDefinition["metric"]; target: string };

const toDraft = (badge: BadgeDefinition): BadgeDraft => ({ ...badge, target: String(badge.target) });

/** Editor das conquistas: título, descrição e meta. O que cada conquista mede (a métrica) é fixo. */
export function GamificationPolicyForm({ policy, revision }: { policy: GamificationPolicy; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveGamificationPolicyAction, "Conquistas atualizadas");
  const [drafts, setDrafts] = useState<BadgeDraft[]>(() => policy.badges.map(toDraft));

  const badges: BadgeDefinition[] = useMemo(
    () => drafts.map((draft) => ({ id: draft.id, title: draft.title.trim(), description: draft.description.trim(), metric: draft.metric, target: parseIntegerInput(draft.target) })),
    [drafts]
  );
  const notes = gamificationImpactNotes(policy, { badges });

  const update = (id: string, patch: Partial<BadgeDraft>) => setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />
      <input type="hidden" name="badges_json" value={JSON.stringify(badges)} />
      <Card>
        <CardHeader>
          <CardTitle>Conquistas dos alunos</CardTitle>
          <CardDescription>Ajuste o nome, a descrição e a meta de cada conquista. O que cada uma mede não muda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldErrors.badges ? <p role="alert" className="text-sm text-destructive">{fieldErrors.badges}</p> : null}
          <ul className="space-y-4">
            {drafts.map((draft) => (
              <li key={draft.id} className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">Mede: {BADGE_METRIC_LABELS[draft.metric]}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <ConfigField id={`badge-title-${draft.id}`} label="Título">
                    <Input id={`badge-title-${draft.id}`} value={draft.title} maxLength={48} onChange={(event) => update(draft.id, { title: event.target.value })} required />
                  </ConfigField>
                  <ConfigField id={`badge-target-${draft.id}`} label="Meta" help="Quanto o aluno precisa alcançar para desbloquear a conquista.">
                    <Input id={`badge-target-${draft.id}`} inputMode="numeric" value={draft.target} onChange={(event) => update(draft.id, { target: event.target.value })} required />
                  </ConfigField>
                </div>
                <ConfigField id={`badge-description-${draft.id}`} label="Descrição">
                  <Textarea id={`badge-description-${draft.id}`} value={draft.description} maxLength={140} rows={2} onChange={(event) => update(draft.id, { description: event.target.value })} />
                </ConfigField>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar conquistas</Button>}
          title="Salvar conquistas?"
          effect={notes.length > 0 ? notes.join(" ") : "Nenhum valor foi alterado em relação ao que já está salvo."}
          summary={[{ label: "Conquistas", value: `${badges.length}` }]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
