import Link from "next/link";
import { quickRenewContractAction } from "@/app/actions/renewals";
import { DateField } from "@/components/shared/date-field";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "@/components/ui/icons";
import { getContractRenewalPipeline } from "@/features/contracts/renewal-service";
import type { RenewalBucket } from "@/features/contracts/rules";
import { formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";
import { adminEnrollmentPath, ROUTES } from "@/lib/navigation/routes";

const BUCKET_LABELS: Record<RenewalBucket, string> = {
  expired: "Vencido",
  due_7d: "Vence em até 7 dias",
  due_30d: "Vence em 8 a 30 dias",
  due_60d: "Vence em 31 a 60 dias",
  due_90d: "Vence em 61 a 90 dias",
  healthy: "Vigente",
};

const BUCKET_TONES: Record<RenewalBucket, StatusTone> = {
  expired: "danger",
  due_7d: "warning",
  due_30d: "info",
  due_60d: "neutral",
  due_90d: "neutral",
  healthy: "success",
};

/** Rótulos curtos dos chips, na ordem de urgência. */
const CHIP_LABELS: Record<RenewalBucket, string> = {
  expired: "Vencidos",
  due_7d: "Até 7 dias",
  due_30d: "8 a 30 dias",
  due_60d: "31 a 60 dias",
  due_90d: "61 a 90 dias",
  healthy: "Acima de 90 dias",
};

const BUCKETS = Object.keys(CHIP_LABELS) as RenewalBucket[];

export function parseRenewalBucket(value: string | undefined): RenewalBucket | undefined {
  return BUCKETS.includes(value as RenewalBucket) ? (value as RenewalBucket) : undefined;
}

function chipHref(bucket: RenewalBucket | undefined, search: string | undefined) {
  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (bucket) query.set("bucket", bucket);
  return query.size ? `${ROUTES.adminContractRenewals}?${query}` : ROUTES.adminContractRenewals;
}

/**
 * Renovações: um chip por janela de vencimento (com contagem) e a lista logo abaixo.
 * Os chips substituem a faixa de KPIs e o gráfico, que repetiam os mesmos números.
 */
export async function RenewalsContent({ bucket, search }: { bucket?: RenewalBucket; search?: string }) {
  const { summary, buckets, rows } = await getContractRenewalPipeline({ bucket, search });

  return (
    <div className="space-y-4">
      <FilterChips
        label="Janela de vencimento"
        items={[
          { label: "Em atenção", href: chipHref(undefined, search), count: summary.attentionCount, active: !bucket },
          ...buckets.map((item) => ({
            label: CHIP_LABELS[item.bucket],
            href: chipHref(item.bucket, search),
            count: item.count,
            active: bucket === item.bucket,
            urgent: item.bucket === "expired" || item.bucket === "due_7d",
          })),
        ]}
      />

      {summary.revenueAtRisk30dCents > 0 ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{formatBrl(summary.revenueAtRisk30dCents)}</span> em
          mensalidades de contratos vencidos ou que vencem nos próximos 30 dias.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum contrato nesta janela"
          description={bucket ? "Escolha outra janela de vencimento." : "Nenhum contrato vencido ou perto do fim. Nada para renovar agora."}
          action={
            bucket ? (
              <Button asChild variant="outline" className="min-h-11">
                <Link href={ROUTES.adminContractRenewals}>Ver contratos em atenção</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section aria-labelledby="renewals-list-heading" className="space-y-3">
          <div className="space-y-1">
            <h2 id="renewals-list-heading" className="text-base font-semibold">
              {bucket ? CHIP_LABELS[bucket] : "Em atenção"} ({rows.length})
            </h2>
            <p className="text-sm text-muted-foreground">Ao renovar, a versão publicada do modelo vai para assinatura.</p>
          </div>

          <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
            {rows.map((item) => (
              <li
                key={item.contractId}
                className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 break-words text-sm font-medium text-foreground">{item.studentName}</p>
                    <StatusBadge tone={BUCKET_TONES[item.bucket]}>{BUCKET_LABELS[item.bucket]}</StatusBadge>
                    {item.enrollmentStatus === "awaiting_signature" ? (
                      <StatusBadge tone="info">Aguardando assinatura</StatusBadge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="tabular-nums">
                      {formatBusinessDateBr(item.startsAt)} a {formatBusinessDateBr(item.endsAt)}
                    </span>
                    {" · "}
                    <span className="font-medium text-foreground tabular-nums">{formatBrl(item.monthlyFeeCents)}</span>
                    {item.pendingFeeCents !== null ? (
                      <span className="tabular-nums"> → {formatBrl(item.pendingFeeCents)} após o reajuste</span>
                    ) : null}
                    {item.guardianName ? ` · Responsável: ${item.guardianName}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                  {item.enrollmentStatus !== "awaiting_signature" ? (
                    <ResponsiveDialog
                      trigger={
                        <Button size="sm" className="min-h-11">
                          <RefreshCw className="size-3.5" aria-hidden="true" />
                          Renovar
                        </Button>
                      }
                      title={`Renovar contrato · ${item.studentName}`}
                      description="Defina a data final da nova vigência. O termo será enviado automaticamente para assinatura."
                    >
                      <form action={quickRenewContractAction} className="space-y-4 pt-2">
                        <input type="hidden" name="student_id" value={item.studentId} />
                        <DateField
                          id={`renew-end-${item.studentId}`}
                          name="ends_at"
                          label="Novo término de vigência"
                          defaultValue={item.suggestedNextEnd}
                          required
                        />
                        <FormSubmitButton className="min-h-11 w-full" pendingLabel="Emitindo novo contrato…">
                          Emitir renovação para assinatura
                        </FormSubmitButton>
                      </form>
                    </ResponsiveDialog>
                  ) : null}

                  <Button asChild size="sm" variant="outline" className="min-h-11">
                    <Link href={adminEnrollmentPath(item.studentId)}>
                      Ficha
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
