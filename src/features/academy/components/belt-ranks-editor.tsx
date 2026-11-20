"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { previewRankImpactAction, saveBeltRanksAction } from "@/app/actions/academy-settings";
import { useBeltLabels } from "@/components/academy-config-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BELT_COLOR_STYLE_LABELS, BELT_COLOR_STYLES, type BeltColorStyle } from "@/features/academy/belt-colors";
import type { RankConfig } from "@/features/academy/belt-rules";
import { BeltColorField } from "@/features/academy/components/belt-color-field";
import { ConfigField } from "@/features/academy/components/config-field";
import type { EligibilityImpact } from "@/features/academy/impact-rules";
import { eligibilityImpactText } from "@/features/academy/impact-notes";
import { buildRankPatches, patchesAffectEligibility, toRankDraft, type RankDraft } from "@/features/academy/rank-form";
import { rankShortLabel, type RankKind } from "@/features/academy/ranks";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { BeltBadgeView } from "@/features/students/components/belt-badge";
import { cn } from "@/lib/utils";

const GROUPS: Array<{ kind: RankKind; title: string; description: string }> = [
  { kind: "gub", title: "Gubs (faixas coloridas)", description: "Do 10º ao 1º gub. O tempo e as presenças valem para sair da graduação." },
  { kind: "poom", title: "Poom", description: "Faixa preta de menores. Desativada por padrão: habilite se a academia usa Poom." },
  { kind: "dan", title: "Dan (faixa preta)", description: "Dan 1 a 3 vêm habilitados. Sem tempo configurado, a faixa preta não entra na elegibilidade automática." }
];

type ImpactState = { state: "idle" } | { state: "loading" } | { state: "done"; impact: EligibilityImpact } | { state: "error" };

function requirementSummary(draft: RankDraft) {
  const parts: string[] = [];
  if (draft.min_days.trim()) parts.push(`${draft.min_days} dias`);
  if (draft.min_presences.trim()) parts.push(`${draft.min_presences} aulas`);
  return parts.join(" · ");
}

function describeChanges(draft: RankDraft, original: RankDraft) {
  const labels: string[] = [];
  if (draft.display_name !== original.display_name) labels.push("nome");
  if (draft.color_primary !== original.color_primary || draft.color_secondary !== original.color_secondary || draft.color_style !== original.color_style) labels.push("cor");
  if (draft.form_name !== original.form_name) labels.push("forma");
  if (draft.min_days !== original.min_days || draft.min_presences !== original.min_presences || draft.min_age_years !== original.min_age_years) labels.push("requisitos");
  if (draft.exam_fee !== original.exam_fee) labels.push("taxa");
  if (draft.aliases !== original.aliases) labels.push("apelidos");
  if (draft.enabled !== original.enabled) labels.push(draft.enabled ? "habilitada" : "desativada");
  return labels.join(", ") || "alterada";
}

/**
 * Tabela de graduações: uma linha por graduação do catálogo (10º gub a Dan), cada uma com nome, cores, estilo, forma,
 * tempo e presenças mínimos, idade, taxa e habilitação. Em telas pequenas cada linha vira um cartão que abre sozinho.
 */
