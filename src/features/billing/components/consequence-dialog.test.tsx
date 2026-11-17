import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { ConsequenceDialog } from "./consequence-dialog";
import { ConfirmationForm } from "./confirmation-form";

describe("ConsequenceDialog", () => {
  const props = { trigger: <Button>Revisar</Button>, title: "Confirmar pagamento", summary: [{ label: "Aluno", value: "Ana Souza" }, { label: "Valor", value: "R$ 150,00" }], effect: "A cobrança será marcada como paga.", confirmLabel: "Confirmar" };
  it("mostra o resumo e cancelar não chama a ação", () => {
    const action = vi.fn();
    render(<ConsequenceDialog {...props} action={action} />);
    fireEvent.click(screen.getByText("Revisar"));
    expect(screen.getByText("Ana Souza")).toBeVisible();
    expect(screen.getByText("R$ 150,00")).toBeVisible();
    expect(screen.getByText(props.effect)).toBeVisible();
    fireEvent.click(screen.getByText("Cancelar"));
    expect(action).not.toHaveBeenCalled();
  });
  it("bloqueia duplo envio enquanto a ação está pendente", async () => {
    let finish!: () => void;
    const action = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<ConsequenceDialog {...props} action={action} />);
    fireEvent.click(screen.getByText("Revisar"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Enviando…" }).closest("form")!);
    expect(action).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
  it("exige motivo com conteúdo e não somente espaços", async () => {
    const action = vi.fn();
    render(<ConsequenceDialog {...props} action={action}><label>Motivo<input name="reason" required minLength={3} /></label></ConsequenceDialog>);
    fireEvent.click(screen.getByText("Revisar"));
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("button", { name: "Confirmar" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Preencha"));
    expect(action).not.toHaveBeenCalled();
  });
  it("submissão por teclado exige confirmação e usa o valor revisado do formulário", async () => {
    const action = vi.fn();
    render(<ConfirmationForm id="payment-form" aria-label="Pagamento"><label>Valor<input name="amount_reais" defaultValue="150.00" required /></label><ConsequenceDialog {...props} summary={[{ label: "Valor recebido", value: "R$ 150,00", field: "amount_reais", kind: "money" }]} formId="payment-form" action={action} /></ConfirmationForm>);
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "175.00" } });
    fireEvent.submit(screen.getByRole("form", { name: "Pagamento" }));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText(/175,00/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][0].get("amount_reais")).toBe("175.00");
  });
});
