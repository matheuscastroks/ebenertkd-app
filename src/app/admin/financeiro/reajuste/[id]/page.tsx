import { getAcademyIdentity } from "@/features/academy/config-service";
import { professorSignature } from "@/features/academy/identity-rules";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppwriteException } from "node-appwrite";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { TableRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getAdjustmentSendList } from "@/features/billing/adjustment-service";
import { AdjustmentSendList } from "@/features/billing/components/adjustment-send-list";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

async function SendListContent({ params, adminName }: { params: Promise<{ id: string }>; adminName: string }) {
  const { id } = await params;
  const identity = await getAcademyIdentity();
  const data = await getAdjustmentSendList(id).catch((error: unknown) => {
    const missing = error instanceof AppwriteException && error.code === 404;
    const invalid = error instanceof Error && error.name === "ZodError";
    if (missing || invalid) notFound();
    throw error;
  });
  return <AdjustmentSendList data={toClientData(data)} professorName={professorSignature(identity, adminName)} academyName={identity.short_name} />;
}

export default async function AdminBillingAdjustmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminBillingAdjustment}
      title="Lista de envio do reajuste"
      subtitle="Copie a mensagem, abra o WhatsApp de cada pagador e marque quem já foi avisado."
      breadcrumbs={[
        { label: "Financeiro", href: ROUTES.adminBilling },
        { label: "Reajuste de mensalidade", href: ROUTES.adminBillingAdjustment },
        { label: "Lista de envio" },
      ]}
      headerActions={
        <Button asChild variant="outline" className="min-h-11">
          <Link href={ROUTES.adminBillingAdjustment}>Voltar ao reajuste</Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense fallback={<TableRowsSkeleton columns={3} rows={6} />}>
          <SendListContent params={params} adminName={admin.full_name} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
