import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { SetupWizard } from "@/features/academy/components/setup-wizard";
import { getAcademyConfigOverview, getBeltRanksForEdit, getPolicyForEdit } from "@/features/academy/config-service";
import { templateUsesCancellationVariables } from "@/features/academy/impact-notes";
import { BELT_PRESETS } from "@/features/academy/presets";
import { getBillingSettings } from "@/features/billing/settings-service";
import { getPublishedContractVersion } from "@/features/contracts/template-service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

async function SetupWizardLoader({ passo }: { passo?: string }) {
  const [overview, grades, billing, contract, pix, published] = await Promise.all([
    getAcademyConfigOverview(),
    getBeltRanksForEdit(),
    getPolicyForEdit("billing"),
    getPolicyForEdit("contract"),
    getBillingSettings().catch(() => null),
    getPublishedContractVersion().catch(() => null),
  ]);
  const { revision, configured, ...identity } = overview.identity;
  const step = Number(passo);

  return (
    <SetupWizard
      identity={toClientData(identity)}
      identityRevision={revision}
      identityConfigured={configured}
      ranks={toClientData(grades.ranks)}
      presets={toClientData([...BELT_PRESETS])}
      gradesCustomized={overview.customizedRanks > 0 || overview.customized.includes("belts")}
      billing={{ policy: billing.policy, revision: billing.revision, customized: overview.customized.includes("billing") }}
      pix={toClientData(pix)}
      contract={{ policy: contract.policy, revision: contract.revision, customized: overview.customized.includes("contract"), templateUsesVariables: published ? templateUsesCancellationVariables(published.content) : null }}
      setupCompleted={Boolean(identity.setup_completed_at)}
      initialStep={Number.isInteger(step) && step >= 1 ? step - 1 : 0}
    />
  );
}

export default async function AdminAcademySetupPage({ searchParams }: { searchParams: Promise<{ passo?: string }> }) {
  const [admin, query] = await Promise.all([requireProfile("admin"), searchParams]);

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Primeiros passos"
      subtitle="Configure a academia em cinco passos curtos. Cada passo salva sozinho: você pode parar e voltar quando quiser."
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<InlineRowsSkeleton rows={5} label="Carregando assistente…" />}>
          <SetupWizardLoader passo={query.passo} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
