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

type SectionCard = { title: string; description: string; href: string; status: { label: string; tone: StatusTone } };

const sectionStatus = (customized: PolicySection[], sections: PolicySection[]): { label: string; tone: StatusTone } =>
  sections.every((section) => customized.includes(section))
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
    }
  ];

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminAcademy}
      title="Configurações da academia"
      subtitle="Os valores que antes ficavam fixos no sistema, agora editáveis por você."
      breadcrumbs={[{ label: "Configurações da academia" }]}
      headerActions={
        <Button asChild variant="outline" className="min-h-11">
          <Link href={ROUTES.adminLocations}>Locais de treino</Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.href}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  {card.title}
                  <StatusBadge tone={card.status.tone}>{card.status.label}</StatusBadge>
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
