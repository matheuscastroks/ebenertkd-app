import { PortalShell } from "@/components/dashboard/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/features/auth/types";
import { listTrainingClasses } from "@/features/classes/service";
import { EnrollmentForm } from "@/features/students/components/enrollment-form";
import { getOrCreateEnrollmentBundle } from "@/features/students/service";

type EnrollmentQuery = {
  saved?: string;
  submitted?: string;
  error?: string;
};

export async function EnrollmentWorkspace({
  actor,
  target,
  query,
  activePath
}: {
  actor: Profile;
  target: Profile;
  query: EnrollmentQuery;
  activePath: string;
}) {
  const bundle = await getOrCreateEnrollmentBundle(target, actor);

  if (actor.role === "minor_student") {
    return (
      <PortalShell profile={actor} activePath={activePath} title="Minha matrícula" subtitle="Acompanhe sua graduação e o andamento da ficha.">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader><CardTitle>Resumo da matrícula</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Status:</strong> {bundle.enrollment.status.replaceAll("_", " ")}</p>
              <p><strong>Faixa:</strong> {bundle.student.current_belt ?? "Ainda não informada"}</p>
              <p className="text-sm text-muted-foreground">Seu responsável administra dados de saúde, documentos e informações financeiras.</p>
            </CardContent>
          </Card>
        </div>
      </PortalShell>
    );
  }

  const classes = await listTrainingClasses(true);
  const message = query.saved
    ? "Rascunho salvo."
    : query.submitted
      ? "Ficha enviada para análise."
      : query.error
        ? "Não foi possível salvar. Revise os campos e arquivos."
        : undefined;

  return (
    <PortalShell profile={actor} activePath={activePath} title={`Matrícula · ${target.full_name}`} subtitle="Preencha os dados por etapa e salve para continuar depois.">
      <div className="mx-auto max-w-5xl">
        <EnrollmentForm bundle={bundle} targetProfileId={target.$id} classes={classes} message={message} />
      </div>
    </PortalShell>
  );
}
