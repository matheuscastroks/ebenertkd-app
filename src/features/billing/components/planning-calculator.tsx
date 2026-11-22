"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { deleteFinanceScenarioAction, saveFinanceScenarioAction } from "@/app/actions/tuition-adjustment";
import { InfoTip } from "@/components/shared/info-tip";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Eraser, Info, Plus, RotateCcw, Save, Trash2, X } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DefaultFeeShortcut, type DefaultFeeState } from "@/features/billing/components/default-fee-shortcut";
import { PlanningChart } from "@/features/billing/components/planning-chart";
import { centsToInput, parseIntegerInput, parseMoneyInput, parseNumberInput } from "@/features/billing/money-input";
import type { PlanningBaseline } from "@/features/billing/planning-baseline";
import {
  PLANNING_FAILURE_MESSAGES,
  applyWhatIf,
  breakEvenStudents,
  buildPlanningReading,
  evaluateScenario,
  requiredFeeCents,
  requiredStudents,
  type PlanningInput
} from "@/features/billing/planning-rules";
import type { SavedScenario } from "@/features/billing/planning-service";
import { formatBrl } from "@/lib/money";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "ebenertkd:calculadora-mensalidade:v1";
const SUGGESTED_COSTS = ["Aluguel", "Energia e água", "Internet e aplicativo", "Contador", "Seguro", "Instrutor auxiliar", "Outros"];

type CostRow = { id: number; label: string; amount: string };
type ExtraCost = { id: number; label: string; monthlyCents: number };

type Draft = {
  costs: Array<{ label: string; amount: string }>;
  proLabore: string;
  reserve: string;
  variable: string;
  paymentFee: string;
};

let costCounter = 0;
const newId = () => ++costCounter;

const subscribeNone = () => () => {};
function readRawDraft() {
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseDraft(raw: string | null): Draft | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed || !Array.isArray(parsed.costs)) return null;
    return {
      costs: parsed.costs.filter((item) => typeof item?.label === "string" && typeof item?.amount === "string").slice(0, 20),
      proLabore: String(parsed.proLabore ?? ""),
      reserve: String(parsed.reserve ?? ""),
      variable: String(parsed.variable ?? ""),
      paymentFee: String(parsed.paymentFee ?? "0")
    };
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Rascunho é só conveniência: sem armazenamento, a calculadora segue funcionando.
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Sem armazenamento disponível: nada a limpar.
  }
}

function signed(cents: number) {
  return `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${formatBrl(Math.abs(cents))}`;
}