export function BeltRanksEditor({ ranks, studentsPerRank }: { ranks: RankConfig[]; studentsPerRank: Record<string, number> }) {
  const router = useRouter();
  const { formLabel, levelLabel } = useBeltLabels();
  const reasonId = useId();
  const originals = useMemo(() => Object.fromEntries(ranks.map((rank) => [rank.rank_key, toRankDraft(rank)])) as Record<string, RankDraft>, [ranks]);
  const [drafts, setDrafts] = useState<Record<string, RankDraft>>(originals);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [impactResult, setImpact] = useState<ImpactState & { signature?: string }>({ state: "idle" });
  const [openItems, setOpenItems] = useState<string[]>([]);

  const patches = useMemo(() => buildRankPatches(ranks, drafts), [ranks, drafts]);
  const affectsEligibility = useMemo(() => patchesAffectEligibility(patches, ranks), [patches, ranks]);
  // O impacto calculado só vale para as alterações exatas em que foi pedido.
  const signature = JSON.stringify(patches);
  const impact: ImpactState = impactResult.signature === signature ? impactResult : { state: "idle" };

  const update = (key: string, patch: Partial<RankDraft>) => setDrafts((current) => ({ ...current, [key]: { ...current[key], ...patch } }));

  const requestImpact = async () => {
    if (!affectsEligibility) return;
    setImpact({ state: "loading", signature });
    let result: Awaited<ReturnType<typeof previewRankImpactAction>>;
    try {
      result = await previewRankImpactAction(patches);
    } catch {
      result = { ok: false };
    }
    setImpact(result.ok ? { state: "done", impact: result.impact, signature } : { state: "error", signature });
  };

  const impactLine =
    impact.state === "loading"
      ? "Calculando o impacto na elegibilidade para exame…"
      : impact.state === "done"
        ? eligibilityImpactText(impact.impact)
        : impact.state === "error"
          ? "Não foi possível calcular o impacto na elegibilidade agora."
          : "";
  const effect = [
    impactLine,
    "Alunos, presenças e o histórico de faixas não mudam: renomear ou recolorir altera só como a graduação aparece daqui em diante."
  ]
    .filter(Boolean)
    .join(" ");

  const save = async (formData: FormData) => {
    const reason = String(formData.get("reason") ?? "");
    let result: Awaited<ReturnType<typeof saveBeltRanksAction>>;
    try {
      result = await saveBeltRanksAction(patches, reason);
    } catch {
      result = { ok: false, error: "failed" };
    }
    if (result.ok) {
      setErrors({});
      toast.success(result.changed > 0 ? "Graduações atualizadas" : "Nada a salvar");
      router.refresh();
      return;
    }
    if (result.error === "revision_conflict") {
      toast.error("Não foi possível salvar", { description: "Outra alteração foi salva antes da sua. Recarregue a página para ver os valores atuais." });
    } else if (result.error === "rank_in_use") {
      const inUse = result.inUse ?? [];
      setErrors(Object.fromEntries(inUse.map((key) => [`${key}.enabled`, "Há alunos nesta graduação. Mude a graduação deles antes de desativar."])));
      setOpenItems((current) => [...new Set([...current, ...inUse])]);
      toast.error("Graduação com alunos não pode ser desativada", { description: "Mude a graduação dos alunos antes de desativá-la." });
    } else if (result.error === "invalid") {
      const fields = result.fields ?? {};
      setErrors(fields);
      setOpenItems((current) => [...new Set([...current, ...Object.keys(fields).map((key) => key.split(".")[0])])]);
      toast.error("Confira os campos", { description: Object.values(fields)[0] ?? "Há valores inválidos." });
    } else {
      toast.error("Não foi possível salvar", { description: "Tente novamente em instantes." });
    }
  };

  const summary = patches.slice(0, 6).map((patch) => {
    const key = patch.rank_key;
    return { label: rankShortLabel(key as RankConfig["rank_key"], levelLabel), value: describeChanges(drafts[key], originals[key]) };
  });
  if (patches.length > 6) summary.push({ label: "Outras", value: `${patches.length - 6} graduações` });

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <section key={group.kind} aria-labelledby={`group-${group.kind}`} className="space-y-3">
          <div>
            <h2 id={`group-${group.kind}`} className="text-base font-semibold text-foreground">
              {group.title}
            </h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
          <Accordion
            type="multiple"
            value={openItems}
            onValueChange={setOpenItems}
            className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs"
          >
            {ranks
              .filter((rank) => rank.kind === group.kind)
              .map((rank) => (
                <RankRow
                  key={rank.rank_key}
                  rank={rank}
                  draft={drafts[rank.rank_key]}
                  original={originals[rank.rank_key]}
                  students={studentsPerRank[rank.rank_key] ?? 0}
                  levelLabel={levelLabel}
                  formLabel={formLabel}
                  errors={errors}
                  onChange={(patch) => update(rank.rank_key, patch)}
                />
              ))}
          </Accordion>
        </section>
      ))}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <p role="status" className="text-sm text-muted-foreground">
          {patches.length === 0 ? "Nenhuma alteração pendente." : `${patches.length} graduaç${patches.length === 1 ? "ão alterada" : "ões alteradas"}, ainda não salva${patches.length === 1 ? "" : "s"}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={patches.length === 0} onClick={() => setDrafts(originals)}>
            Descartar alterações
          </Button>
          <ConsequenceDialog
            trigger={
              <Button type="button" className="min-h-11" disabled={patches.length === 0} onClick={requestImpact}>
                Salvar graduações
              </Button>
            }
            title="Salvar graduações?"
            effect={effect}
            summary={summary}
            confirmLabel="Salvar"
            action={save}
          >
            <div className="space-y-1.5">
              <Label htmlFor={reasonId}>Motivo (opcional)</Label>
              <Input id={reasonId} name="reason" maxLength={500} placeholder="Ex.: ajuste do tempo mínimo para o próximo exame" />
            </div>
          </ConsequenceDialog>
        </div>
      </div>
    </div>
  );
}

function RankRow({
  rank,
  draft,
  original,
  students,
  levelLabel,
  formLabel,
  errors,
  onChange
}: {
  rank: RankConfig;
  draft: RankDraft;
  original: RankDraft;
  students: number;
  levelLabel: string;
  formLabel: string;
  errors: Record<string, string>;
  onChange: (patch: Partial<RankDraft>) => void;
}) {
  const key = rank.rank_key;
  const error = (field: string) => errors[`${key}.${field}`];
  const changed = JSON.stringify(draft) !== JSON.stringify(original);
  const hasStyleSecondary = draft.color_style !== "solid";
  const requirement = requirementSummary(draft);
  const cannotDisable = draft.enabled && students > 0;

  return (
    <AccordionItem value={key} className="border-0 px-3 sm:px-4">
      <AccordionTrigger className="min-h-14 items-center gap-3 py-3 hover:no-underline">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          <BeltBadgeView
            appearance={{ name: draft.display_name || "Sem nome", colorPrimary: draft.color_primary, colorSecondary: draft.color_secondary, colorStyle: draft.color_style }}
            rankLabel={rankShortLabel(key, levelLabel)}
            size="md"
          />
          {requirement ? <span className="text-sm font-normal text-muted-foreground tabular-nums">{requirement}</span> : null}
          {!draft.enabled ? <StatusBadge tone="neutral">Desativada</StatusBadge> : null}
          {changed ? <StatusBadge tone="info">Alterada</StatusBadge> : null}
          {Object.keys(errors).some((name) => name.startsWith(`${key}.`)) ? <StatusBadge tone="danger">Corrigir</StatusBadge> : null}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-5 pb-3 pt-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ConfigField id={`${key}-name`} label="Nome na academia" error={error("display_name")} help="Como esta graduação aparece para alunos e responsáveis. Ex.: Ponta Amarela, Laranja, Amarela listra Branca.">
              <Input id={`${key}-name`} value={draft.display_name} maxLength={64} onChange={(event) => onChange({ display_name: event.target.value })} className="h-11" />
            </ConfigField>
            <ConfigField id={`${key}-aliases`} label="Nomes alternativos" error={error("aliases")} help="Outros nomes usados para este mesmo nível. Separe por vírgula. Servem para reconhecer o nível em buscas.">
              <Input id={`${key}-aliases`} value={draft.aliases} onChange={(event) => onChange({ aliases: event.target.value })} placeholder="Ex.: Branca ponta amarela, Yellow tip" className="h-11" />
            </ConfigField>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
            <BeltColorField id={`${key}-color-primary`} label={hasStyleSecondary ? "Cor da faixa" : "Cor"} value={draft.color_primary} onChange={(hex) => onChange({ color_primary: hex })} error={error("color_primary")} />
            {hasStyleSecondary ? (
              <BeltColorField
                id={`${key}-color-secondary`}
                label={draft.color_style === "tip" ? "Cor da ponta" : draft.color_style === "stripe" ? "Cor da listra" : "Cor da outra metade"}
                value={draft.color_secondary}
                onChange={(hex) => onChange({ color_secondary: hex })}
                error={error("color_secondary")}
              />
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ConfigField id={`${key}-style`} label="Estilo da faixa" error={error("color_style")}>
              <Select value={draft.color_style} onValueChange={(value) => onChange({ color_style: value as BeltColorStyle })}>
                <SelectTrigger id={`${key}-style`} className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BELT_COLOR_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {BELT_COLOR_STYLE_LABELS[style]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Prévia</span>
              <div>
                <BeltBadgeView
                  appearance={{ name: draft.display_name || "Sem nome", colorPrimary: draft.color_primary, colorSecondary: draft.color_secondary, colorStyle: draft.color_style }}
                  rankLabel={rankShortLabel(key, levelLabel)}
                  size="lg"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ConfigField id={`${key}-form`} label={`${formLabel} exigido`} error={error("form_name")} className="sm:col-span-2 lg:col-span-4">
              <Input id={`${key}-form`} value={draft.form_name} maxLength={96} onChange={(event) => onChange({ form_name: event.target.value })} className="h-11" />
            </ConfigField>
            <ConfigField id={`${key}-days`} label="Tempo mínimo (dias)" error={error("min_days")} help="Dias nesta graduação antes de poder prestar exame para a próxima. Vazio usa o padrão da política de exames.">
              <Input id={`${key}-days`} inputMode="numeric" value={draft.min_days} onChange={(event) => onChange({ min_days: event.target.value })} className="h-11 tabular-nums" />
            </ConfigField>
            <ConfigField id={`${key}-presences`} label="Presenças mínimas" error={error("min_presences")} help="Aulas com presença desde que o aluno recebeu esta graduação. Vazio usa o padrão da política de exames.">
              <Input id={`${key}-presences`} inputMode="numeric" value={draft.min_presences} onChange={(event) => onChange({ min_presences: event.target.value })} className="h-11 tabular-nums" />
            </ConfigField>
            <ConfigField id={`${key}-age`} label="Idade mínima (anos)" error={error("min_age_years")} help="Idade mínima para prestar exame PARA esta graduação (por exemplo, para o 1º Dan). Vazio não exige idade.">
              <Input id={`${key}-age`} inputMode="numeric" value={draft.min_age_years} onChange={(event) => onChange({ min_age_years: event.target.value })} className="h-11 tabular-nums" />
            </ConfigField>
            <ConfigField id={`${key}-fee`} label="Taxa do exame" error={error("exam_fee_cents")} help="Taxa para quem presta exame PARA esta graduação. Vazio usa a taxa da banca.">
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>R$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput id={`${key}-fee`} inputMode="decimal" value={draft.exam_fee} onChange={(event) => onChange({ exam_fee: event.target.value })} />
              </InputGroup>
            </ConfigField>
          </div>

          <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-border p-3", error("enabled") && "border-destructive")}>
            <Switch id={`${key}-enabled`} checked={draft.enabled} disabled={cannotDisable} onCheckedChange={(checked) => onChange({ enabled: checked })} aria-describedby={`${key}-enabled-help`} />
            <Label htmlFor={`${key}-enabled`}>Usar esta graduação na academia</Label>
            <p id={`${key}-enabled-help`} className={cn("basis-full text-sm", error("enabled") ? "text-destructive" : "text-muted-foreground")}>
              {error("enabled") ??
                (cannotDisable
                  ? `${students} aluno${students === 1 ? "" : "s"} nesta graduação: mude a graduação deles para poder desativar.`
                  : draft.enabled
                    ? "Aparece nos cadastros, filtros e inscrições de exame."
                    : "Não aparece nos cadastros nem nas inscrições. Reative quando a academia passar a usar.")}
            </p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
