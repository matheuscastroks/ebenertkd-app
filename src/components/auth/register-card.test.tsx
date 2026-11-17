import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: vi.fn().mockResolvedValue(null) }));
vi.mock("@/app/actions/auth", () => ({ loginAdultAction: vi.fn(), loginMinorAction: vi.fn(), registerAdultAction: vi.fn(), requestRecoveryAction: vi.fn() }));
vi.mock("@/components/shared/operation-toast", () => ({ OperationToast: () => null }));
import HomePage from "@/app/page";
import RecoveryPage from "@/app/recuperar/page";
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
