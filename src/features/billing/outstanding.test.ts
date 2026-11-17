import { describe, expect, it } from "vitest";
import type { Charge } from "./types";
import { getOutstandingCharge, outstandingLabel } from "./outstanding";

const charge = (status: Charge["status"], due_date: string) => ({ status, due_date } as Charge);
describe("pendência financeira compartilhada", () => {
  it("inclui comprovante em análise sem tratá-lo como em dia", () => {
    const pending = charge("proof_under_review", "2026-11-05");
    expect(getOutstandingCharge([pending])).toBe(pending);
    expect(outstandingLabel(pending)).toBe("Comprovante em análise");
  });
  it("escolhe o vencimento mais próximo sem alterar a lista", () => {
    const later = charge("pending", "2026-12-05");
    const first = charge("overdue", "2026-11-05");
    const rows = [later, charge("paid", "2026-10-05"), first];
    expect(getOutstandingCharge(rows)).toBe(first);
    expect(rows[0]).toBe(later);
    expect(outstandingLabel(first)).toBe("Em atraso");
  });
  it("retorna undefined quando não há cobrança aberta", () => {
    expect(getOutstandingCharge([])).toBeUndefined();
    expect(getOutstandingCharge([charge("cancelled", "2026-11-05")])).toBeUndefined();
  });
});
