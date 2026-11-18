import { describe, expect, it } from "vitest";
import {
  canSignParq,
  computeParqExpirationDate,
  evaluateParqStatus,
  PARQ_QUESTIONS,
  PARQ_RESPONSIBILITY_TERM,
  validateParqAnswers,
} from "@/features/students/parq-rules";
import type { ParqSubmission } from "@/features/students/types";

const allNoAnswers = {
  q1: "no",
  q2: "no",
  q3: "no",
  q4: "no",
  q5: "no",
  q6: "no",
  q7: "no",
  q8: "no",
  q9: "no",
  q10: "no",
} as const;

const makeSubmission = (overrides: Partial<ParqSubmission> = {}): ParqSubmission => ({
  $id: "parq-1",
  $sequence: "1",
  $createdAt: "2026-01-01T12:00:00.000Z",
  $updatedAt: "2026-01-01T12:00:00.000Z",
  $permissions: [],
  $databaseId: "ebenertkd",
  $tableId: "parq_submissions",
  student_id: "student-1",
  signer_profile_id: "profile-1",
  signer_account_id: "acc-1",
  signer_name: "Ana Paula",
  signer_role: "adult_student",
  answers_json: JSON.stringify(allNoAnswers),
  has_yes_answer: false,
  requires_medical_certificate: false,
  term_accepted: true,
  signature_data_url: "data:image/png;base64,AAA",
  content_hash: "abc123",
  signed_at: "2026-06-01T12:00:00.000Z",
  expires_at: "2027-06-01T12:00:00.000Z",
  created_at: "2026-06-01T12:00:00.000Z",
  ...overrides,
});

describe("parq-rules", () => {
  it("define exatamente as 10 perguntas oficiais do CREF1 e o termo do Anexo II", () => {
    expect(PARQ_QUESTIONS).toHaveLength(10);
    expect(PARQ_QUESTIONS[0].text).toContain("problema de coração ou pressão arterial");
    expect(PARQ_QUESTIONS[9].text).toContain("comprometer sua saúde");
    expect(PARQ_RESPONSIBILITY_TERM).toContain("recomendável conversar com um médico");
  });

  it("valida as 10 respostas e sinaliza recomendação de atestado quando qualquer pergunta é Sim", () => {
    const clean = validateParqAnswers({ ...allNoAnswers });
    expect(clean.hasYesAnswer).toBe(false);
    expect(clean.requiresMedicalCertificate).toBe(false);
    expect(clean.yesQuestionNumbers).toEqual([]);

    const flagged = validateParqAnswers({ ...allNoAnswers, q2: "yes", q6: "yes" });
    expect(flagged.hasYesAnswer).toBe(true);
    expect(flagged.requiresMedicalCertificate).toBe(true);
    expect(flagged.yesQuestionNumbers).toEqual([2, 6]);

    expect(() => validateParqAnswers({ q1: "no" })).toThrow("parq_answer_required:q2");
  });

  it("calcula validade anual de 365 dias", () => {
    const expires = computeParqExpirationDate("2026-11-18T12:00:00.000Z");
    expect(expires.slice(0, 10)).toBe("2027-11-18");
  });

  it("classifica corretamente PAR-Q ausente, válido, vencendo em 30 dias e vencido", () => {
    expect(evaluateParqStatus(null, "2026-11-18").status).toBe("missing");

    const valid = evaluateParqStatus(
      makeSubmission({ signed_at: "2026-06-01T12:00:00.000Z", expires_at: "2027-06-01T12:00:00.000Z" }),
      "2026-11-18"
    );
    expect(valid.status).toBe("valid");
    expect(valid.daysUntilExpiration).toBeGreaterThan(30);

    const expiring = evaluateParqStatus(
      makeSubmission({ signed_at: "2025-12-01T12:00:00.000Z", expires_at: "2026-12-01T12:00:00.000Z" }),
      "2026-11-18"
    );
    expect(expiring.status).toBe("expiring_soon");
    expect(expiring.daysUntilExpiration).toBe(13);

    const expired = evaluateParqStatus(
      makeSubmission({
        signed_at: "2025-10-01T12:00:00.000Z",
        expires_at: "2026-10-01T12:00:00.000Z",
        answers_json: JSON.stringify({ ...allNoAnswers, q5: "yes" }),
        has_yes_answer: true,
        requires_medical_certificate: true,
      }),
      "2026-11-18"
    );
    expect(expired.status).toBe("expired");
    expect(expired.hasYesAnswer).toBe(true);
    expect(expired.yesQuestionNumbers).toEqual([5]);
  });

  it("impede menor de assinar o termo e libera adulto ou responsável vinculado", () => {
    expect(
      canSignParq({
        role: "minor_student",
        actorProfileId: "m1",
        studentProfileId: "m1",
        capabilities: ["student"],
        studentAccessGranted: true,
      })
    ).toBe(false);

    expect(
      canSignParq({
        role: "adult_student",
        actorProfileId: "a1",
        studentProfileId: "a1",
        capabilities: ["student"],
        studentAccessGranted: true,
      })
    ).toBe(true);

    expect(
      canSignParq({
        role: "guardian",
        actorProfileId: "g1",
        studentProfileId: "m1",
        capabilities: ["guardian"],
        studentAccessGranted: true,
      })
    ).toBe(true);
  });
});
