import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: vi.fn().mockResolvedValue(null) }));
vi.mock("@/app/actions/auth", () => ({ loginAdultAction: vi.fn(), loginMinorAction: vi.fn(), registerAdultAction: vi.fn(), requestRecoveryAction: vi.fn(), confirmRecoveryAction: vi.fn() }));
vi.mock("@/components/shared/operation-toast", () => ({ OperationToast: () => null }));
import HomePage from "@/app/page";
import RecoveryPage from "@/app/recuperar/page";
import ConfirmRecoveryPage from "@/app/recuperar/confirmar/page";
it("usa mensagem simples para cadastro indisponivel", async () => {
 render(await HomePage({ searchParams: Promise.resolve({ context: "cadastro", error: "setup_required" }) }));
 expect(screen.getByRole("alert")).toHaveTextContent("Cadastro indisponível no momento. Fale com a academia.");
 expect(screen.queryByText(/Appwrite/)).toBeNull();
});
it("recuperacao possui um titulo unico", async () => {
 render(await RecoveryPage({ searchParams: Promise.resolve({}) }));
 expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Recuperar senha");
 expect(screen.queryByText("Solicitar redefinição")).toBeNull();
});
it("erro de login persiste como alerta na aba Entrar", async () => {
 render(await HomePage({ searchParams: Promise.resolve({ context: "adult", error: "invalid_credentials", message: "E-mail ou senha incorretos." }) }));
 expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Acesse sua conta");
 expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
 expect(screen.getByRole("tab", { name: "Entrar" })).toHaveAttribute("aria-selected", "true");
});
it("entrada mantém recuperação e privacidade, sem ícones decorativos expostos", async () => {
 const { container } = render(await HomePage({ searchParams: Promise.resolve({}) }));
 expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/recuperar");
 expect(screen.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacidade");
 for (const svg of container.querySelectorAll("svg")) expect(svg).toHaveAttribute("aria-hidden", "true");
 for (const image of container.querySelectorAll("img")) expect(image).toHaveAttribute("alt", "");
});
it("recuperacao oferece retorno para a entrada", async () => {
 render(await RecoveryPage({ searchParams: Promise.resolve({}) }));
 expect(screen.getByRole("link", { name: "Voltar para entrar" })).toHaveAttribute("href", "/");
 expect(screen.getByRole("button", { name: "Enviar link" })).toBeInTheDocument();
});
it("link de redefinicao invalido leva a um novo pedido", async () => {
 render(await ConfirmRecoveryPage({ searchParams: Promise.resolve({ error: "invalid" }) }));
 expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Link expirado");
 expect(screen.getByRole("link", { name: "Pedir novo link" })).toHaveAttribute("href", "/recuperar");
});