function ResultCard({
  label,
  value,
  helper,
  tone,
  testId,
  help
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "danger" | "success";
  testId?: string;
  help?: ReactNode;
}) {
  return (
    <div className="t-text-reveal p-4 sm:px-5">
      <dt className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
        {label}
        {help ? <InfoTip label={`Sobre ${label.toLowerCase()}`}>{help}</InfoTip> : null}
      </dt>
      <dd
        data-testid={testId}
        className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground", tone === "danger" && "text-destructive", tone === "success" && "text-success-foreground")}
      >
        {value}
      </dd>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

/** Rótulo com ícone de ajuda: o texto explicativo sai da tela e vai para o tooltip. */
function FieldHeading({ htmlFor, label, help }: { htmlFor: string; label: string; help?: ReactNode }) {
  return (
    <div className="flex min-h-5 items-center gap-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {help ? <InfoTip label={`Ajuda: ${label}`}>{help}</InfoTip> : null}
    </div>
  );
}

/** Campo numérico com prefixo (R$) ou sufixo (%, alunos) dentro do próprio input. */
function AffixInput({
  id,
  value,
  onChange,
  prefix,
  suffix,
  inputMode = "decimal",
  placeholder = "0,00",
  ariaLabel
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <InputGroup>
      {prefix ? (
        <InputGroupAddon>
          <InputGroupText>{prefix}</InputGroupText>
        </InputGroupAddon>
      ) : null}
      <InputGroupInput id={id} aria-label={ariaLabel} inputMode={inputMode} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      {suffix ? (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{suffix}</InputGroupText>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

/** Mostra o valor real da academia só quando o campo foi editado, com atalho para restaurar. */
function RealValueReset({ show, text, onReset }: { show: boolean; text: string; onReset: () => void }) {
  if (!show) return null;
  return (
    <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
      <RotateCcw className="size-3" aria-hidden="true" />
      <span>{text}</span>
    </button>
  );
}

function SectionTitle({ children, help, action }: { children: ReactNode; help?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <h3 className="text-sm font-semibold text-foreground">{children}</h3>
        {help ? <InfoTip label={`Ajuda: ${String(children)}`}>{help}</InfoTip> : null}
      </div>
      {action}
    </div>
  );
}

/**
 * O rascunho vem do navegador, que o servidor não enxerga: o snapshot do servidor é "sem rascunho" e,
 * ao hidratar, o corpo é remontado já com o rascunho (sem setState em efeito).
 */
export function PlanningCalculator(props: { baseline: PlanningBaseline; scenarios: SavedScenario[]; defaultFee?: DefaultFeeState }) {
  const raw = useSyncExternalStore(subscribeNone, readRawDraft, () => null);
  const hydrated = raw !== null;
  const draft = useMemo(() => parseDraft(raw), [raw]);
  return <CalculatorBody key={hydrated ? "client" : "server"} {...props} initialDraft={draft} persist={hydrated} />;
}

function CalculatorBody({
  baseline,
  scenarios: initialScenarios,
  initialDraft,
  persist,
  defaultFee
}: {
  baseline: PlanningBaseline;
  scenarios: SavedScenario[];
  initialDraft: Draft | null;
  persist: boolean;
  defaultFee?: DefaultFeeState;
}) {
  const [costs, setCosts] = useState<CostRow[]>(() =>
    (initialDraft && initialDraft.costs.length > 0 ? initialDraft.costs.map((item) => item.label) : SUGGESTED_COSTS).map((label, index) => ({
      id: newId(),
      label,
      amount: initialDraft && initialDraft.costs.length > 0 ? initialDraft.costs[index].amount : ""
    }))
  );
  const [proLabore, setProLabore] = useState(initialDraft?.proLabore ?? "");
  const [reserve, setReserve] = useState(initialDraft?.reserve ?? "");
  const [variable, setVariable] = useState(initialDraft?.variable ?? "");
  const [paymentFee, setPaymentFee] = useState(initialDraft?.paymentFee ?? "0");
  const [defaultRate, setDefaultRate] = useState(baseline.defaultRatePercent !== null ? String(baseline.defaultRatePercent).replace(".", ",") : "0");
  const [students, setStudents] = useState(String(baseline.activeStudents));
  const [fee, setFee] = useState(centsToInput(baseline.averageFeeCents));

  const [studentsDelta, setStudentsDelta] = useState(0);
  const [feeDeltaPercent, setFeeDeltaPercent] = useState(0);
  const [extras, setExtras] = useState<ExtraCost[]>([]);
  const [instructorCost, setInstructorCost] = useState("");
  const [newRent, setNewRent] = useState("");
  const [equipmentCost, setEquipmentCost] = useState("");
  const [equipmentMonths, setEquipmentMonths] = useState("12");

  const [scenarios, setScenarios] = useState(initialScenarios);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioMessage, setScenarioMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!persist) return;
    writeDraft({ costs: costs.map(({ label, amount }) => ({ label, amount })), proLabore, reserve, variable, paymentFee });
  }, [persist, costs, proLabore, reserve, variable, paymentFee]);

  const fixedCostsCents = costs.reduce((sum, row) => sum + parseMoneyInput(row.amount), 0);
  const input: PlanningInput = useMemo(
    () => ({
      fixedCostsCents,
      proLaboreCents: parseMoneyInput(proLabore),
      reserveCents: parseMoneyInput(reserve),
      variableCostCents: parseMoneyInput(variable),
      paymentFeePercent: parseNumberInput(paymentFee),
      defaultRatePercent: parseNumberInput(defaultRate)
    }),
    [fixedCostsCents, proLabore, reserve, variable, paymentFee, defaultRate]
  );
  const studentCount = parseIntegerInput(students);
  const feeCents = parseMoneyInput(fee);

  const scenario = evaluateScenario(studentCount, feeCents, input);
  const breakEven = breakEvenStudents(feeCents, input);
  const needed = requiredStudents(feeCents, input);
  const requiredFee = requiredFeeCents(studentCount, input);
  const reading = buildPlanningReading(studentCount, feeCents, input);

  const extraMonthlyCents = extras.reduce((sum, item) => sum + item.monthlyCents, 0);
  const whatIf = applyWhatIf(studentCount, feeCents, studentsDelta, feeDeltaPercent);
  const whatIfInput: PlanningInput = { ...input, fixedCostsCents: Math.max(0, input.fixedCostsCents + extraMonthlyCents) };
  const whatIfScenario = evaluateScenario(whatIf.students, whatIf.feeCents, whatIfInput);
  const whatIfBreakEven = breakEvenStudents(whatIf.feeCents, whatIfInput);
  const belowBreakEven = !whatIfScenario.coversFixedCosts;

  const rentRow = costs.find((row) => /aluguel/i.test(row.label));
  const edited = (value: string, real: string) => value.trim() !== "" && value.trim() !== real;

  function setCost(id: number, patch: Partial<CostRow>) {
    setCosts((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addExtra(label: string, monthlyCents: number) {
    setExtras((current) => [...current, { id: newId(), label, monthlyCents }]);
  }

  function resetDraft() {
    clearDraft();
    setCosts(SUGGESTED_COSTS.map((label) => ({ id: newId(), label, amount: "" })));
    setProLabore("");
    setReserve("");
    setVariable("");
    setPaymentFee("0");
  }

  function saveScenario() {
    setScenarioMessage(null);
    startSaving(async () => {
      const result = await saveFinanceScenarioAction({
        name: scenarioName,
        fixedCosts: costs.filter((row) => row.label.trim() && parseMoneyInput(row.amount) > 0).map((row) => ({ label: row.label.trim(), amountCents: parseMoneyInput(row.amount) })),
        variableCostCents: input.variableCostCents,
        paymentFeePercent: Math.min(100, Math.max(0, input.paymentFeePercent)),
        proLaboreCents: input.proLaboreCents,
        reserveCents: input.reserveCents,
        defaultRatePercent: Math.min(100, Math.max(0, input.defaultRatePercent))
      });
      if (!result.ok) {
        setScenarioMessage({ tone: "error", text: result.error });
        return;
      }
      setScenarios((current) => [result.scenario, ...current.filter((item) => item.id !== result.scenario.id)]);
      setScenarioName("");
      setScenarioMessage({ tone: "success", text: "Cenário salvo." });
    });
  }

  function loadScenario(saved: SavedScenario) {
    setCosts(saved.fixedCosts.length > 0 ? saved.fixedCosts.map((item) => ({ id: newId(), label: item.label, amount: centsToInput(item.amountCents) })) : SUGGESTED_COSTS.map((label) => ({ id: newId(), label, amount: "" })));
    setProLabore(centsToInput(saved.proLaboreCents));
    setReserve(centsToInput(saved.reserveCents));
    setVariable(centsToInput(saved.variableCostCents));
    setPaymentFee(String(saved.paymentFeePercent).replace(".", ","));
    setDefaultRate(String(saved.defaultRatePercent).replace(".", ","));
    setScenarioMessage({ tone: "success", text: `Cenário “${saved.name}” carregado.` });
  }

  function removeScenario(id: string) {
    startSaving(async () => {
      const result = await deleteFinanceScenarioAction(id);
      if (!result.ok) {
        setScenarioMessage({ tone: "error", text: result.error });
        return;
      }
      setScenarios((current) => current.filter((item) => item.id !== id));
    });
  }

  const marginTone = scenario.coversGoal ? "success" : "danger";
  const realFee = centsToInput(baseline.averageFeeCents);
  const realDefault = baseline.defaultRatePercent !== null ? String(baseline.defaultRatePercent).replace(".", ",") : "0";
  const advancedSummary = `Custo por aluno ${formatBrl(input.variableCostCents)} · taxa ${String(input.paymentFeePercent).replace(".", ",")}%`;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <section aria-label="Resumo do planejamento" className="overflow-hidden rounded-xl bg-card shadow-xs">
          <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <ResultCard
              label="Ponto de equilíbrio"
              testId="break-even"
              value={breakEven.ok ? `${breakEven.value} aluno${breakEven.value === 1 ? "" : "s"}` : "—"}
              helper={breakEven.ok ? undefined : PLANNING_FAILURE_MESSAGES[breakEven.reason]}
              help="Quantos alunos pagantes você precisa só para pagar os custos fixos, sem pró-labore nem reserva."
            />
            <ResultCard
              label="Alunos pagantes"
              testId="current-students"
              value={String(studentCount)}
              help={`${baseline.activeStudents} ativos hoje${baseline.awaitingRenewalStudents ? ` e ${baseline.awaitingRenewalStudents} aguardando renovação` : ""}.`}
            />
            <ResultCard
              label={scenario.monthlyMarginCents >= 0 ? "Folga do mês" : "Déficit do mês"}
              testId="monthly-margin"
              tone={marginTone}
              value={formatBrl(scenario.monthlyMarginCents)}
              helper={`${signed(scenario.yearlyMarginCents)} no ano`}
              help="O que sobra (ou falta) depois de pagar custos fixos, pró-labore e reserva, já descontando inadimplência e taxas."
            />
          </dl>
          <div className="flex gap-2 border-t border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground sm:px-5">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p data-testid="reading" className="min-w-0">{reading}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-5">
            <CardHeader>
              <div className="flex items-center gap-1">
                <CardTitle>Seus números</CardTitle>
                <InfoTip label="Sobre seus números">
                  Os valores reais da academia já vêm preenchidos. Altere à vontade: nada aqui muda cobranças ou contratos. Os custos ficam guardados só neste navegador, como rascunho.
                </InfoTip>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <SectionTitle>A academia hoje</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <FieldHeading htmlFor="calc-students" label="Alunos pagantes" help="Alunos que pagam mensalidade. Vem preenchido com os alunos ativos." />
                    <AffixInput id="calc-students" ariaLabel="Alunos que pagam mensalidade" inputMode="numeric" placeholder="0" value={students} onChange={setStudents} />
                    <RealValueReset show={edited(students, String(baseline.activeStudents))} text={`Valor real: ${baseline.activeStudents}`} onReset={() => setStudents(String(baseline.activeStudents))} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldHeading
                      htmlFor="calc-fee"
                      label="Mensalidade média"
                      help={
                        <span className="block space-y-1">
                          <span className="block">Média dos contratos vigentes.</span>
                          {baseline.feeDistribution.length > 1 ? (
                            <span className="block">
                              <span className="block">Nem todos pagam igual:</span>
                              {baseline.feeDistribution.map((item) => (
                                <span key={item.feeCents} className="block tabular-nums">
                                  {item.count} × {formatBrl(item.feeCents)}
                                </span>
                              ))}
                              {baseline.feeDistributionOtherCount > 0 ? <span className="block">Outros valores: {baseline.feeDistributionOtherCount}</span> : null}
                            </span>
                          ) : null}
                        </span>
                      }
                    />
                    <AffixInput id="calc-fee" prefix="R$" value={fee} onChange={setFee} />
                    <RealValueReset show={edited(fee, realFee)} text={`Valor real: ${formatBrl(baseline.averageFeeCents)}`} onReset={() => setFee(realFee)} />
                    {defaultFee ? <DefaultFeeShortcut initial={defaultFee} candidateCents={parseMoneyInput(fee)} /> : null}
                  </div>
                  <div className="space-y-1.5">
                    <FieldHeading
                      htmlFor="calc-default"
                      label="Inadimplência esperada"
                      help={
                        baseline.defaultRatePercent === null
                          ? "Parte das mensalidades que não entra no caixa. Ainda não há fechamentos para calcular a média."
                          : `Parte das mensalidades que não entra no caixa. Média dos últimos ${baseline.monthsConsidered} fechamentos.`
                      }
                    />
                    <AffixInput id="calc-default" suffix="%" placeholder="0" value={defaultRate} onChange={setDefaultRate} />
                    <RealValueReset show={edited(defaultRate, realDefault)} text={`Valor real: ${realDefault}%`} onReset={() => setDefaultRate(realDefault)} />
                  </div>
                </div>
              </div>

              <Separator />

              <fieldset className="space-y-3">
                <legend className="sr-only">Custos fixos mensais</legend>
                <SectionTitle help="Contas que você paga todo mês, tenha muitos ou poucos alunos. Renomeie, remova ou adicione as que fizerem sentido.">Custos fixos mensais</SectionTitle>
                <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {costs.map((row, index) => (
                    <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,8.5rem)_auto] items-center gap-2">
                      <Input
                        aria-label={`Nome do custo ${index + 1}`}
                        placeholder="Nome do custo"
                        maxLength={48}
                        value={row.label}
                        onChange={(event) => setCost(row.id, { label: event.target.value })}
                      />
                      <AffixInput id={`cost-${row.id}`} ariaLabel={row.label || `Valor do custo ${index + 1}`} prefix="R$" value={row.amount} onChange={(value) => setCost(row.id, { amount: value })} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 text-muted-foreground"
                        aria-label={`Remover ${row.label || "custo"}`}
                        onClick={() => setCosts((current) => current.filter((item) => item.id !== row.id))}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button type="button" variant="outline" size="sm" className="min-h-10" disabled={costs.length >= 20} onClick={() => setCosts((current) => [...current, { id: newId(), label: "", amount: "" }])}>
                    <Plus className="size-4" aria-hidden="true" />
                    Adicionar custo
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground tabular-nums">{formatBrl(fixedCostsCents)}</span>
                  </p>
                </div>
              </fieldset>

              <Separator />

              <div className="space-y-4">
                <SectionTitle>Suas metas</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldHeading htmlFor="calc-prolabore" label="Meta de pró-labore" />
                    <AffixInput id="calc-prolabore" prefix="R$" value={proLabore} onChange={setProLabore} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldHeading htmlFor="calc-reserve" label="Reserva mensal" help="Opcional. Quanto guardar por mês para investimentos, como tatames novos." />
                    <AffixInput id="calc-reserve" prefix="R$" value={reserve} onChange={setReserve} />
                  </div>
                </div>
              </div>

              <Collapsible defaultOpen={input.variableCostCents > 0 || input.paymentFeePercent > 0} className="rounded-xl bg-muted/50">
                <CollapsibleTrigger asChild>
                  <button type="button" className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">Ajustes avançados</span>
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">{advancedSummary}</span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 gap-4 border-t border-border/60 px-4 py-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldHeading htmlFor="calc-variable" label="Custo por aluno" help="Opcional. Gasto mensal que cresce com cada aluno, como material ou taxa da federação rateada." />
                      <AffixInput id="calc-variable" prefix="R$" value={variable} onChange={setVariable} />
                    </div>
                    <div className="space-y-1.5">
                      <FieldHeading htmlFor="calc-fee-percent" label="Taxa do meio de pagamento" help="PIX manual não tem taxa (0%). Use se receber por cartão ou maquininha." />
                      <AffixInput id="calc-fee-percent" suffix="%" placeholder="0" value={paymentFee} onChange={setPaymentFee} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" className="min-h-10 text-muted-foreground" onClick={resetDraft}>
                  <Eraser className="size-4" aria-hidden="true" />
                  Limpar rascunho
                </Button>
                <span className="text-xs text-muted-foreground">Só o rascunho deste navegador.</span>
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-6 xl:col-span-7 xl:sticky xl:top-4">
            <Tabs defaultValue="cobrar">
              <TabsList className="h-auto w-full flex-wrap">
                <TabsTrigger value="cobrar">Quanto cobrar?</TabsTrigger>
                <TabsTrigger value="alunos">Quantos alunos preciso?</TabsTrigger>
                <TabsTrigger value="ese">E se...?</TabsTrigger>
              </TabsList>

              <TabsContent value="cobrar">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-1">
                      <CardTitle>Mensalidade necessária com {studentCount} alunos</CardTitle>
                      <InfoTip label="Como é calculada a mensalidade necessária">Cobre custos fixos, pró-labore e reserva, já considerando inadimplência e taxas.</InfoTip>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {requiredFee.ok ? (
                      <>
                        <p data-testid="required-fee" className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                          {formatBrl(requiredFee.value)}
                        </p>
                        {feeCents > 0 ? (
                          requiredFee.value > feeCents ? (
                            <p className="text-sm text-muted-foreground">
                              Hoje você cobra {formatBrl(feeCents)}: faltam{" "}
                              <span className="font-medium text-foreground tabular-nums">{signed(requiredFee.value - feeCents)}</span> por aluno (
                              {(((requiredFee.value - feeCents) / feeCents) * 100).toFixed(1).replace(".", ",")}%).
                            </p>
                          ) : (
                            <StatusBadge tone="success">Sua mensalidade atual já cobre a meta</StatusBadge>
                          )
                        ) : null}
                      </>
                    ) : (
                      <p role="status" className="text-sm text-destructive">{PLANNING_FAILURE_MESSAGES[requiredFee.reason]}</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alunos">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-1">
                      <CardTitle>Alunos necessários a {formatBrl(feeCents)}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        Ponto de equilíbrio · só custos fixos
                      </div>
                      <p data-testid="students-break-even" className="mt-1 text-2xl font-semibold tabular-nums">
                        {breakEven.ok ? breakEven.value : "—"}
                      </p>
                      {!breakEven.ok ? <p className="text-xs text-destructive">{PLANNING_FAILURE_MESSAGES[breakEven.reason]}</p> : null}
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        Meta completa · com pró-labore e reserva
                      </div>
                      <p data-testid="students-goal" className="mt-1 text-2xl font-semibold tabular-nums">
                        {needed.ok ? needed.value : "—"}
                      </p>
                      {needed.ok && needed.value > studentCount ? (
                        <p className="text-xs text-muted-foreground">Faltam {needed.value - studentCount} alunos.</p>
                      ) : needed.ok ? (
                        <p className="text-xs text-muted-foreground">Você já tem alunos suficientes.</p>
                      ) : (
                        <p className="text-xs text-destructive">{PLANNING_FAILURE_MESSAGES[needed.reason]}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ese">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-1">
                      <CardTitle>E se...?</CardTitle>
                      <span className="text-sm text-muted-foreground">Simule sem alterar seus números reais.</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="whatif-students">Alunos: {studentsDelta > 0 ? `+${studentsDelta}` : studentsDelta}</Label>
                        <input id="whatif-students" type="range" min={-10} max={20} step={1} value={studentsDelta} onChange={(event) => setStudentsDelta(Number(event.target.value))} className="w-full accent-primary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatif-fee">Mensalidade: {feeDeltaPercent > 0 ? `+${feeDeltaPercent}` : feeDeltaPercent}%</Label>
                        <input id="whatif-fee" type="range" min={-20} max={30} step={1} value={feeDeltaPercent} onChange={(event) => setFeeDeltaPercent(Number(event.target.value))} className="w-full accent-primary" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <SectionTitle>Atalhos</SectionTitle>
                        <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => setStudentsDelta(-5)}>
                          Perdi 5 alunos
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <FieldHeading htmlFor="shortcut-instructor" label="Contratar instrutor" />
                          <AffixInput id="shortcut-instructor" prefix="R$" value={instructorCost} onChange={setInstructorCost} />
                          <Button type="button" variant="outline" size="sm" className="min-h-10 w-full" disabled={parseMoneyInput(instructorCost) <= 0} onClick={() => { addExtra("Instrutor", parseMoneyInput(instructorCost)); setInstructorCost(""); }}>
                            Aplicar
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <FieldHeading htmlFor="shortcut-rent" label="Mudar de ponto" help="Informe o novo aluguel. A diferença para o aluguel atual entra no cenário." />
                          <AffixInput id="shortcut-rent" prefix="R$" value={newRent} onChange={setNewRent} />
                          <Button type="button" variant="outline" size="sm" className="min-h-10 w-full" disabled={parseMoneyInput(newRent) <= 0} onClick={() => { addExtra("Novo ponto", parseMoneyInput(newRent) - parseMoneyInput(rentRow?.amount ?? "")); setNewRent(""); }}>
                            Aplicar
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <FieldHeading htmlFor="shortcut-equipment" label="Comprar equipamento" help="Valor total e em quantos meses diluir o custo." />
                          <div className="flex gap-2">
                            <AffixInput id="shortcut-equipment" prefix="R$" value={equipmentCost} onChange={setEquipmentCost} />
                            <div className="w-20 shrink-0">
                              <AffixInput id="shortcut-equipment-months" ariaLabel="Meses para pagar o equipamento" inputMode="numeric" suffix="x" placeholder="12" value={equipmentMonths} onChange={setEquipmentMonths} />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-10 w-full"
                            disabled={parseMoneyInput(equipmentCost) <= 0 || parseIntegerInput(equipmentMonths) <= 0}
                            onClick={() => {
                              addExtra(`Equipamento em ${parseIntegerInput(equipmentMonths)}x`, Math.ceil(parseMoneyInput(equipmentCost) / parseIntegerInput(equipmentMonths)));
                              setEquipmentCost("");
                            }}
                          >
                            Aplicar
                          </Button>
                        </div>
                      </div>
                      {extras.length > 0 ? (
                        <ul className="flex flex-wrap gap-2" aria-label="Custos extras do cenário">
                          {extras.map((item) => (
                            <li key={item.id} className="flex items-center gap-1 rounded-lg border border-border bg-muted py-0.5 pl-2.5 pr-1 text-xs">
                              <span className="tabular-nums">{item.label}: {signed(item.monthlyCents)}/mês</span>
                              <Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Remover ${item.label}`} onClick={() => setExtras((current) => current.filter((extra) => extra.id !== item.id))}>
                                <X className="size-3" aria-hidden="true" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <dl className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                      <ResultCard label="Alunos no cenário" testId="whatif-students" value={String(whatIf.students)} helper={`a ${formatBrl(whatIf.feeCents)}`} />
                      <ResultCard
                        label={whatIfScenario.monthlyMarginCents >= 0 ? "Folga do mês" : "Déficit do mês"}
                        testId="whatif-margin"
                        tone={whatIfScenario.coversGoal ? "success" : "danger"}
                        value={formatBrl(whatIfScenario.monthlyMarginCents)}
                      />
                      <ResultCard
                        label={whatIfScenario.yearlyMarginCents >= 0 ? "Folga do ano" : "Déficit do ano"}
                        testId="whatif-yearly"
                        tone={whatIfScenario.coversGoal ? "success" : "danger"}
                        value={formatBrl(whatIfScenario.yearlyMarginCents)}
                      />
                    </dl>

                    {belowBreakEven ? (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Neste cenário você fica abaixo do ponto de equilíbrio
                          {whatIfBreakEven.ok ? ` (${whatIfBreakEven.value} alunos)` : ""}: a receita não cobre nem os custos fixos.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-1">
                  <CardTitle>Receita × alunos</CardTitle>
                  <InfoTip label="Como ler o gráfico">
                    A linha verde é a receita no caixa conforme o número de alunos. Onde ela cruza as linhas tracejadas, você cobre os custos fixos e a meta completa. O ponto marca você hoje.
                  </InfoTip>
                </div>
              </CardHeader>
              <CardContent>
                <PlanningChart students={studentCount} feeCents={feeCents} input={input} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-1">
                  <CardTitle>Cenários salvos</CardTitle>
                  <InfoTip label="Sobre cenários salvos">Guarde versões como “Atual” ou “Com instrutor” para reutilizar os custos depois e no reajuste de mensalidade.</InfoTip>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input id="scenario-name" aria-label="Nome do cenário" maxLength={64} value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder="Ex.: Com instrutor" />
                  <Button type="button" className="min-h-10 shrink-0" disabled={saving || scenarioName.trim().length < 2} onClick={saveScenario}>
                    <Save className="size-4" aria-hidden="true" />
                    Salvar cenário
                  </Button>
                </div>
                {scenarioMessage ? (
                  <p role={scenarioMessage.tone === "error" ? "alert" : "status"} className={cn("text-sm", scenarioMessage.tone === "error" ? "text-destructive" : "text-muted-foreground")}>
                    {scenarioMessage.text}
                  </p>
                ) : null}
                {scenarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum cenário salvo ainda.</p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {scenarios.map((saved) => (
                      <li key={saved.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{saved.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            Custos {formatBrl(saved.fixedCosts.reduce((sum, item) => sum + item.amountCents, 0))} · pró-labore {formatBrl(saved.proLaboreCents)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => loadScenario(saved)}>
                            Carregar
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="size-10 text-muted-foreground" disabled={saving} aria-label={`Excluir cenário ${saved.name}`} onClick={() => removeScenario(saved.id)}>
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
