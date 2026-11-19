"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { deleteFinanceScenarioAction, saveFinanceScenarioAction } from "@/app/actions/tuition-adjustment";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function ResultCard({ label, value, helper, tone, testId }: { label: string; value: string; helper?: string; tone?: "danger" | "success"; testId?: string }) {
  return (
    <div className="p-4 sm:px-5">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
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

function MoneyField({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" placeholder="0,00" value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * O rascunho vem do navegador, que o servidor não enxerga: o snapshot do servidor é "sem rascunho" e,
 * ao hidratar, o corpo é remontado já com o rascunho (sem setState em efeito).
 */
export function PlanningCalculator(props: { baseline: PlanningBaseline; scenarios: SavedScenario[] }) {
  const raw = useSyncExternalStore(subscribeNone, readRawDraft, () => null);
  const hydrated = raw !== null;
  const draft = useMemo(() => parseDraft(raw), [raw]);
  return <CalculatorBody key={hydrated ? "client" : "server"} {...props} initialDraft={draft} persist={hydrated} />;
}

function CalculatorBody({
  baseline,
  scenarios: initialScenarios,
  initialDraft,
  persist
}: {
  baseline: PlanningBaseline;
  scenarios: SavedScenario[];
  initialDraft: Draft | null;
  persist: boolean;
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

  return (
    <div className="space-y-6">
      <dl aria-label="Resumo do planejamento" className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <ResultCard
          label="Ponto de equilíbrio"
          testId="break-even"
          value={breakEven.ok ? `${breakEven.value} aluno${breakEven.value === 1 ? "" : "s"}` : "—"}
          helper={breakEven.ok ? "só para cobrir os custos fixos" : PLANNING_FAILURE_MESSAGES[breakEven.reason]}
        />
        <ResultCard
          label="Alunos pagantes"
          testId="current-students"
          value={String(studentCount)}
          helper={`${baseline.activeStudents} ativos hoje${baseline.awaitingRenewalStudents ? ` · ${baseline.awaitingRenewalStudents} aguardando renovação` : ""}`}
        />
        <ResultCard
          label={scenario.monthlyMarginCents >= 0 ? "Folga do mês" : "Déficit do mês"}
          testId="monthly-margin"
          tone={marginTone}
          value={formatBrl(scenario.monthlyMarginCents)}
          helper={`${signed(scenario.yearlyMarginCents)} no ano`}
        />
      </dl>

      <p data-testid="reading" className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-xs">
        {reading}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Seus números</CardTitle>
          <CardDescription>
            Os valores da academia já vêm preenchidos. Você pode alterar qualquer um: o valor real aparece ao lado do campo editado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="calc-students">Alunos que pagam mensalidade</Label>
              <Input id="calc-students" inputMode="numeric" value={students} onChange={(event) => setStudents(event.target.value)} />
              <p className="text-xs text-muted-foreground">{edited(students, String(baseline.activeStudents)) ? `Valor real: ${baseline.activeStudents}` : "Valor real da academia"}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-fee">Mensalidade média (R$)</Label>
              <Input id="calc-fee" inputMode="decimal" placeholder="0,00" value={fee} onChange={(event) => setFee(event.target.value)} />
              <p className="text-xs text-muted-foreground">
                {edited(fee, centsToInput(baseline.averageFeeCents)) ? `Valor real: ${formatBrl(baseline.averageFeeCents)}` : "Média dos contratos vigentes"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-default">Inadimplência esperada (%)</Label>
              <Input id="calc-default" inputMode="decimal" value={defaultRate} onChange={(event) => setDefaultRate(event.target.value)} />
              <p className="text-xs text-muted-foreground">
                {baseline.defaultRatePercent === null
                  ? "Sem histórico de fechamentos ainda"
                  : edited(defaultRate, String(baseline.defaultRatePercent).replace(".", ","))
                    ? `Valor real: ${String(baseline.defaultRatePercent).replace(".", ",")}%`
                    : `Média dos últimos ${baseline.monthsConsidered} fechamentos`}
              </p>
            </div>
          </div>

          {baseline.feeDistribution.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              Nem todos pagam igual:{" "}
              {baseline.feeDistribution.map((item) => `${item.count} × ${formatBrl(item.feeCents)}`).join(" · ")}
              {baseline.feeDistributionOtherCount > 0 ? ` · outros ${baseline.feeDistributionOtherCount}` : ""}.
            </p>
          ) : null}

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Custos fixos mensais</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {costs.map((row) => (
                <div key={row.id} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor={`cost-${row.id}`} className="truncate">{row.label || "Custo"}</Label>
                    <Input id={`cost-${row.id}`} inputMode="decimal" placeholder="0,00" value={row.amount} onChange={(event) => setCost(row.id, { amount: event.target.value })} />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="min-h-10" aria-label={`Remover ${row.label || "custo"}`} onClick={() => setCosts((current) => current.filter((item) => item.id !== row.id))}>
                    Remover
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" className="min-h-10" disabled={costs.length >= 20} onClick={() => setCosts((current) => [...current, { id: newId(), label: "Outro custo", amount: "" }])}>
                Adicionar custo
              </Button>
              <p className="text-sm text-muted-foreground">
                Total de custos fixos: <span className="font-medium text-foreground tabular-nums">{formatBrl(fixedCostsCents)}</span>
              </p>
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MoneyField id="calc-prolabore" label="Meta de pró-labore (R$)" value={proLabore} onChange={setProLabore} hint="Salário que você deseja tirar por mês" />
            <MoneyField id="calc-reserve" label="Reserva mensal (R$)" value={reserve} onChange={setReserve} hint="Ex.: tatames novos (opcional)" />
            <MoneyField id="calc-variable" label="Custo por aluno (R$)" value={variable} onChange={setVariable} hint="Material, federação rateada (opcional)" />
            <div className="space-y-1.5">
              <Label htmlFor="calc-fee-percent">Taxa do meio de pagamento (%)</Label>
              <Input id="calc-fee-percent" inputMode="decimal" value={paymentFee} onChange={(event) => setPaymentFee(event.target.value)} />
              <p className="text-xs text-muted-foreground">PIX manual não tem taxa (0%)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" size="sm" className="min-h-10" onClick={resetDraft}>
              Limpar custos e rascunho
            </Button>
            <p className="text-xs text-muted-foreground">Seus custos ficam guardados só neste navegador, como rascunho.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cobrar">
        <TabsList className="h-auto w-full flex-wrap sm:w-fit">
          <TabsTrigger value="cobrar">Quanto cobrar?</TabsTrigger>
          <TabsTrigger value="alunos">Quantos alunos preciso?</TabsTrigger>
          <TabsTrigger value="ese">E se...?</TabsTrigger>
        </TabsList>

        <TabsContent value="cobrar" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Mensalidade necessária com seus {studentCount} alunos</CardTitle>
              <CardDescription>Cobre custos fixos, pró-labore e reserva, já considerando inadimplência e taxas.</CardDescription>
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

        <TabsContent value="alunos" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Alunos necessários a {formatBrl(feeCents)}</CardTitle>
              <CardDescription>Altere a mensalidade média acima para comparar valores.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Para o ponto de equilíbrio</p>
                <p data-testid="students-break-even" className="mt-1 text-2xl font-semibold tabular-nums">
                  {breakEven.ok ? breakEven.value : "—"}
                </p>
                {!breakEven.ok ? <p className="text-xs text-destructive">{PLANNING_FAILURE_MESSAGES[breakEven.reason]}</p> : null}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Para a meta (custos + pró-labore + reserva)</p>
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

        <TabsContent value="ese" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>E se...?</CardTitle>
              <CardDescription>Mexa nos controles para ver como o mês e o ano mudariam, sem alterar seus números reais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
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
                <p className="text-sm font-medium text-foreground">Atalhos</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => setStudentsDelta(-5)}>
                    Perdi 5 alunos
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="shortcut-instructor">Contratar instrutor (R$/mês)</Label>
                    <div className="flex gap-2">
                      <Input id="shortcut-instructor" inputMode="decimal" placeholder="0,00" value={instructorCost} onChange={(event) => setInstructorCost(event.target.value)} />
                      <Button type="button" variant="outline" size="sm" className="min-h-10" disabled={parseMoneyInput(instructorCost) <= 0} onClick={() => { addExtra("Instrutor", parseMoneyInput(instructorCost)); setInstructorCost(""); }}>
                        Aplicar
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shortcut-rent">Mudar de ponto: novo aluguel (R$)</Label>
                    <div className="flex gap-2">
                      <Input id="shortcut-rent" inputMode="decimal" placeholder="0,00" value={newRent} onChange={(event) => setNewRent(event.target.value)} />
                      <Button type="button" variant="outline" size="sm" className="min-h-10" disabled={parseMoneyInput(newRent) <= 0} onClick={() => { addExtra("Novo ponto", parseMoneyInput(newRent) - parseMoneyInput(rentRow?.amount ?? "")); setNewRent(""); }}>
                        Aplicar
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shortcut-equipment">Comprar equipamento (R$ total)</Label>
                    <div className="flex gap-2">
                      <Input id="shortcut-equipment" inputMode="decimal" placeholder="0,00" value={equipmentCost} onChange={(event) => setEquipmentCost(event.target.value)} />
                      <Input aria-label="Meses para pagar o equipamento" className="w-20" inputMode="numeric" value={equipmentMonths} onChange={(event) => setEquipmentMonths(event.target.value)} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-10"
                        disabled={parseMoneyInput(equipmentCost) <= 0 || parseIntegerInput(equipmentMonths) <= 0}
                        onClick={() => {
                          addExtra(`Equipamento em ${parseIntegerInput(equipmentMonths)}x`, Math.ceil(parseMoneyInput(equipmentCost) / parseIntegerInput(equipmentMonths)));
                          setEquipmentCost("");
                        }}
                      >
                        Aplicar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Meses para diluir o custo</p>
                  </div>
                </div>
                {extras.length > 0 ? (
                  <ul className="flex flex-wrap gap-2" aria-label="Custos extras do cenário">
                    {extras.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs">
                        <span>{item.label}: {signed(item.monthlyCents)}/mês</span>
                        <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" aria-label={`Remover ${item.label}`} onClick={() => setExtras((current) => current.filter((extra) => extra.id !== item.id))}>
                          Remover
                        </button>
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
        <CardContent className="pt-0">
          <PlanningChart students={studentCount} feeCents={feeCents} input={input} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cenários salvos</CardTitle>
          <CardDescription>Guarde versões como “Atual” ou “Com instrutor” para reutilizar os custos depois.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="scenario-name">Nome do cenário</Label>
              <Input id="scenario-name" maxLength={64} value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder="Ex.: Com instrutor" />
            </div>
            <Button type="button" className="min-h-10" disabled={saving || scenarioName.trim().length < 2} onClick={saveScenario}>
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
                      Custos fixos {formatBrl(saved.fixedCosts.reduce((sum, item) => sum + item.amountCents, 0))} · pró-labore {formatBrl(saved.proLaboreCents)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => loadScenario(saved)}>
                      Carregar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="min-h-10" disabled={saving} aria-label={`Excluir cenário ${saved.name}`} onClick={() => removeScenario(saved.id)}>
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
