import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { Profile } from "@/features/auth/types";
import { formatNextTraining } from "@/features/families/next-training";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { loadDependentSnapshots, studentStatusLabel, studentStatusTone } from "@/features/families/dependent-snapshot";
import { primaryPendency } from "@/features/families/pendencies";
import { dependentSections, dependentSummaryPath } from "@/features/families/paths";
import { PendencyList } from "./pendency-list";
import { ROUTES } from "@/lib/navigation/routes";

/**
 * Painel da família: um cartão por filho. Primário: quem é e o que está pendente.
 * Secundário: próximo treino e frequência. Terciário: atalhos para as áreas do filho.
 * A única ação laranja vai para a pendência mais urgente da família inteira.
 */
export async function GuardianMinorsOverview({ guardian, minors }: { guardian: Profile; minors: Profile[] }) {
  if (!minors.length) return <EmptyState title="Nenhum dependente cadastrado" description="Cadastre um filho ou dependente para preencher a matrícula e acompanhar os treinos."
    action={<Button asChild className="min-h-11"><Link href={ROUTES.guardianDependents}>Cadastrar dependente</Link></Button>} />;
  const data = await loadDependentSnapshots(guardian, minors);
  const urgent = data.flatMap(({ minor, pendencies }) => pendencies.map((item) => ({ ...item, key: `${minor.$id}:${item.id}` })))
    .sort((a, b) => a.priority - b.priority);
  const primaryKey = primaryPendency(urgent)?.key;

  return <div className="grid gap-6 xl:grid-cols-2">{data.map(({ minor, student, summary, next, trainingClass, pendencies, photoDocumentId }) => {
    const firstName = minor.full_name.split(" ")[0];
    return <Card key={minor.$id} aria-labelledby={`dependent-${minor.$id}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <StudentAvatar name={minor.full_name} photoDocumentId={photoDocumentId} size="md" className="size-14" />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 id={`dependent-${minor.$id}`} className="truncate text-base font-semibold">
              <Link href={dependentSummaryPath(minor.$id)} className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{minor.full_name}</Link>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <BeltBadge belt={student?.current_belt} gub={student?.gub} />
              <StatusBadge tone={studentStatusTone(student?.status)}>{studentStatusLabel(student?.status)}</StatusBadge>
            </div>
          </div>
          <Link href={dependentSummaryPath(minor.$id)} aria-label={`Ver resumo de ${minor.full_name}`} className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start rounded-lg px-2 text-sm font-medium text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            Ver resumo<ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <section aria-label={`Pendências de ${firstName}`}>
          <PendencyList items={pendencies} primaryKey={primaryKey} keyPrefix={`${minor.$id}:`} subject={minor.full_name} emptyLabel={`Nada pendente para ${firstName}.`} />
        </section>
        <dl className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <div className="space-y-0.5"><dt className="text-muted-foreground">Próximo treino</dt><dd className="font-medium tabular-nums">{formatNextTraining(next)}</dd>{trainingClass ? <dd className="text-muted-foreground">{trainingClass.name}</dd> : null}</div>
          <div className="space-y-0.5"><dt className="text-muted-foreground">Frequência</dt><dd className="font-medium tabular-nums">{summary.total ? `${summary.rate}% · ${summary.attended} de ${summary.total} aulas` : "Ainda sem aulas registradas"}</dd></div>
        </dl>
        <nav aria-label={`Acessos de ${minor.full_name}`} className="flex flex-wrap gap-x-1 gap-y-1 border-t border-border pt-3">
          {dependentSections(minor.$id).map((section) => <Link key={section.key} href={section.href}
            className="inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-muted-foreground transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none">{section.label}</Link>)}
        </nav>
      </CardContent>
    </Card>;
  })}</div>;
}
