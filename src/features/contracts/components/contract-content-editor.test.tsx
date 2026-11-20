import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { ContractContentEditor } from "./contract-content-editor";

it("insere a variável escolhida no ponto do cursor", async () => {
  const user = userEvent.setup();
  render(<ContractContentEditor content="Aluno: . Fim." variables={[{ ptKey: "aluno.nome_completo", label: "Nome do aluno", description: "Nome completo" }]} />);
  const field = screen.getByLabelText("Conteúdo e cláusulas") as HTMLTextAreaElement;
  field.setSelectionRange(7, 7);
  fireEvent.select(field);
  await user.click(screen.getByRole("button", { name: /Inserir variável/ }));
  await user.click(await screen.findByRole("button", { name: /Nome do aluno/ }));
  expect(field.value).toBe("Aluno: {{ aluno.nome_completo }}. Fim.");
});
