"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeSetupAction, saveBillingPolicyAction, saveContractPolicyAction } from "@/app/actions/academy-settings";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RankConfig } from "@/features/academy/belt-rules";
import { BeltPresetDialog } from "@/features/academy/components/belt-preset-dialog";
import { BillingPolicyForm } from "@/features/academy/components/billing-policy-form";
import { ContractPolicyForm } from "@/features/academy/components/contract-policy-form";
import { IdentityForm } from "@/features/academy/components/identity-form";
import { PixSettingsForm } from "@/features/academy/components/pix-settings-form";
import { exitFeeText } from "@/features/academy/contract-policy";
import { DEFAULT_BILLING_POLICY, DEFAULT_CONTRACT_POLICY, type AcademyIdentity, type BillingPolicy, type ContractPolicy } from "@/features/academy/defaults";
import type { BeltPreset } from "@/features/academy/presets";
import type { BillingSettings } from "@/features/billing/types";
import { formatBrl } from "@/lib/money";

export const SETUP_STEPS = [
  { id: "academy", label: "Sua academia" },
  { id: "grades", label: "Graduações" },
  { id: "billing", label: "Mensalidade e PIX" },
  { id: "contract", label: "Contrato" },
  { id: "review", label: "Revisão" }
] as const;

export type SetupWizardProps = {
  identity: AcademyIdentity;
  identityRevision: number;
  identityConfigured: boolean;
  ranks: RankConfig[];
  presets: BeltPreset[];
  gradesCustomized: boolean;
  billing: { policy: BillingPolicy; revision: number; customized: boolean };
  pix: BillingSettings | null;
  contract: { policy: ContractPolicy; revision: number; customized: boolean; templateUsesVariables: boolean | null };
  setupCompleted: boolean;
  initialStep?: number;
};

/** Valores sugeridos (os padrões atuais) no formato que as ações de salvar esperam. */
export function billingDefaultsFormData(revision: number): FormData {
  const data = new FormData();
  data.set("revision", String(revision));
  data.set("default_monthly_fee", (DEFAULT_BILLING_POLICY.default_monthly_fee_cents / 100).toFixed(2).replace(".", ","));
  for (const day of DEFAULT_BILLING_POLICY.due_day_options) data.append("due_day_options", String(day));
  data.set("adjustment_min_notice_days", String(DEFAULT_BILLING_POLICY.adjustment_min_notice_days));
  data.set("charge_lead_days", String(DEFAULT_BILLING_POLICY.charge_lead_days));
  return data;
}

export function contractDefaultsFormData(revision: number): FormData {
  const data = new FormData();
  data.set("revision", String(revision));
  data.set("default_duration_months", String(DEFAULT_CONTRACT_POLICY.default_duration_months));
  data.set("cancellation_notice_day", String(DEFAULT_CONTRACT_POLICY.cancellation_notice_day));
  data.set("exit_fee_mode", DEFAULT_CONTRACT_POLICY.exit_fee_mode);
  data.set("rematriculation_after_months", String(DEFAULT_CONTRACT_POLICY.rematriculation_after_months));
  data.set("renewal_reminder_days", DEFAULT_CONTRACT_POLICY.renewal_reminder_days.join(", "));
  return data;
}

/**
 * Assistente de primeira configuração. Cada passo usa o formulário da tela correspondente e salva sozinho:
 * dá para parar e voltar, e "Concluir" só marca o assistente como feito (não grava mais nada).
 */
