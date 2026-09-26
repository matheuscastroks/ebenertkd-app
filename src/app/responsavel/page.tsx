import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { listGuardianMinors } from "@/features/families/service";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { requireCapability } from "@/lib/auth/session";
import {
  guardianAttendancePath,
  guardianBillingPath,
  guardianContractsPath,
  guardianEnrollmentPath,
  ROUTES
} from "@/lib/navigation/routes";
import { UserPlus } from "lucide-react";

export default async function GuardianPage() {
  const guardian = await requireCapability("guardian");
  const minors = await listGuardianMinors(guardian);
  const [summaries, photoIds] = await Promise.all([
    Promise.all(minors.map(async (minor) => ({ minor, history: await getAttendanceHistory(guardian, minor.$id) }))),
    listProfilePhotoDocumentIds(minors.map((minor) => minor.$id))
  ]);

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardian}
      title="Meus dependentes"
      subtitle="Acompanhe o treino, frequência e pagamentos da família."
      headerActions={
        minors.length > 0 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.guardianDependents}>
              <UserPlus aria-hidden="true" />
              Adicionar dependente
            </Link>
          </Button>
        ) : null
      }
    >
      {summaries.length === 0 ? (
        <EmptyState
          title="Nenhum dependente cadastrado"
          description="Ainda não há alunos menores vinculados à sua conta. Cadastre seu primeiro dependente para gerenciar matrícula, treinos e financeiro."
          action={
            <Button asChild>
              <Link href={ROUTES.guardianDependents}>Cadastrar dependente</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {summaries.map(({ minor, history }) => (
            <Card key={minor.$id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <StudentAvatar
                    name={minor.full_name}
                    photoDocumentId={photoIds.get(minor.$id)}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{minor.full_name}</CardTitle>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <BeltBadge
                        belt={history.student?.current_belt}
                        gub={history.student?.gub}
                        size="sm"
                      />
                      {history.student?.status === "draft" && (
                        <Badge variant="outline" className="border-warning/60 bg-warning/10 text-warning-foreground text-[10px]">
                          Matrícula incompleta
                        </Badge>
                      )}
                      {history.student?.status === "submitted" && (
                        <Badge variant="outline" className="border-info/60 bg-info/10 text-info text-[10px]">
                          Matrícula em análise
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {history.summary.total
                          ? `${history.summary.rate}% presença (${history.summary.attended}/${history.summary.total} aulas)`
                          : "Sem chamadas registradas"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={guardianEnrollmentPath(minor.$id)}>Matrícula</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={guardianAttendancePath(minor.$id)}>Frequência</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={guardianContractsPath(minor.$id)}>Contratos</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={guardianBillingPath(minor.$id)}>Pagamentos</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
