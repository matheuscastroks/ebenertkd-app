import { Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getContractTemplate } from "@/features/contracts/template-service";
import { listCancellationRequests } from "@/features/contracts/cancellation-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export async function ContractLinks() {
  const [template, requests] = await Promise.all([getContractTemplate(), listCancellationRequests()]);
  const pending = requests.filter((request) => request.status === "pending").length;
  const published = Boolean(template?.published_version_id);
  return <div className="divide-y rounded-xl border border-border bg-card">
    <Link href={ROUTES.adminContractTemplate} className="flex min-h-11 flex-wrap items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-ring">
      <div><h2 className="text-base font-semibold">Modelo de contrato</h2><p className="text-sm text-muted-foreground">Editar o rascunho e publicar versões para novos contratos.</p></div>
      <StatusBadge tone={published ? "success" : "warning"}>{published ? "Versão publicada" : "Publicação pendente"}</StatusBadge>
    </Link>
    <Link href={ROUTES.adminContractRenewals} className="flex min-h-11 flex-wrap items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-ring">
      <div><h2 className="text-base font-semibold">Esteira de renovações</h2><p className="text-sm text-muted-foreground">Acompanhar contratos vencendo em até 90 dias e emitir renovações.</p></div>
      <StatusBadge tone="info">Ciclo semestral / anual</StatusBadge>
    </Link>
    <Link href={ROUTES.adminCancellations} className="flex min-h-11 flex-wrap items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-ring">
      <div><h2 className="text-base font-semibold">Cancelamentos e saídas</h2><p className="text-sm text-muted-foreground">Analisar pedidos, saída e eventual taxa.</p></div>
      <StatusBadge tone={pending ? "warning" : "neutral"}>{pending ? `${pending} pedido${pending === 1 ? "" : "s"} aguardando análise` : "Nenhum pedido pendente"}</StatusBadge>
    </Link>
  </div>;
}

