"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { applyBeltPresetAction } from "@/app/actions/academy-settings";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@/components/ui/icons";
import type { RankConfig } from "@/features/academy/belt-rules";
import { diffPreset } from "@/features/academy/preset-rules";
import type { BeltPreset } from "@/features/academy/presets";
import { rankShortLabel } from "@/features/academy/ranks";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { BeltBadgeView, danDegreeOf } from "@/features/students/components/belt-badge";

/**
 * "Aplicar modelo": mostra o que muda (só nomes, cores e formas), avisa o que NÃO muda e pede confirmação.
 * Alunos, tempos, presenças, taxas e a habilitação das graduações ficam como estão.
 */
export function BeltPresetDialog({ ranks, preset, current }: { ranks: RankConfig[]; preset: BeltPreset; current?: boolean }) {
  const router = useRouter();
  const diffs = diffPreset(ranks, preset);

  const apply = async () => {
    const result = await applyBeltPresetAction(preset.id).catch(() => ({ ok: false as const, error: "failed" as const }));
    if (result.ok) {
      toast.success(`Modelo ${preset.label} aplicado`, { description: "Ajuste cada graduação como quiser. Alunos e tempos não foram alterados." });
      router.refresh();
    } else if (result.error === "revision_conflict") {
      toast.error("Não foi possível aplicar", { description: "Outra alteração foi salva antes. Recarregue a página e tente de novo." });
    } else {
      toast.error("Não foi possível aplicar o modelo", { description: "Confira os nomes das graduações e tente de novo." });
    }
  };

  return (
    <ConsequenceDialog
      trigger={
        <Button type="button" variant="outline" className="min-h-11">
          {preset.label}
        </Button>
      }
      title={`Aplicar o modelo ${preset.label}?`}
      effect={
        diffs.length === 0
          ? "Os nomes, cores e formas já são os deste modelo. Os termos usados no sistema podem mudar."
          : `Troca nome, cor e forma de ${diffs.length} graduaç${diffs.length === 1 ? "ão" : "ões"}. Alunos, tempos, presenças, taxas e quais graduações estão habilitadas não mudam. Alterações não salvas na tabela serão descartadas.`
      }
      summary={[
        { label: "Termo da forma", value: preset.formLabel },
        { label: "Termo do nível", value: preset.levelLabel }
      ]}
      confirmLabel="Aplicar modelo"
      action={apply}
    >
      {diffs.length > 0 ? (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border" aria-label="Mudanças do modelo">
          {diffs.map((diff) => (
            <li key={diff.rank_key} className="space-y-1.5 p-2.5 text-sm">
              <p className="font-medium text-foreground">{rankShortLabel(diff.rank_key)}</p>
              <div className="flex flex-wrap items-center gap-2">
                <BeltBadgeView appearance={{ name: diff.before.display_name, colorPrimary: diff.before.color_primary, colorSecondary: diff.before.color_secondary, colorStyle: diff.before.color_style }} danDegree={danDegreeOf(diff.rank_key)} rankLabel={rankShortLabel(diff.rank_key)} showName={false} size="sm" />
                <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <BeltBadgeView appearance={{ name: diff.after.display_name, colorPrimary: diff.after.color_primary, colorSecondary: diff.after.color_secondary, colorStyle: diff.after.color_style }} danDegree={danDegreeOf(diff.rank_key)} rankLabel={rankShortLabel(diff.rank_key)} showName={false} size="sm" />
              </div>
              {diff.after.form_name !== diff.before.form_name ? (
                <p className="text-muted-foreground">
                  Forma: {diff.after.form_name ?? "sem forma definida"}
                </p>
              ) : null}
              {diff.revise.length > 0 ? <StatusBadge tone="warning">Revise: valor sugerido</StatusBadge> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {current ? <p className="text-sm text-muted-foreground">Este foi o último modelo aplicado.</p> : null}
    </ConsequenceDialog>
  );
}
