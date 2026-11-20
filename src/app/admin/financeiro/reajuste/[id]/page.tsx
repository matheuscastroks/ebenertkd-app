import { getAcademyIdentity, getPolicyForEdit } from "@/features/academy/config-service";
import { professorSignature } from "@/features/academy/identity-rules";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppwriteException } from "node-appwrite";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { TableRowsSkeleton } from "@/components/skeletons";
import { getAdjustmentSendList } from "@/features/billing/adjustment-service";
import { AdjustmentSendList } from "@/features/billing/components/adjustment-send-list";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

async function SendListContent({ params, adminName }: { params: Promise<{ id: string }>; adminName: string }) {
  const { id } = await params;
  const [identity, billing] = await Promise.all([getAcademyIdentity(), getPolicyForEdit("billing")]);
  const data = await getAdjustmentSendList(id).catch((error: unknown) => {
    const missing = error instanceof AppwriteException && error.code === 404;
    const invalid = error instanceof Error && error.name === "ZodError";
    if (missing || invalid) notFound();
    throw error;
  });
  return <AdjustmentSendList data={toClientData(data)} professorName={professorSignature(identity, adminName)} academyName={identity.short_name} billingDefault={{ cents: billing.policy.default_monthly_fee_cents, revision: billing.revision }} />;
}

export default async function AdminBillingAdjustmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin} back={{ label: "Reajuste", href: ROUTES.adminBillingAdjustment }}
      title="Lista de envio do reajuste"
      subtitle="Copie a mensagem, abra o WhatsApp de cada pagador e marque quem já foi avisado."
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense fallback={<TableRowsSkeleton columns={3} rows={6} />}>
          <SendListContent params={params} adminName={admin.full_name} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
