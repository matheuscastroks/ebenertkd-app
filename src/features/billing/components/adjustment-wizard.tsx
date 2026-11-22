"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveTuitionAdjustmentAction } from "@/app/actions/tuition-adjustment";
import { DateField } from "@/components/shared/date-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  buildAdjustmentRows,
  checkNotice,
  computeAdjustmentImpact,
  daysBetween,
  defaultEffectiveFrom,
  MIN_NOTICE_DAYS,
  gainAfterDepartures,
  goalCoveragePercent,
  netFeeCents,
  type AdjustmentConfig,
  type AdjustmentMode
} from "@/features/billing/adjustment-rules";
import {
  MESSAGE_TEMPLATES,
  MESSAGE_VARIABLES,
  buildMessageVariables,
  findUnknownVariables,
  getMessageTemplate,
  interpolateMessage,
  isLongForWhatsappLink,
  type MessageTemplateId
} from "@/features/billing/adjustment-message";
import type { AdjustmentCandidate } from "@/features/billing/adjustment-service";
import { centsToInput, parseMoneyInput, parseNumberInput } from "@/features/billing/money-input";
import { requiredFeeCents } from "@/features/billing/planning-rules";
import type { SavedScenario } from "@/features/billing/planning-service";
import { formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";
import { ROUTES } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";

const STEPS = ["Definir o reajuste", "Quem é afetado", "Impacto financeiro", "Mensagem e campanha"] as const;
const MODE_LABELS: Record<AdjustmentMode, string> = {
  percent: "Percentual (%)",
  fixed: "Novo valor fixo (R$)",
  rounded: "Arredondar para valor cheio"
};
const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20";

function signed(cents: number) {
  return `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${formatBrl(Math.abs(cents))}`;
}

export function AdjustmentWizard({
  candidates,
  scenarios,
  today,
  professorName,
  academyName,
  minNoticeDays = MIN_NOTICE_DAYS,
  initialEffectiveFrom
}: {
  candidates: AdjustmentCandidate[];
  scenarios: SavedScenario[];
  today: string;
  professorName: string;
  /** Nome da academia nas mensagens (identidade); sem ele vale o nome padrão. */
  academyName?: string;
  /** Aviso mínimo em dias (política financeira); padrão 30. */
  minNoticeDays?: number;
  /** Permite abrir com outra vigência (testes e atalhos). Padrão: primeiro dia de mês com 30 dias de aviso. */
  initialEffectiveFrom?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<AdjustmentMode>("percent");
  const [percent, setPercent] = useState("5");
  const [fixed, setFixed] = useState("");
  const [roundTo, setRoundTo] = useState("500");
  const [indexLabel, setIndexLabel] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(initialEffectiveFrom ?? defaultEffectiveFrom(today, minNoticeDays));
  const [scenarioId, setScenarioId] = useState("");
  const [calculatorHint, setCalculatorHint] = useState<string | null>(null);

  const [classFilter, setClassFilter] = useState("all");
  const [windowFilter, setWindowFilter] = useState("all");
  const [minFee, setMinFee] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [manualFees, setManualFees] = useState<Record<string, string>>({});

  const [departures, setDepartures] = useState(0);

  const [templateId, setTemplateId] = useState<MessageTemplateId>("cordial");
  const [template, setTemplate] = useState(() => getMessageTemplate("cordial").body);
  const [professor, setProfessor] = useState(professorName);
  const [copied, setCopied] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const config: AdjustmentConfig = {
    mode,
    percent: parseNumberInput(percent),
    fixedCents: parseMoneyInput(fixed),
    roundToCents: Number(roundTo) || 0
  };
  const manualFeeCents = useMemo(
    () => Object.fromEntries(Object.entries(manualFees).map(([id, value]) => [id, parseMoneyInput(value)])),
    [manualFees]
  );
  const rows = useMemo(
    () => buildAdjustmentRows(candidates, config, effectiveFrom, { excluded, manualFeeCents }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidates, mode, percent, fixed, roundTo, effectiveFrom, excluded, manualFeeCents]
  );
  const impact = useMemo(() => computeAdjustmentImpact(rows, today), [rows, today]);
  const notice = checkNotice(today, effectiveFrom, minNoticeDays);

  const classes = useMemo(() => {
    const map = new Map<string, string>();
    for (const candidate of candidates) map.set(candidate.classId ?? "none", candidate.className);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [candidates]);

  const nameById = new Map(candidates.map((item) => [item.enrollmentId, item]));
  const visibleRows = rows.filter((row) => {
    const candidate = nameById.get(row.enrollmentId);
    if (!candidate) return false;
    if (classFilter !== "all" && (candidate.classId ?? "none") !== classFilter) return false;
    const min = parseMoneyInput(minFee);
    const max = parseMoneyInput(maxFee);
    if (min > 0 && row.currentFeeCents < min) return false;
    if (max > 0 && row.currentFeeCents > max) return false;
    if (windowFilter !== "all") {
      if (!row.contractEnd) return false;
      const days = daysBetween(today, row.contractEnd);
      if (days > Number(windowFilter)) return false;
    }
    return true;
  });

  const scenario = scenarios.find((item) => item.id === scenarioId);
  const goalCents = scenario?.proLaboreCents ?? 0;
  const coverage = goalCoveragePercent(impact.monthlyGainCents, goalCents);

  const previewRow = rows.find((row) => !row.excluded) ?? rows[0];
  const previewCandidate = previewRow ? nameById.get(previewRow.enrollmentId) : undefined;
  const previewText = previewRow && previewCandidate
    ? interpolateMessage(
        template,
        buildMessageVariables({
          payerName: previewCandidate.studentName,
          studentName: previewCandidate.studentName,
          previousFeeCents: previewRow.currentFeeCents,
          newFeeCents: previewRow.newFeeCents,
          discountCents: previewRow.discountCents,
          effectiveFrom,
          indexLabel,
          professor,
          academy: academyName
        })
      )
    : "";
  const unknownVariables = findUnknownVariables(template);

  function applyCalculatorValue(id: string) {
    setScenarioId(id);
    const saved = scenarios.find((item) => item.id === id);
    if (!saved || candidates.length === 0) {
      setCalculatorHint(null);
      return;
    }
    const input = {
      fixedCostsCents: saved.fixedCosts.reduce((sum, item) => sum + item.amountCents, 0),
      proLaboreCents: saved.proLaboreCents,
      reserveCents: saved.reserveCents,
      variableCostCents: saved.variableCostCents,
      paymentFeePercent: saved.paymentFeePercent,
      defaultRatePercent: saved.defaultRatePercent
    };
    const required = requiredFeeCents(candidates.length, input);
    const average = Math.round(candidates.reduce((sum, item) => sum + netFeeCents(item.currentFeeCents, item.discountCents), 0) / candidates.length);
    if (!required.ok || average <= 0) {
      setCalculatorHint("Esse cenário não gera uma mensalidade necessária. Revise os números na calculadora.");
      return;
    }
    const neededPercent = Math.max(0, Math.ceil((required.value / average - 1) * 1000) / 10);
    setMode("percent");
    setPercent(String(neededPercent).replace(".", ","));
    setCalculatorHint(`A calculadora indica ${formatBrl(required.value)} por aluno (média atual ${formatBrl(average)}): reajuste de ${String(neededPercent).replace(".", ",")}%.`);
  }

  function toggle(id: string, included: boolean) {
    setExcluded((current) => {
      const next = new Set(current);
      if (included) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible(included: boolean) {
    setExcluded((current) => {
      const next = new Set(current);
      for (const row of visibleRows) {
        if (included) next.delete(row.enrollmentId);
        else next.add(row.enrollmentId);
      }
      return next;
    });
  }

  function chooseTemplate(id: MessageTemplateId) {
    setTemplateId(id);
    setTemplate(getMessageTemplate(id).body);
  }

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function saveCampaign() {
    setError(null);
    startSaving(async () => {
      const result = await saveTuitionAdjustmentAction({
        mode,
        percent: mode === "fixed" ? undefined : config.percent,
        referenceIndexLabel: indexLabel.trim() || undefined,
        effectiveFrom,
        messageTemplate: template,
        items: rows.map((row) => ({ enrollmentId: row.enrollmentId, newFeeCents: row.newFeeCents, excluded: row.excluded }))
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`${ROUTES.adminBillingAdjustment}/${result.id}`);
    });
  }

  const includedCount = rows.filter((row) => !row.excluded).length;
  const canContinue = step === 0 ? (mode === "fixed" ? config.fixedCents > 0 : true) && Boolean(effectiveFrom) : step === 1 ? includedCount > 0 : true;
  const maxDepartureSlider = Math.max(impact.maxDepartures + 5, 10);
  const netAfterDepartures = gainAfterDepartures(impact.monthlyGainCents, impact.averageNewFeeCents, departures);

  if (candidates.length === 0) {
    return (
      <Alert>
        <AlertDescription>Não há alunos com matrícula ativa e mensalidade definida para reajustar.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ol aria-label="Etapas do reajuste" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={cn("rounded-lg border px-3 py-2 text-sm", index === step ? "border-primary bg-primary/5 font-medium text-foreground" : "border-border text-muted-foreground")}
          >
            <span className="tabular-nums">{index + 1}.</span> {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Defina o reajuste</CardTitle>
            <CardDescription>O novo valor vale na próxima renovação de cada contrato. Contratos já assinados não mudam.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Como calcular</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(Object.keys(MODE_LABELS) as AdjustmentMode[]).map((option) => (
                  <label key={option} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm", mode === option ? "border-primary bg-primary/5" : "border-border")}>
                    <input type="radio" name="adjustment-mode" value={option} checked={mode === option} onChange={() => setMode(option)} className="accent-primary" />
                    {MODE_LABELS[option]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-start gap-4">
              {mode !== "fixed" ? (
                <div className="w-full space-y-1.5 sm:w-44">
                  <Label htmlFor="adj-percent">Percentual de reajuste (%)</Label>
                  <Input id="adj-percent" inputMode="decimal" value={percent} onChange={(event) => setPercent(event.target.value)} />
                </div>
              ) : (
                <div className="w-full space-y-1.5 sm:w-52">
                  <Label htmlFor="adj-fixed">Novo valor da mensalidade (R$)</Label>
                  <Input id="adj-fixed" inputMode="decimal" placeholder="0,00" value={fixed} onChange={(event) => setFixed(event.target.value)} />
                </div>
              )}
              {mode === "rounded" ? (
                <div className="w-full space-y-1.5 sm:w-52">
                  <Label htmlFor="adj-round">Arredondar para cima em múltiplos de</Label>
                  <select id="adj-round" className={SELECT_CLASS} value={roundTo} onChange={(event) => setRoundTo(event.target.value)}>
                    <option value="500">R$ 5,00</option>
                    <option value="1000">R$ 10,00</option>
                  </select>
                </div>
              ) : null}
              <div className="min-w-56 flex-1 space-y-1.5">
                <Label htmlFor="adj-index">Índice de referência (opcional)</Label>
                <Input id="adj-index" maxLength={128} placeholder="Ex.: IPCA 12 meses: 4,5%" value={indexLabel} onChange={(event) => setIndexLabel(event.target.value)} />
              </div>
              <DateField
                id="adj-effective"
                name="effective_from"
                label="Vigência (data do aviso)"
                defaultValue={effectiveFrom}
                onValueChange={(value) => value && setEffectiveFrom(value)}
                description={`Padrão: primeiro dia de um mês com pelo menos ${minNoticeDays} dias de aviso.`}
                className="w-full sm:w-64"
              />
            </div>

            {notice.short ? (
              <Alert variant="destructive" data-testid="notice-warning">
                <AlertDescription>{notice.message}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">Aviso com {notice.daysOfNotice} dias de antecedência.</p>
            )}

            {scenarios.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="adj-scenario">Usar o valor da calculadora</Label>
                <select id="adj-scenario" className={SELECT_CLASS} value={scenarioId} onChange={(event) => applyCalculatorValue(event.target.value)}>
                  <option value="">Escolha um cenário salvo…</option>
                  {scenarios.map((saved) => (
                    <option key={saved.id} value={saved.id}>{saved.name}</option>
                  ))}
                </select>
                {calculatorHint ? <p role="status" className="text-xs text-muted-foreground">{calculatorHint}</p> : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Salve um cenário na calculadora de metas para usar o valor calculado aqui.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Quem é afetado</CardTitle>
            <CardDescription>Desmarque bolsistas, irmãos ou acordos especiais, ou digite um valor manual. Descontos em reais são mantidos sobre o novo valor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="filter-class">Turma</Label>
                <select id="filter-class" className={SELECT_CLASS} value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
                  <option value="all">Todas</option>
                  {classes.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-window">Contrato vence em</Label>
                <select id="filter-window" className={SELECT_CLASS} value={windowFilter} onChange={(event) => setWindowFilter(event.target.value)}>
                  <option value="all">Qualquer prazo</option>
                  <option value="30">Até 30 dias</option>
                  <option value="60">Até 60 dias</option>
                  <option value="90">Até 90 dias</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-min">Valor atual de (R$)</Label>
                <Input id="filter-min" inputMode="decimal" value={minFee} onChange={(event) => setMinFee(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-max">Valor atual até (R$)</Label>
                <Input id="filter-max" inputMode="decimal" value={maxFee} onChange={(event) => setMaxFee(event.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground" data-testid="included-count">
                {includedCount} de {rows.length} alunos incluídos · {visibleRows.length} na lista
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => toggleAllVisible(true)}>Marcar todos</Button>
                <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => toggleAllVisible(false)}>Desmarcar todos</Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl bg-card shadow-elevation-1 [box-shadow:var(--shadow-elevation-1),var(--card-highlight)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><span className="sr-only">Incluir</span></TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-right">Atual</TableHead>
                    <TableHead className="text-right">Novo (R$)</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Fim do contrato</TableHead>
                    <TableHead>Cobrado a partir de</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row) => {
                    const candidate = nameById.get(row.enrollmentId);
                    if (!candidate) return null;
                    return (
                      <TableRow key={row.enrollmentId} className={row.excluded ? "opacity-60" : undefined}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Incluir ${candidate.studentName}`}
                            checked={!row.excluded}
                            onCheckedChange={(checked) => toggle(row.enrollmentId, checked === true)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {candidate.studentName}
                          {candidate.discountCents > 0 ? <span className="ml-2 text-xs text-muted-foreground">desconto {formatBrl(candidate.discountCents)}</span> : null}
                        </TableCell>
                        <TableCell>{candidate.className}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBrl(row.currentFeeCents)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            aria-label={`Novo valor de ${candidate.studentName}`}
                            className="ml-auto h-9 w-28 text-right tabular-nums"
                            inputMode="decimal"
                            disabled={row.excluded}
                            value={manualFees[row.enrollmentId] ?? centsToInput(row.newFeeCents)}
                            onChange={(event) => setManualFees((current) => ({ ...current, [row.enrollmentId]: event.target.value }))}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.excluded ? "—" : signed(row.diffCents)}</TableCell>
                        <TableCell className="tabular-nums">{formatBusinessDateBr(row.contractEnd)}</TableCell>
                        <TableCell className="tabular-nums">{row.excluded ? "—" : formatBusinessDateBr(row.appliedFrom)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {visibleRows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum aluno com esses filtros.</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Impacto financeiro</CardTitle>
            <CardDescription>Considera só os alunos incluídos. O ganho entra conforme cada contrato é renovado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <dt className="text-sm font-medium text-muted-foreground">Ganho mensal (todos renovados)</dt>
                <dd data-testid="monthly-gain" className="mt-1 text-2xl font-semibold tabular-nums">{signed(impact.monthlyGainCents)}</dd>
                <p className="text-xs text-muted-foreground">{impact.affectedCount} alunos</p>
              </div>
              <div className="p-4">
                <dt className="text-sm font-medium text-muted-foreground">Ganho anual em regime</dt>
                <dd data-testid="annual-gain" className="mt-1 text-2xl font-semibold tabular-nums">{signed(impact.annualGainCents)}</dd>
                <p className="text-xs text-muted-foreground">Próximos 12 meses: {signed(impact.firstYearGainCents)}</p>
              </div>
              <div className="p-4">
                <dt className="text-sm font-medium text-muted-foreground">Meta de pró-labore</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{coverage !== null ? `${coverage}%` : "—"}</dd>
                <p className="text-xs text-muted-foreground">{coverage !== null ? "da meta coberta pelo reajuste" : "Escolha um cenário da calculadora na etapa 1"}</p>
              </div>
            </dl>

            <div className="overflow-x-auto rounded-xl bg-card shadow-elevation-1 [box-shadow:var(--shadow-elevation-1),var(--card-highlight)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Renovados</TableHead>
                    <TableHead className="text-right">Ganho no mês</TableHead>
                    <TableHead className="w-1/3"><span className="sr-only">Proporção do ganho</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {impact.curve.map((point) => (
                    <TableRow key={point.month}>
                      <TableCell className="tabular-nums">{point.month.slice(5)}/{point.month.slice(0, 4)}</TableCell>
                      <TableCell className="text-right tabular-nums">{point.renewedCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBrl(point.gainCents)}</TableCell>
                      <TableCell>
                        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div className="h-full rounded-full bg-success" style={{ width: `${impact.monthlyGainCents > 0 ? Math.min(100, Math.round((point.gainCents / impact.monthlyGainCents) * 100)) : 0}%` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 rounded-xl border border-border p-4">
              <Label htmlFor="departures">E se alguns alunos saírem por causa do aumento? {departures}</Label>
              <input id="departures" type="range" min={0} max={maxDepartureSlider} step={1} value={departures} onChange={(event) => setDepartures(Number(event.target.value))} className="w-full accent-primary" />
              <p className="text-sm text-muted-foreground" data-testid="departures-reading">
                O reajuste ainda compensa com até <span className="font-medium text-foreground">{impact.maxDepartures}</span> saída{impact.maxDepartures === 1 ? "" : "s"}.
                {" "}Com {departures} saída{departures === 1 ? "" : "s"}, o resultado mensal fica em{" "}
                <span className={cn("font-medium tabular-nums", netAfterDepartures < 0 ? "text-destructive" : "text-foreground")}>{signed(netAfterDepartures)}</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Mensagem e campanha</CardTitle>
            <CardDescription>Escolha um modelo, ajuste o texto e salve. A lista de envio mostra uma mensagem pronta para cada pagador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Modelo</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MESSAGE_TEMPLATES.map((item) => (
                  <label key={item.id} className={cn("flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm", templateId === item.id ? "border-primary bg-primary/5" : "border-border")}>
                    <input type="radio" name="message-template" value={item.id} checked={templateId === item.id} onChange={() => chooseTemplate(item.id)} className="mt-1 accent-primary" />
                    <span>
                      <span className="block font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="message-text">Texto da mensagem</Label>
                <Textarea id="message-text" rows={12} value={template} onChange={(event) => setTemplate(event.target.value)} />
                <p className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span data-testid="char-count">{template.length} caracteres</span>
                  <span>Variáveis: {MESSAGE_VARIABLES.map((name) => `{${name}}`).join(" ")}</span>
                </p>
                {unknownVariables.length > 0 ? (
                  <p role="alert" className="text-xs text-destructive">
                    Variável não reconhecida: {unknownVariables.map((name) => `{${name}}`).join(", ")}. Ela aparecerá como está na mensagem.
                  </p>
                ) : null}
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="message-professor">Seu nome na assinatura</Label>
                  <Input id="message-professor" maxLength={80} value={professor} onChange={(event) => setProfessor(event.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Pré-visualização{previewCandidate ? ` (aluno: ${previewCandidate.studentName})` : ""}</p>
                <div data-testid="message-preview" className="min-h-48 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed">
                  {previewText}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={copyPreview}>
                    {copied ? "Mensagem copiada" : "Copiar mensagem"}
                  </Button>
                  {isLongForWhatsappLink(previewText) ? <StatusBadge tone="warning">Longa para o link do WhatsApp</StatusBadge> : null}
                </div>
                <p className="text-xs text-muted-foreground">Na lista de envio, {"{nome}"} será o pagador: o responsável quando o aluno for menor.</p>
              </div>
            </div>

            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" className="min-h-11" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(0, current - 1))}>
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" className="min-h-11" disabled={!canContinue} onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}>
            Continuar
          </Button>
        ) : (
          <Button type="button" className="min-h-11" disabled={saving || includedCount === 0 || template.trim().length < 20} onClick={saveCampaign}>
            {saving ? "Salvando…" : "Salvar campanha"}
          </Button>
        )}
      </div>
    </div>
  );
}
