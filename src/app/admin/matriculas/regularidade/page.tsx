import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { TableRowsSkeleton } from "@/components/skeletons";
import { listTrainingClasses } from "@/features/classes/service";
import { ComplianceFilters } from "@/features/students/components/compliance-filters";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ComplianceContent, type ComplianceQuery } from "./compliance-content";

type SearchParams = Promise<ComplianceQuery & { notified?: string; error?: string }>;

async function ComplianceFiltersLoader() {
  const classes = await listTrainingClasses(true);
  return <ComplianceFilters classes={toClientData(classes)} />;
}

export default async function AdminCompliancePage({ searchParams }: { searchParams: SearchParams }) {
  const [admin, params] = await Promise.all([requireProfile("admin"), searchParams]);

  return (
    <PortalShell profile={admin} title="Alunos" subtitle="Peça atestado e PAR-Q a quem está com o documento vencido ou perto de vencer.">
      <div className="w-full min-w-0 space-y-4">
        {params.notified ? (
          <OperationToast
            tone="success"
            title="Pedido enviado"
            description="O aluno e o responsável receberam o pedido no portal."
            clearParams={["notified"]}
          />
        ) : null}
        {params.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível enviar o pedido"
            description="Tente novamente em alguns instantes."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={null}>
          <ComplianceFiltersLoader />
        </Suspense>

        <Suspense fallback={<TableRowsSkeleton columns={3} rows={5} />}>
          <ComplianceContent query={{ q: params.q, status: params.status, turma: params.turma }} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
