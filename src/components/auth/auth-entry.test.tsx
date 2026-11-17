import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/actions/auth", () => ({ loginAdultAction: vi.fn(), loginMinorAction: vi.fn(), registerAdultAction: vi.fn() }));
vi.mock("@/components/shared/operation-toast", () => ({ OperationToast: () => null }));
import { AuthEntry } from "./auth-entry";
import { LoginCard } from "./login-card";
import { RegisterCard } from "./register-card";

describe("Acesso acessivel", () => {
  it("abas de entrada e cadastro respondem ao teclado", async () => {
    const user = userEvent.setup();
    render(<AuthEntry />);
    const tab = screen.getByRole("tab", { name: "Entrar" });
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    tab.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Criar conta" })).toHaveAttribute("aria-selected", "true");
  });
  it("abre o acesso de aluno menor", async () => {
    const user = userEvent.setup(); render(<AuthEntry />);
    await user.click(screen.getByRole("button", { name: "Sou aluno menor de idade" }));
    expect(screen.getByLabelText("Nome de usuário")).toBeVisible();
  });
  it("erro permanece associado aos campos", () => {
    render(<LoginCard type="adult" errorMessage="Senha incorreta" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Senha incorreta");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-describedby", "login-error-adult");
    expect(screen.getByRole("button", { name: "Ver senha" })).toHaveClass("size-11");
  });
  it("confirmacao deve corresponder a senha", async () => {
    const user = userEvent.setup(); render(<RegisterCard />);
    const password = screen.getByLabelText("Senha de acesso");
    const confirm = screen.getByLabelText("Confirmar senha");
    expect(confirm).toBeRequired();
    await user.type(password, "Senha1234"); await user.type(confirm, "outra123");
    expect(confirm).toBeInvalid();
    await user.clear(confirm); await user.type(confirm, "Senha1234"); expect(confirm).toBeValid();
  });
  it("acesso do menor explica como recuperar a senha", async () => {
    const user = userEvent.setup(); render(<AuthEntry />);
    await user.click(screen.getByRole("button", { name: "Sou aluno menor de idade" }));
    expect(screen.getByRole("heading", { name: "Acesso do aluno menor" })).toBeVisible();
    expect(screen.getByText("Esqueceu a senha? Peça uma nova ao professor.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Esqueci minha senha" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Entrar com e-mail" }));
    expect(screen.getByLabelText("E-mail")).toBeVisible();
  });
  it("erro do menor reabre o acesso do menor com alerta", () => {
    render(<AuthEntry minorError="Usuário ou senha incorretos." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Usuário ou senha incorretos.");
    expect(screen.getByLabelText("Nome de usuário")).toHaveAttribute("aria-describedby", "login-error-minor");
  });
  it("depois do cadastro abre a aba Entrar", () => {
    render(<AuthEntry registered />);
    expect(screen.getByRole("tab", { name: "Entrar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("E-mail")).toBeVisible();
  });
  it("erro de cadastro abre a aba Criar conta", () => {
    render(<AuthEntry registrationError="Revise os dados." />);
    expect(screen.getByRole("tab", { name: "Criar conta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Revise os dados.");
  });
  it("perfil de cadastro mostra as duas opções visíveis", async () => {
    const user = userEvent.setup(); render(<RegisterCard />);
    const student = screen.getByRole("radio", { name: /Aluno/ });
    const guardian = screen.getByRole("radio", { name: /Responsável/ });
    expect(student).toBeChecked();
    expect(student).toHaveAttribute("value", "adult_student");
    expect(guardian).toHaveAttribute("value", "guardian");
    await user.click(guardian);
    expect(guardian).toBeChecked();
  });
});
