import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Contract } from "@/features/contracts/types";

const statusView = {
  pending_signature: { label: "Aguardando assinatura", tone: "warning" },
  signed: { label: "Assinado", tone: "success" },
  expired: { label: "Encerrado", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" }
} as const;

/**
 * Contratos do aluno ou do dependente, em uma lista. Só o primeiro contrato aguardando
 * assinatura recebe a ação laranja; quem não pode assinar (menor) apenas lê.
 */
export function PortalContractList({ contracts, hrefFor, canSign, canOpen = true, emptyDescription }: {
  contracts: Contract[] | null; hrefFor: (contractId: string) => string; canSign: boolean;
  /** Menores não abrem o contrato (a tela de detalhe os redireciona): a lista só informa o status. */
  canOpen?: boolean;
  emptyDescription: string;
}) {
  if (contracts === null) return <p role="alert" className="rounded-xl bg-card p-4 text-sm">Não foi possível carregar os contratos. Atualize a página para tentar de novo.</p>;
  if (!contracts.length) return <EmptyState illustration="empty-documents" title="Nenhum contrato emitido" description={emptyDescription} />;
  const firstPending = canSign ? contracts.find((contract) => contract.status === "pending_signature")?.$id : undefined;
  return <Card><CardContent>
    <ul className="divide-y divide-border">
      {contracts.map((contract) => {
        const view = statusView[contract.status] ?? statusView.expired;
        const pending = contract.status === "pending_signature";
        const label = pending && canSign ? "Assinar" : "Ver contrato";
        return <li key={contract.$id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Contrato de matrícula · versão {contract.version_number}</p>
              <StatusBadge tone={view.tone}>{view.label}</StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">Vigente até {new Date(contract.ends_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
          </div>
          {canOpen ? <Button asChild variant={contract.$id === firstPending ? "default" : "outline"} className="min-h-11 w-full shrink-0 sm:w-auto">
            <Link href={hrefFor(contract.$id)} aria-label={`${label === "Assinar" ? "Assinar contrato" : label} versão ${contract.version_number}`}>{label}</Link>
          </Button> : null}
        </li>;
      })}
    </ul>
  </CardContent></Card>;
}
