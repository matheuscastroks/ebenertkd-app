import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { Profile } from "@/features/auth/types";
import {
  accessStatusLabel,
  type StudentAppAccessStatus,
} from "@/features/billing/access-lock-rules";
import { getStudentAppAccessByProfileId } from "@/features/billing/access-lock-service";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { PayerBillingView } from "@/features/billing/components/payer-billing-view";
import { listLatestProofsForCharges } from "@/features/billing/proof-service";
import { getBillingSettings } from "@/features/billing/settings-service";
import { toClientData } from "@/lib/client-data";
import { formatBusinessDateBr } from "@/lib/dates";

const ACCESS_TONES: Record<StudentAppAccessStatus, StatusTone> = {
  not_applicable: "neutral",
  active: "success",
  expiring_soon: "warning",
  proof_under_review: "info",
  override: "info",
  locked: "danger",
};

export async function PayerBilling({
  actor,
  profileId,
  view = "open",
}: {
  actor: Profile;
  profileId?: string;
  view?: "open" | "history";
}) {
  const targetProfileId = profileId ?? actor.$id;
  const [charges, settings, accessContext] = await Promise.all([
    listChargesForStudent(actor, profileId),
    getBillingSettings(),
    getStudentAppAccessByProfileId(targetProfileId).catch(() => null),
  ]);
  const proofs = await listLatestProofsForCharges(charges.map((charge) => charge.$id));
  const access = accessContext?.access;

  return (
    <div className="space-y-5">
      {access && access.status !== "not_applicable" ? (
        <section
          aria-label="Ciclo mensal de acesso ao aplicativo"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                Ciclo de acesso ao app (30 dias após pagamento)
              </p>
              <StatusBadge tone={ACCESS_TONES[access.status]}>
                {accessStatusLabel(access)}
              </StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {access.status === "locked"
                ? access.accessValidUntil
                  ? `Acesso pausado desde ${formatBusinessDateBr(access.accessValidUntil)}. Envie o comprovante PIX abaixo para liberar imediatamente.`
                  : "Acesso pausado por mensalidade em atraso. Envie o comprovante PIX abaixo para liberar."
                : access.status === "proof_under_review"
                  ? "Comprovante recebido! O aplicativo permanece liberado enquanto o professor faz a conferência."
                  : access.status === "override" && access.accessValidUntil
                    ? `Liberação temporária ativa até ${formatBusinessDateBr(access.accessValidUntil)}.`
                    : access.accessValidUntil
                      ? `${access.lastPaidAt ? `Último pagamento confirmado em ${formatBusinessDateBr(access.lastPaidAt)} · ` : ""}Acesso válido até ${formatBusinessDateBr(access.accessValidUntil)}${access.daysRemaining != null ? ` (${access.daysRemaining} ${access.daysRemaining === 1 ? "dia restante" : "dias restantes"})` : ""}.`
                      : "Acesso liberado dentro do ciclo mensal vigente."}
            </p>
          </div>
        </section>
      ) : null}

      <PayerBillingView
        charges={toClientData(charges)}
        settings={toClientData(settings)}
        proofs={toClientData(Object.fromEntries(proofs))}
        profileId={profileId}
        initialView={view === "history" ? "paid" : "open"}
      />
    </div>
  );
}
