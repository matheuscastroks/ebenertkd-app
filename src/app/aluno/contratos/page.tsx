import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES, studentContractPath } from "@/lib/navigation/routes";
import { FileCheck, FileText, Calendar } from "lucide-react";

export default async function StudentContractsPage() {
  const profile = await requireProfile();
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardianDependents);
  const contracts = await listStudentContracts(profile);

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.studentContracts}
      title="Meus contratos"
      subtitle="Consulte contratos pendentes de assinatura e documentos vigentes ou arquivados."
      breadcrumbs={[{ label: "Contratos" }]}
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
                      <Link href={studentContractPath(contract.$id)}>
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
                Quando sua matrícula for confirmada pela academia, o contrato estará disponível para visualização e assinatura.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
