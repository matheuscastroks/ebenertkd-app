import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { resolveStudentProfile } from "@/features/students/access";
import { requireCapability } from "@/lib/auth/session";
import { guardianContractPath, ROUTES } from "@/lib/navigation/routes";
import { Calendar, FileCheck, FileText } from "lucide-react";

export default async function DependentContractsPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const guardian = await requireCapability("guardian");
  const { profileId } = await params;
  const target = await resolveStudentProfile(guardian, profileId);
  const contracts = await listStudentContracts(guardian, profileId);

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardianDependents}
      title={`Contratos • ${target.full_name}`}
      subtitle="Assine digitalmente contratos pendentes ou consulte termos arquivados do dependente."
      breadcrumbs={[
        { label: "Dependentes", href: ROUTES.guardianDependents },
        { label: target.full_name },
        { label: "Contratos" },
      ]}
    >
      <div className="w-full min-w-0 space-y-4">
        {contracts.length ? (
          contracts.map((contract) => {
            const isSigned = contract.status === "signed";
            const isCancelled = contract.status === "cancelled";

            return (
              <Card
                key={contract.$id}
                className="border-border/80 shadow-sm transition-all hover:border-border"
              >
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {isSigned ? <FileCheck className="size-5" /> : <FileText className="size-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm sm:text-base">
                        Contrato de Matrícula • Versão {contract.version_number}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Calendar className="size-3.5" />
                        Vigência até {new Date(contract.ends_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <StatusBadge
                      tone={isCancelled ? "danger" : isSigned ? "success" : "warning"}
                    >
                      {isCancelled ? "Cancelado" : isSigned ? "Assinado" : "Pendente"}
                    </StatusBadge>
                    <Button asChild className="h-10 font-medium px-4">
                      <Link href={guardianContractPath(profileId, contract.$id)}>
                        {isSigned ? "Visualizar" : "Assinar agora"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="size-10 text-muted-foreground/60 mb-3" />
              <p className="font-semibold text-foreground">Nenhum contrato emitido</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Quando a matrícula do dependente for cadastrada, o contrato ficará disponível aqui para assinatura do responsável.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
