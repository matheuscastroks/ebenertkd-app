import { Progress } from "@/components/ui/progress";

export type EnrollmentStep = { id: "pessoais" | "saude" | "treino" | "documentos"; title: string; isValid: boolean };
export function EnrollmentStepper({ steps, current }: { steps: EnrollmentStep[]; current: number }) {
  return <div className="space-y-3">
    <p className="text-sm font-medium">Passo {current + 1} de {steps.length} · {steps[current]?.title}</p>
    <Progress value={((current + 1) / steps.length) * 100} aria-label="Progresso da matrícula" />
    <ol className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">{steps.map((step, index) => <li key={step.id} aria-current={index === current ? "step" : undefined} className={index === current ? "font-medium text-foreground" : ""}>{step.title}{step.isValid ? " · Completo" : ""}</li>)}</ol>
  </div>;
}
