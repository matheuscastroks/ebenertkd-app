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
import { ENROLLMENT_STATUS_LABELS } from "@/features/students/enrollment-labels";
import type { BackTarget } from "@/components/dashboard/section-nav";
import { guardianContractsPath, ROUTES, type NavSegment } from "@/lib/navigation/routes";

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
  back,
  segments,
}: {
  actor: Profile;
  target: Profile;
  query: EnrollmentQuery;
  /** Voltar da pilha quando o responsável abre a ficha de um dependente. */
  back?: BackTarget;
  /** Segmentos do dependente, quando aberto pelo responsável. */
  segments?: NavSegment[];
}) {
  const bundle = await getOrCreateEnrollmentBundle(target, actor);

  if (actor.role === "minor_student") {
    return (
      <PortalShell
        profile={actor}
      back={back}
        title="Cadastro"
        subtitle="Acompanhe sua graduação e o andamento da ficha."
      >
        <div className="w-full min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da matrícula</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Status:</strong> {ENROLLMENT_STATUS_LABELS[bundle.enrollment.status] ?? bundle.enrollment.status}
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
      back={back}
      segments={segments}
      title={actor.$id === target.$id ? "Cadastro" : segments ? "Ficha" : `Ficha de ${target.full_name}`}
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
          guardianSigns={target.role === "minor_student" && actor.$id === target.$id}
          feedback={feedback}
        />
      </div>
    </PortalShell>
  );
}
