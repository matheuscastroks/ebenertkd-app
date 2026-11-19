import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompliancePolicyForm } from "@/features/academy/components/compliance-policy-form";
import { GamificationPolicyForm } from "@/features/academy/components/gamification-policy-form";
import { NotificationsPolicyForm } from "@/features/academy/components/notifications-policy-form";
import { RetentionPolicyForm } from "@/features/academy/components/retention-policy-form";
import { getPolicyForEdit } from "@/features/academy/config-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminAcademyRulesPage() {
  const admin = await requireProfile("admin");
  const [retention, compliance, notifications, gamification] = await Promise.all([
    getPolicyForEdit("retention"),
    getPolicyForEdit("compliance"),
    getPolicyForEdit("notifications"),
    getPolicyForEdit("gamification")
  ]);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminAcademyRules}
      title="Regras operacionais"
      subtitle="Frequência, atestado e PAR-Q, lembretes de pagamento e conquistas dos alunos."
      breadcrumbs={[{ label: "Configurações da academia", href: ROUTES.adminAcademy }, { label: "Regras operacionais" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        <Tabs defaultValue="retention" className="gap-6">
          <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="retention" className="min-h-11">Retenção</TabsTrigger>
            <TabsTrigger value="compliance" className="min-h-11">Documentos</TabsTrigger>
            <TabsTrigger value="notifications" className="min-h-11">Lembretes</TabsTrigger>
            <TabsTrigger value="gamification" className="min-h-11">Conquistas</TabsTrigger>
          </TabsList>
          <TabsContent value="retention">
            <RetentionPolicyForm policy={retention.policy} revision={retention.revision} />
          </TabsContent>
          <TabsContent value="compliance">
            <CompliancePolicyForm policy={compliance.policy} revision={compliance.revision} />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsPolicyForm policy={notifications.policy} revision={notifications.revision} />
          </TabsContent>
          <TabsContent value="gamification">
            <GamificationPolicyForm policy={gamification.policy} revision={gamification.revision} />
          </TabsContent>
        </Tabs>
        <p className="text-sm text-muted-foreground">
          O bloqueio do aplicativo por mensalidade em atraso continua em{" "}
          <Link href={ROUTES.adminAcademyFinance} className="font-medium text-foreground underline underline-offset-4">Financeiro</Link>.
        </p>
      </div>
    </PortalShell>
  );
}
