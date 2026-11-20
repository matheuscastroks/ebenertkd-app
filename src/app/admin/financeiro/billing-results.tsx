import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { ListPagination } from "@/components/shared/list-pagination";
import { Button } from "@/components/ui/button";
import { BillingTable } from "@/features/billing/components/billing-table";
import { getBillingOverview } from "@/features/billing/report-service";
import type { ChargeStatus } from "@/features/billing/types";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

export type BillingQuery = {
  status?: string;
  competence?: string;
  student?: string;
  trainingClass?: string;
  type?: string;
  page?: string;
};

/** Ordem dos chips: primeiro o que pede ação (conferir, cobrar), depois o histórico. */
const STATUS_CHIPS: Array<{ status: ChargeStatus; label: string; urgent?: boolean }> = [
  { status: "proof_under_review", label: "Para conferir", urgent: true },
  { status: "overdue", label: "Em atraso", urgent: true },
  { status: "pending", label: "A vencer" },
  { status: "paid", label: "Pagas" },
  { status: "cancelled", label: "Canceladas" },
];

const CHARGE_TYPES = ["monthly_fee", "enrollment_fee", "exam_fee", "exit_fee", "event_fee"] as const;
type ChargeType = (typeof CHARGE_TYPES)[number];

export function parseChargeStatus(value?: string): ChargeStatus | undefined {
  return STATUS_CHIPS.some((chip) => chip.status === value) ? (value as ChargeStatus) : undefined;
}

function billingPath(params: BillingQuery, status?: ChargeStatus) {
  const query = new URLSearchParams();
  for (const key of ["competence", "student", "trainingClass", "type"] as const) {
    const value = params[key];
    if (value && value !== "all") query.set(key, value);
  }
  if (status) query.set("status", status);
  return `${ROUTES.adminBilling}${query.size ? `?${query}` : ""}`;
}

/**
 * Cobranças: chips de situação com contagem (respeitando os demais filtros) e a tabela.
 * Substitui a faixa de KPIs e o gráfico, que ficam no Fechamento.
 */
export async function BillingResults({ params }: { params: BillingQuery }) {
  const status = parseChargeStatus(params.status);
  const type = CHARGE_TYPES.includes(params.type as ChargeType) ? (params.type as ChargeType) : undefined;
  const trainingClass = params.trainingClass === "all" ? undefined : params.trainingClass;
  const page = /^\d+$/.test(params.page ?? "") ? Math.max(1, Number(params.page)) : 1;
  const data = await getBillingOverview({
    status,
    competence: /^\d{4}-\d{2}$/.test(params.competence ?? "") ? params.competence : undefined,
    student: params.student,
    trainingClass,
    type,
    page,
  });
  const total = Object.values(data.statusCounts).reduce((sum, count) => sum + count, 0);
  const activeLabel = STATUS_CHIPS.find((chip) => chip.status === status)?.label;

  return (
    <div className="space-y-4">
      <FilterChips
        label="Situação das cobranças"
        items={[
          { label: "Todas", href: billingPath(params), count: total, active: !status },
          ...STATUS_CHIPS.map((chip) => ({
            label: chip.label,
            href: billingPath(params, chip.status),
            count: data.statusCounts[chip.status],
            active: status === chip.status,
            urgent: chip.urgent,
          })),
        ]}
      />

      {data.charges.length === 0 ? (
        <EmptyState
          title={activeLabel ? `Nenhuma cobrança em "${activeLabel}"` : "Nenhuma cobrança encontrada"}
          description={
            status === "proof_under_review"
              ? "Não há comprovantes esperando conferência."
              : "Remova algum filtro ou consulte outro mês."
          }
          action={
            <Button asChild variant="outline" className="min-h-11">
              <Link href={ROUTES.adminBilling}>Ver todas</Link>
            </Button>
          }
        />
      ) : (
        <BillingTable
          charges={toClientData(data.charges)}
          names={data.names}
          photosByStudent={data.photosByStudent}
          proofsByCharge={toClientData(data.proofsByCharge)}
          payments={toClientData(data.payments)}
        />
      )}
      <ListPagination
        basePath={ROUTES.adminBilling}
        params={{
          status: params.status,
          competence: params.competence,
          student: params.student,
          trainingClass: params.trainingClass,
          type: params.type,
        }}
        page={data.pagination.page}
        total={data.pagination.total}
        pageSize={data.pagination.pageSize}
      />
    </div>
  );
}
