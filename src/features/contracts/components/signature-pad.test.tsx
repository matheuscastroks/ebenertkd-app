import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SignaturePad } from "./signature-pad";

vi.mock("@/app/actions/contract-signature", () => ({ signContractAction: vi.fn() }));

it("oferece assinatura por nome sem exigir desenho no canvas", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ scale: vi.fn() } as unknown as CanvasRenderingContext2D);
  render(<SignaturePad contractId="c1" content="Contrato" />);
  expect(screen.getByRole("img", { name: "Área para desenhar sua assinatura" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Assinar contrato agora" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Ou assine digitando seu nome completo"), { target: { value: "Ana Souza" } });
  expect(screen.getByRole("button", { name: "Assinar contrato agora" })).toBeEnabled();
  expect(screen.getByText(/O nome digitado substitui o desenho/)).toBeVisible();
  vi.restoreAllMocks();
});
