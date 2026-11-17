import { ContractLinks } from "@/features/contracts/components/contract-links";
import { Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getContractTemplate } from "@/features/contracts/template-service";
import { listCancellationRequests } from "@/features/contracts/cancellation-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminContractsPage() {
  const admin = await requireProfile("admin");
  return <PortalShell profile={admin} activePath={ROUTES.adminContracts} title="Contratos" subtitle="Modelos, assinaturas e solicitações de encerramento." breadcrumbs={[{ label: "Contratos" }]}>
    <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}><ContractLinks /></Suspense>
  </PortalShell>;
}
