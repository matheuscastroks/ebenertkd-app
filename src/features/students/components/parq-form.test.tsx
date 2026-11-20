import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/parq", () => ({
  submitParqAction: vi.fn(),
}));

import { ParqForm } from "@/features/students/components/parq-form";
import type { ParqAssessment } from "@/features/students/parq-rules";

const emptyAssessment: ParqAssessment = {
  status: "missing",
  submissionId: null,
  signedAt: null,
  expiresAt: null,
  daysUntilExpiration: null,
  hasYesAnswer: false,
  requiresMedicalCertificate: false,
  yesQuestionNumbers: [],
  signerName: null,
  signerRole: null,
  answers: {},
};

describe("ParqForm (stepper)", () => {
  it("exibe uma pergunta por vez e permite avançar até o passo final de assinatura", () => {
    vi.useFakeTimers();
    render(
      <ParqForm
        studentName="Marina Lima"
        defaultSignerName="Marina Lima"
        assessment={emptyAssessment}
        canSign
        enrollmentHref="/aluno/matricula"
        todayBr="18/11/2026"
      />
    );

    expect(screen.getByText(/Pergunta 1 de 10 · Coração ou pressão/)).toBeInTheDocument();

    for (let step = 1; step <= 10; step++) {
      fireEvent.click(screen.getByRole("radio", { name: /^Não/ }));
      act(() => {
        vi.advanceTimersByTime(250);
      });
    }

    expect(screen.getByText(/Último passo · Revisar e assinar/)).toBeInTheDocument();
    expect(screen.getByText("Termo de responsabilidade")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar e assinar/ })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Ou digite seu nome completo para assinar/), {
      target: { value: "Marina Lima" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: /Confirmar e assinar/ })).toBeEnabled();
    vi.useRealTimers();
  });
});
