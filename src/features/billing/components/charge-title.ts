import { formatCompetence } from "@/features/billing/format-competence";
import type { Charge } from "@/features/billing/types";

export const chargeTypeLabels: Record<Charge["charge_type"], string> = { monthly_fee: "Mensalidade", enrollment_fee: "Taxa de matrícula", exam_fee: "Taxa de exame", exit_fee: "Taxa de saída" };

/** Título legível da cobrança: troca a competência crua ("2026-10") por "out/2026". */
export function chargeTitle(charge: Pick<Charge, "description" | "competence" | "charge_type">) {
  const readable = formatCompetence(charge.competence);
  const base = charge.description?.trim() || chargeTypeLabels[charge.charge_type] || "Cobrança";
  if (readable === "—") return base;
  if (!base.includes(charge.competence)) return base;
  const [before, after] = base.split(charge.competence, 2);
  const prefix = before.replace(/[\s·-]+$/, "");
  return `${prefix ? `${prefix} · ` : ""}${readable}${after ?? ""}`;
}
