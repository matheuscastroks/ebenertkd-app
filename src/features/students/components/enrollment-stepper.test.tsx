import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnrollmentStepper } from "./enrollment-stepper";
it("informa passo atual e progresso acessível", () => {
  render(<EnrollmentStepper current={1} steps={[{ id: "pessoais", title: "Dados pessoais", isValid: true }, { id: "saude", title: "Saúde", isValid: false }, { id: "treino", title: "Treino", isValid: false }, { id: "documentos", title: "Documentos", isValid: false }]} />);
  expect(screen.getByText("Passo 2 de 4 · Saúde")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
});
