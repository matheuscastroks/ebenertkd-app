import { DependentContext } from "@/features/families/components/dependent-context";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeltBadge } from "@/features/students/components/belt-badge";
import type { Profile } from "@/features/auth/types";
import { listTrainingClasses } from "@/features/classes/service";
import { EnrollmentForm } from "@/features/students/components/enrollment-form";
import { getOrCreateEnrollmentBundle } from "@/features/students/service";
import type { EnrollmentStatus } from "@/features/students/types";
import { toClientData } from "@/lib/client-data";
import { guardianContractsPath, ROUTES } from "@/lib/navigation/routes";

type EnrollmentQuery = {
  saved?: string;
  submitted?: string;
  error?: string;
};

const SUBTITLE_BY_STATUS: Record<EnrollmentStatus, string> = {
  draft: "Preencha os dados por etapa e salve para continuar depois.",
  submitted: "Sua ficha foi enviada. Acompanhe o andamento da análise ou atualize seus dados.",
  under_review: "A academia está revisando sua ficha. Consulte o resumo abaixo.",
  awaiting_signature: "Ficha aprovada. Confira os dados e assine o contrato para ativar a matrícula.",
  active: "Matrícula ativa. Consulte o resumo cadastral ou atualize informações quando precisar.",
  awaiting_renewal: "Confira o status da sua matrícula e finalize a renovação do contrato.",
  paused: "Matrícula pausada. Consulte os dados registrados abaixo.",
  cancelled: "Matrícula encerrada. Consulte o histórico cadastral abaixo.",
};

export async function EnrollmentWorkspace({
  actor,
  target,
  query,
  activePath,
}: {
  actor: Profile;
  target: Profile;
  query: EnrollmentQuery;
  activePath: string;
}) {
  const bundle = await getOrCreateEnrollmentBundle(target, actor);

  if (actor.role === "minor_student") {
    return (
      <PortalShell
        profile={actor}
        activePath={activePath}
        title="Minha matrícula"
        subtitle="Acompanhe sua graduação e o andamento da ficha."
      >
        <div className="w-full min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da matrícula</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Status:</strong> {bundle.enrollment.status.replaceAll("_", " ")}
              </p>
              <p>
                <strong>Faixa:</strong> <BeltBadge rankKey={bundle.student.rank_key} size="sm" />
              </p>
              <p className="text-sm text-muted-foreground">
                Seu responsável administra dados de saúde, documentos e informações financeiras.
              </p>
            </CardContent>
          </Card>
        </div>
      </PortalShell>
    );
  }

  const classes = await listTrainingClasses(true);
  const isDraft = bundle.enrollment.status === "draft";
  const isGuardianViewingDependent =
    actor.capabilities.includes("guardian") && actor.$id !== target.$id;
  const contractsHref = isGuardianViewingDependent
    ? guardianContractsPath(target.$id)
    : ROUTES.studentContracts;

  const feedback: { tone: "success" | "error"; title: string } | null = query.saved
    ? {
        tone: "success",
        title: isDraft
          ? "Rascunho salvo com sucesso."
          : "Alterações da matrícula salvas com sucesso.",
      }
    : query.submitted
      ? { tone: "success", title: "Ficha enviada para análise." }
      : query.error === "photo"
        ? {
            tone: "error",
            title: "Adicione a foto do aluno antes de enviar a ficha para análise.",
          }
        : query.error
          ? {
              tone: "error",
              title: "Não foi possível salvar. Revise os campos e arquivos.",
            }
          : null;

  return (
    <PortalShell
      profile={actor}
      activePath={activePath}
      title={`Matrícula · ${target.full_name}`}
      subtitle={SUBTITLE_BY_STATUS[bundle.enrollment.status]}
    >
      <div className="w-full min-w-0 space-y-4">
        {isGuardianViewingDependent ? (
          <DependentContext
            guardian={actor}
            profileId={target.$id}
            section="matricula"
          />
        ) : null}
        <EnrollmentForm
          bundle={toClientData(bundle)}
          targetProfileId={target.$id}
          classes={toClientData(classes)}
          contractsHref={contractsHref}
          feedback={feedback}
        />
      </div>
    </PortalShell>
  );
}
