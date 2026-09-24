import { exportBillingCsv } from "@/features/billing/report-service";
import type { ChargeStatus } from "@/features/billing/types";
import { requireProfile } from "@/lib/auth/session";

const statuses = new Set<ChargeStatus>(["pending", "proof_under_review", "paid", "overdue", "cancelled"]);
export async function GET(request: Request) {
  await requireProfile("admin");
  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status") as ChargeStatus | null;
  const competence = url.searchParams.get("competence") ?? undefined;
  const rawType = url.searchParams.get("type");
  const type = ["monthly_fee", "enrollment_fee", "exam_fee", "exit_fee"].includes(rawType ?? "") ? rawType as "monthly_fee" | "enrollment_fee" | "exam_fee" | "exit_fee" : undefined;
  const csv = await exportBillingCsv({ status: rawStatus && statuses.has(rawStatus) ? rawStatus : undefined, competence: competence && /^\d{4}-\d{2}$/.test(competence) ? competence : undefined, student: url.searchParams.get("student") ?? undefined, trainingClass: url.searchParams.get("trainingClass") ?? undefined, type });
  return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="financeiro-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