export function SetupWizard(props: SetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(props.initialStep ?? 0, 0), SETUP_STEPS.length - 1));
  const [finishing, startFinishing] = useTransition();
  const [applying, setApplying] = useState<string | null>(null);

  const goTo = useCallback((next: number) => {
    const bounded = Math.min(Math.max(next, 0), SETUP_STEPS.length - 1);
    setStep(bounded);
    try {
      window.history.replaceState(null, "", `?passo=${bounded + 1}`);
    } catch {
      // Sem histórico (testes, iframes): o passo continua no estado.
    }
  }, []);

  const applySuggested = async (key: "billing" | "contract") => {
    setApplying(key);
    try {
      const result = key === "billing"
        ? await saveBillingPolicyAction(billingDefaultsFormData(props.billing.revision))
        : await saveContractPolicyAction(contractDefaultsFormData(props.contract.revision));
      if (result.ok) {
        toast.success("Padrão sugerido salvo");
        router.refresh();
      } else {
        toast.error("Não foi possível salvar", { description: result.error === "revision_conflict" ? "Outra alteração foi salva antes. Recarregue a página." : "Tente novamente em instantes." });
      }
    } finally {
      setApplying(null);
    }
  };

  const finish = () =>
    startFinishing(async () => {
      const result = await completeSetupAction().catch(() => ({ ok: false as const, error: "failed" as const }));
      if (result.ok) {
        toast.success("Configuração inicial concluída");
        router.refresh();
      } else if (result.error === "identity_required") {
        toast.error("Salve os dados da academia primeiro", { description: "Volte ao passo 1 e salve a identidade." });
        goTo(0);
      } else {
        toast.error("Não foi possível concluir", { description: "Tente novamente em instantes." });
      }
    });

  const current = SETUP_STEPS[step];

  return (
    <div className="space-y-6">
      <nav aria-label="Passos da configuração inicial">
        <ol className="grid grid-cols-5 gap-2">
          {SETUP_STEPS.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-current={index === step ? "step" : undefined}
                className={`flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center text-xs transition-colors sm:flex-row sm:gap-2 sm:text-sm ${index === step ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <span className="tabular-nums">{index + 1}</span>
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sr-only sm:hidden">{item.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-muted-foreground sm:hidden">Passo {step + 1} de {SETUP_STEPS.length}: {current.label}</p>
      </nav>

      {current.id === "academy" ? <IdentityForm identity={props.identity} revision={props.identityRevision} /> : null}

      {current.id === "grades" ? (
        <Card>
          <CardHeader>
            <CardTitle>Graduações</CardTitle>
            <CardDescription>
              Escolha um modelo de nomes e cores ou mantenha o atual. Todo aluno continua na mesma graduação (gub); depois você ajusta cada uma em Graduações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {props.presets.map((preset) => (
                <BeltPresetDialog key={preset.id} ranks={props.ranks} preset={preset} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {props.gradesCustomized ? "Suas graduações já foram personalizadas." : "Usando o modelo atual da academia."} Pular este passo mantém tudo como está.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {current.id === "billing" ? (
        <div className="space-y-6">
          <BillingPolicyForm policy={props.billing.policy} revision={props.billing.revision} />
          <PixSettingsForm settings={props.pix} />
        </div>
      ) : null}

      {current.id === "contract" ? (
        <ContractPolicyForm policy={props.contract.policy} revision={props.contract.revision} templateUsesVariables={props.contract.templateUsesVariables} />
      ) : null}

      {current.id === "review" ? (
        <Card>
          <CardHeader>
            <CardTitle>Revisão</CardTitle>
            <CardDescription>O que está configurado e o que ainda usa o padrão sugerido. Nada aqui é obrigatório: você pode ajustar depois.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y divide-border">
              <ReviewRow label="Sua academia" value={props.identity.display_name} done={props.identityConfigured} onEdit={() => goTo(0)} />
              <ReviewRow label="Graduações" value={props.gradesCustomized ? "Personalizadas" : "Modelo atual"} done={props.gradesCustomized} doneLabel="Personalizadas" onEdit={() => goTo(1)} />
              <ReviewRow
                label="Mensalidade"
                value={`${formatBrl(props.billing.policy.default_monthly_fee_cents)}, vencimentos ${props.billing.policy.due_day_options.join(", ")}`}
                done={props.billing.customized}
                onEdit={() => goTo(2)}
                onUseSuggested={() => applySuggested("billing")}
                busy={applying === "billing"}
              />
              <ReviewRow label="PIX" value={props.pix?.pix_key ? `Chave ${props.pix.pix_key_type}` : "Não informado"} done={Boolean(props.pix?.pix_key)} pendingLabel="Pendente" onEdit={() => goTo(2)} />
              <ReviewRow
                label="Contrato"
                value={`Aviso até o dia ${props.contract.policy.cancellation_notice_day}; encargo: ${exitFeeText(props.contract.policy)}`}
                done={props.contract.customized}
                onEdit={() => goTo(3)}
                onUseSuggested={() => applySuggested("contract")}
                busy={applying === "contract"}
              />
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {props.setupCompleted ? <StatusBadge tone="success">Configuração inicial concluída</StatusBadge> : <span className="text-sm text-muted-foreground">Ao concluir, o aviso no painel inicial deixa de aparecer.</span>}
              <Button type="button" className="min-h-11" onClick={finish} disabled={finishing || props.setupCompleted}>
                {finishing ? "Concluindo…" : "Concluir configuração"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => goTo(step - 1)} disabled={step === 0}>Voltar</Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => goTo(step + 1)} disabled={step === SETUP_STEPS.length - 1}>
          {current.id === "grades" ? "Manter e continuar" : "Próximo passo"}
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, done, doneLabel = "Configurado", pendingLabel = "Usando o padrão", onEdit, onUseSuggested, busy }: {
  label: string;
  value: string;
  done: boolean;
  doneLabel?: string;
  pendingLabel?: string;
  onEdit: () => void;
  onUseSuggested?: () => void;
  busy?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{value}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={done ? "success" : "neutral"}>{done ? doneLabel : pendingLabel}</StatusBadge>
        {!done && onUseSuggested ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={onUseSuggested} disabled={busy}>
            {busy ? "Salvando…" : "Usar padrão sugerido"}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" className="min-h-11" onClick={onEdit}>Editar</Button>
      </div>
    </li>
  );
}
