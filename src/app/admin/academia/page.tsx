import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "@/components/ui/icons";
import { getAcademyConfigOverview } from "@/features/academy/config-service";
import type { PolicySection } from "@/features/academy/defaults";
import { identityChecklist } from "@/features/academy/identity-rules";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

type SettingsRow = { title: string; description: string; href: string; status?: { label: string; tone: StatusTone } };
type SettingsGroup = { title: string; rows: SettingsRow[] };

/** Só marca o que ainda usa o padrão; o que já foi ajustado não precisa de selo. */
const sectionStatus = (customized: PolicySection[], sections: PolicySection[], any = false): SettingsRow["status"] =>
  sections[any ? "some" : "every"]((section) => customized.includes(section))
    ? undefined
    : { label: "Padrão", tone: "neutral" };

export default async function AdminAcademyOverviewPage() {
  const admin = await requireProfile("admin");
  const { identity, customized, customizedRanks } = await getAcademyConfigOverview();
  const checklist = identityChecklist(identity);
  const pending = checklist.filter((item) => !item.done);

  const groups: SettingsGroup[] = [
    {
      title: "Academia",
      rows: [
        {
          title: "Identidade",
          description: "Nomes, documento, endereço, contato e professor.",
          href: ROUTES.adminAcademyIdentity,
          status: !identity.configured ? { label: "Padrão", tone: "neutral" } : pending.length > 0 ? { label: "Revisar", tone: "warning" } : undefined
        },
        { title: "Contratos", description: "Duração, prazo de cancelamento, encargo de saída e rematrícula.", href: ROUTES.adminAcademyContracts, status: sectionStatus(customized, ["contract"]) }
      ]
    },
    {
      title: "Dinheiro",
      rows: [
        { title: "Financeiro e PIX", description: "Mensalidade padrão, matrícula, vencimentos, PIX e acesso ao app.", href: ROUTES.adminAcademyFinance, status: sectionStatus(customized, ["billing"]) }
      ]
    },
    {
      title: "Graduação",
      rows: [
        {
          title: "Graduações",
          description: "Nome, cor, tempo e presenças de cada faixa.",
          href: ROUTES.adminAcademyGrades,
          status: customizedRanks > 0 || customized.includes("belts") ? undefined : { label: "Padrão", tone: "neutral" }
        },
        { title: "Exames", description: "Taxa padrão, bloqueio por atraso e quem pode se inscrever.", href: ROUTES.adminAcademyExams, status: sectionStatus(customized, ["exam"]) }
      ]
    },
    {
      title: "Sistema",
      rows: [
        { title: "Regras", description: "Risco de evasão, validade de atestado e PAR-Q, lembretes e conquistas.", href: ROUTES.adminAcademyRules, status: sectionStatus(customized, ["retention", "compliance", "notifications", "gamification"], true) },
        { title: "Sistema e backup", description: "Rotinas automáticas, backup e armazenamento.", href: ROUTES.adminSystem },
        { title: "Histórico", description: "Quem mudou o quê nos ajustes.", href: ROUTES.adminAcademyHistory }
      ]
    }
  ];

  return (
    <PortalShell
      profile={admin}
      title="Ajustes"
      subtitle="Dados da academia, valores, graduações e regras do app."
      headerActions={
        !identity.setup_completed_at ? (
          <Button asChild className="min-h-11">
            <Link href={ROUTES.adminAcademySetup}>Primeiros passos</Link>
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
        {pending.length > 0 ? (
          <Link
            href={ROUTES.adminAcademyIdentity}
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
          >
            <span>
              <span className="font-medium">Cadastro incompleto:</span> {pending.map((item) => item.label).join(" · ")}.
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ) : null}

        {groups.map((group) => (
          <section key={group.title} aria-labelledby={`ajustes-${group.title}`} className="space-y-2">
            <h2 id={`ajustes-${group.title}`} className="px-1 text-sm font-medium text-muted-foreground">{group.title}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
              {group.rows.map((row) => (
                <li key={row.href}>
                  <Link href={row.href} className="t-interactive-row flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted sm:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{row.title}</span>
                      <span className="block text-sm text-muted-foreground">{row.description}</span>
                    </span>
                    {row.status ? <StatusBadge tone={row.status.tone}>{row.status.label}</StatusBadge> : null}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PortalShell>
  );
}
