import type { StatusTone } from "@/components/shared/status-badge";
import type { Charge } from "@/features/billing/types";
import { getOutstandingCharge, outstandingLabel } from "@/features/billing/outstanding";
import type { Contract } from "@/features/contracts/types";
import type { ParqStatus } from "@/features/students/parq-rules";
import type { Student } from "@/features/students/types";
import { formatBrl } from "@/lib/money";

/**
 * Uma pendência é algo que o aluno ou o responsável precisa saber ou resolver.
 * `priority` menor = mais urgente; apenas a mais urgente com ação recebe o botão laranja.
 */
export type Pendency = {
  id: "enrollment" | "enrollment_review" | "charge" | "charges_error" | "contract" | "contracts_error" | "parq" | "access_locked";
  title: string;
  status: string;
  tone: StatusTone;
  detail?: string;
  href?: string;
  actionLabel?: string;
  priority: number;
  /** Erro de consulta: anunciado como alerta. */
  alert?: boolean;
};

type Source<T> = T[] | null | "hidden";

export type PendencyInput = {
  studentStatus?: Student["status"] | null;
  /** `null` = falha na consulta; `"hidden"` = o perfil não pode ver (menor). */
  charges: Source<Charge>;
  contracts: Source<Contract>;
  parqStatus?: ParqStatus | null;
  parqExpiresAt?: string | null;
  accessLocked?: boolean;
  links: { enrollment: string; billing: string; contracts: string; contract: (contractId: string) => string; parq?: string };
  /** Quem assina: o aluno adulto ou o responsável. O menor só lê. */
  canSign: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

export function buildPendencies({ studentStatus, charges, contracts, parqStatus, parqExpiresAt, accessLocked, links, canSign }: PendencyInput): Pendency[] {
  const items: Pendency[] = [];

  if (accessLocked && charges !== "hidden") {
    items.push({
      id: "access_locked",
      title: "Acesso ao aplicativo pausado",
      status: "Ciclo de 30 dias expirado",
      tone: "danger",
      detail: "Regularize a mensalidade no financeiro para reabrir todas as áreas do aplicativo.",
      href: links.billing,
      actionLabel: "Regularizar acesso",
      priority: -1
    });
  }

  if (!studentStatus || studentStatus === "draft") {
    items.push({ id: "enrollment", title: "Ficha de matrícula", status: "Incompleta", tone: "warning",
      detail: "Complete a ficha para o professor analisar a matrícula.", href: links.enrollment, actionLabel: "Preencher ficha", priority: 2 });
  } else if (studentStatus === "submitted") {
    items.push({ id: "enrollment_review", title: "Ficha de matrícula", status: "Em análise", tone: "info",
      detail: "O professor está analisando a matrícula. Não é preciso fazer nada.", priority: 6 });
  }

  if (studentStatus === "active" && parqStatus && parqStatus !== "valid") {
    const expired = parqStatus === "expired";
    const expiring = parqStatus === "expiring_soon";
    items.push({
      id: "parq",
      title: "PAR-Q anual (CREF1)",
      status: expired ? "Vencido" : expiring ? "Vence em breve" : "Pendente",
      tone: expired ? "danger" : "warning",
      detail: canSign
        ? expiring && parqExpiresAt
          ? `Vence em ${dateFormatter.format(new Date(`${parqExpiresAt.slice(0, 10)}T12:00:00Z`))}. Renove o questionário anual.`
          : "Preencha e assine o questionário anual de prontidão física."
        : "Seu responsável precisa preencher e assinar o PAR-Q anual.",
      href: canSign ? links.parq : undefined,
      actionLabel: canSign && links.parq ? (expired || expiring ? "Renovar PAR-Q" : "Preencher PAR-Q") : undefined,
      priority: expired ? 1.5 : 3.5
    });
  }

  if (charges === null) {
    items.push({ id: "charges_error", title: "Mensalidade", status: "Indisponível", tone: "neutral", alert: true,
      detail: "Não foi possível carregar os pagamentos.", href: links.billing, actionLabel: "Tentar novamente", priority: 4 });
  } else if (charges !== "hidden") {
    const outstanding = getOutstandingCharge(charges);
    if (outstanding) {
      const review = outstanding.status === "proof_under_review";
      items.push({
        id: "charge", title: "Mensalidade", status: outstandingLabel(outstanding),
        tone: outstanding.status === "overdue" ? "danger" : review ? "info" : "warning",
        detail: `${formatBrl(outstanding.amount_cents)} · vencimento ${dateFormatter.format(new Date(outstanding.due_date))}`,
        href: links.billing, actionLabel: review ? "Ver pagamento" : "Pagar mensalidade",
        priority: outstanding.status === "overdue" ? 0 : review ? 5 : 3
      });
    }
  }

  if (contracts === null) {
    items.push({ id: "contracts_error", title: "Contrato", status: "Indisponível", tone: "neutral", alert: true,
      detail: "Não foi possível carregar contratos.", href: links.contracts, actionLabel: "Ver contratos", priority: 4 });
  } else if (contracts !== "hidden") {
    const pending = contracts.find((contract) => contract.status === "pending_signature");
    if (pending) {
      items.push({ id: "contract", title: "Contrato de matrícula", status: "Aguardando assinatura", tone: "warning",
        detail: canSign ? "Leia e assine para confirmar a matrícula." : "Seu responsável precisa assinar.",
        href: canSign ? links.contract(pending.$id) : undefined, actionLabel: canSign ? "Assinar contrato" : undefined, priority: 1 });
    }
  }

  return items.sort((a, b) => a.priority - b.priority);
}

/** A pendência mais urgente que tem ação: recebe a única ação laranja da tela. */
export function primaryPendency<T extends Pendency>(pendencies: T[]): T | undefined {
  return pendencies.find((item) => item.href && !item.alert && item.priority < 5);
}
