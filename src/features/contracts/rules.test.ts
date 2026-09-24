import { describe, expect, it } from "vitest";
import { canSignContract, hashContent, privacyIpFingerprint, renderContractTemplate, renewalEvent } from "@/features/contracts/rules";
import { calculateExitFee, requiresRematricula } from "@/lib/domain/billing-rules";

describe("contract templates", () => {
  it("renders only the documented variables and produces a stable hash", () => {
    const rendered = renderContractTemplate("Aluno: {{ student.full_name }}", { "student.full_name": "Ana Silva" });
    expect(rendered).toBe("Aluno: Ana Silva");
    expect(hashContent(rendered)).toBe(hashContent(rendered));
    expect(() => renderContractTemplate("{{ student.password }}", {})).toThrow("unknown_contract_variable");
  });

  it("reduces an IP address before fingerprinting it", () => {
    expect(privacyIpFingerprint("192.168.20.10")).toBe(privacyIpFingerprint("192.168.20.99"));
  });

  it("keeps an emitted snapshot unchanged when the template changes", () => {
    const emitted = renderContractTemplate("Aluno: {{ student.full_name }}", { "student.full_name": "Ana" });
    renderContractTemplate("Novo modelo para {{ student.full_name }}", { "student.full_name": "Ana" });
    expect(emitted).toBe("Aluno: Ana");
  });
});

describe("signature authorization", () => {
  it("allows an adult to sign their own contract and denies a minor", () => {
    expect(canSignContract({ role: "adult_student", actorProfileId: "student", studentProfileId: "student", capabilities: ["student"], studentAccessGranted: true })).toBe(true);
    expect(canSignContract({ role: "minor_student", actorProfileId: "student", studentProfileId: "student", capabilities: ["student"], studentAccessGranted: true })).toBe(false);
  });

  it("requires guardian capability and an authorized student link", () => {
    expect(canSignContract({ role: "guardian", actorProfileId: "guardian", studentProfileId: "student", capabilities: ["guardian"], studentAccessGranted: true })).toBe(true);
    expect(canSignContract({ role: "guardian", actorProfileId: "guardian", studentProfileId: "student", capabilities: ["guardian"], studentAccessGranted: false })).toBe(false);
  });
});

describe("renewal rules", () => {
  it("emits reminders at 30 and 7 days and expiration after the end", () => {
    expect(renewalEvent("2027-01-31", "2027-01-01")).toEqual({ kind: "reminder", days: 30 });
    expect(renewalEvent("2027-01-31", "2027-01-24")).toEqual({ kind: "reminder", days: 7 });
    expect(renewalEvent("2027-01-31", "2027-02-01")?.kind).toBe("expired");
  });
});

describe("cancellation boundaries", () => {
  it("handles day 20/21 and year rollover", () => {
    expect(calculateExitFee({ targetExitMonth: "2027-01-01", noticeDate: "2026-12-20", monthlyFeeInCents: 18000 })).toBe(0);
    expect(calculateExitFee({ targetExitMonth: "2027-01-01", noticeDate: "2026-12-21", monthlyFeeInCents: 18000 })).toBe(18000);
  });

  it("does not charge rematriculation at exactly six months", () => {
    expect(requiresRematricula({ lastActiveDate: "2026-01-15", returnDate: "2026-07-15" })).toBe(false);
    expect(requiresRematricula({ lastActiveDate: "2026-01-15", returnDate: "2026-07-16" })).toBe(true);
  });
});
