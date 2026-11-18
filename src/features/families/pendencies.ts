import type { StatusTone } from "@/components/shared/status-badge";
import type { Charge } from "@/features/billing/types";
import { getOutstandingCharge, outstandingLabel } from "@/features/billing/outstanding";
import type { Contract } from "@/features/contracts/types";
import type { Student } from "@/features/students/types";
import { formatBrl } from "@/lib/money";

/**
 * Uma pendência é algo que o aluno ou o responsável precisa saber ou resolver.
 * `priority` menor = mais urgente; apenas a mais urgente com ação recebe o botão laranja.
 */
export type Pendency = {
  id: "enrollment" | "enrollment_review" | "charge" | "charges_error" | "contract" | "contracts_error";
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
  links: { enrollment: string; billing: string; contracts: string; contract: (contractId: string) => string };
  /** Quem assina: o aluno adulto ou o responsável. O menor só lê. */
  canSign: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

export function buildPendencies({ studentStatus, charges, contracts, links, canSign }: PendencyInput): Pendency[] {
  const items: Pendency[] = [];

  if (!studentStatus || studentStatus === "draft") {
    items.push({ id: "enrollment", title: "Ficha de matrícula", status: "Incompleta", tone: "warning",
      detail: "Complete a ficha para o professor analisar a matrícula.", href: links.enrollment, actionLabel: "Preencher ficha", priority: 2 });
  } else if (studentStatus === "submitted") {
    items.push({ id: "enrollment_review", title: "Ficha de matrícula", status: "Em análise", tone: "info",
      detail: "O professor está analisando a matrícula. Não é preciso fazer nada.", priority: 6 });
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
