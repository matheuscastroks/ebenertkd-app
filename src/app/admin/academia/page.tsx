import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAcademyConfigOverview } from "@/features/academy/config-service";
import type { PolicySection } from "@/features/academy/defaults";
import { identityChecklist } from "@/features/academy/identity-rules";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

type SectionCard = { title: string; description: string; href: string; status?: { label: string; tone: StatusTone } };

const sectionStatus = (customized: PolicySection[], sections: PolicySection[], any = false): { label: string; tone: StatusTone } =>
  sections[any ? "some" : "every"]((section) => customized.includes(section))
    ? { label: "Configurado", tone: "success" }
    : { label: "Usando o padrão", tone: "neutral" };

export default async function AdminAcademyOverviewPage() {
  const admin = await requireProfile("admin");
  const { identity, customized, customizedRanks } = await getAcademyConfigOverview();
  const checklist = identityChecklist(identity);
  const pending = checklist.filter((item) => !item.done);

  const cards: SectionCard[] = [
    {
      title: "Identidade",
      description: "Nomes, documento, endereço, contato e professor.",
      href: ROUTES.adminAcademyIdentity,
      status: !identity.configured ? { label: "Usando o padrão", tone: "neutral" } : pending.length > 0 ? { label: "Revisar", tone: "warning" } : { label: "Completo", tone: "success" }
    },
    {
      title: "Financeiro",
      description: "Mensalidade padrão, taxa de matrícula, vencimentos, PIX e acesso ao aplicativo.",
      href: ROUTES.adminAcademyFinance,
      status: sectionStatus(customized, ["billing"])
    },
    {
      title: "Graduações",
      description: "Nome, cor, forma, tempo e presenças de cada graduação, com modelos CBTKD, ITF e Kukkiwon.",
      href: ROUTES.adminAcademyGrades,
      status: customizedRanks > 0 || customized.includes("belts") ? { label: "Configurado", tone: "success" } : { label: "Usando o padrão", tone: "neutral" }
    },
    {
      title: "Contratos",
      description: "Duração, prazo de cancelamento, encargo de saída e rematrícula.",
      href: ROUTES.adminAcademyContracts,
      status: sectionStatus(customized, ["contract"])
    },
    {
      title: "Exames",
      description: "Taxa padrão, bloqueio por inadimplência, elegibilidade e inscrição em graduações acima.",
      href: ROUTES.adminAcademyExams,
      status: sectionStatus(customized, ["exam"])
    },
    {
      title: "Regras operacionais",
      description: "Risco de evasão, validade de atestado e PAR-Q, lembretes de pagamento e conquistas.",
      href: ROUTES.adminAcademyRules,
      status: sectionStatus(customized, ["retention", "compliance", "notifications", "gamification"], true)
    },
    {
      title: "Sistema e backup",
      description: "Rotinas automáticas, backup externo, notificações push e espaço de armazenamento.",
      href: ROUTES.adminSystem
    }
  ];

  return (
    <PortalShell
      profile={admin}
      title="Ajustes"
      subtitle="Dados da academia, valores, graduações e regras do app."
      headerActions={
        <div className="flex flex-wrap gap-2">
          {!identity.setup_completed_at ? (
            <Button asChild className="min-h-11">
              <Link href={ROUTES.adminAcademySetup}>Primeiros passos</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="min-h-11">
            <Link href={ROUTES.adminAcademyHistory}>Histórico</Link>
          </Button>
        </div>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.href}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  {card.title}
                  {card.status ? <StatusBadge tone={card.status.tone}>{card.status.label}</StatusBadge> : null}
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="min-h-11">
                  <Link href={card.href}>Abrir</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pendências do cadastro</CardTitle>
            <CardDescription>Itens opcionais que deixam contratos e a política de privacidade mais completos.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>{item.label}</span>
                  <StatusBadge tone={item.done ? "success" : "warning"}>{item.done ? "Preenchido" : "Pendente"}</StatusBadge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
