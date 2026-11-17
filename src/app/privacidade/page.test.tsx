import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "@/app/privacidade/page";
import { PRIVACY_PLACEHOLDER, PRIVACY_SECTIONS } from "@/features/privacy/privacy-policy-content";
import { ROUTES } from "@/lib/navigation/routes";

describe("Política de Privacidade", () => {
  it("renderiza título, vigência e todas as seções", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeInTheDocument();
    expect(screen.getByText("17 de novembro de 2026")).toBeInTheDocument();
    for (const section of PRIVACY_SECTIONS) {
      expect(screen.getByRole("heading", { level: 2, name: section.title })).toBeInTheDocument();
    }
  });

  it("cobre os temas exigidos pela LGPD", () => {
    render(<PrivacyPolicyPage />);
    const ids = PRIVACY_SECTIONS.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["controlador", "dados", "finalidades", "criancas", "compartilhamento", "retencao", "direitos", "seguranca", "cookies"]));
    expect(screen.getAllByText(/Frankfurt/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/exclusão de conta disponível em Configurações/).length).toBeGreaterThan(0);
  });

  it("marca claramente os campos pendentes do controlador", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getAllByText((text) => text.includes(PRIVACY_PLACEHOLDER)).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("privacy-pending").length).toBeGreaterThan(0);
  });

  it("expõe a rota pública /privacidade e link de retorno", () => {
    expect(ROUTES.privacy).toBe("/privacidade");
    render(<PrivacyPolicyPage />);
    expect(screen.getAllByRole("link", { name: /Voltar ao início/ })[0]).toHaveAttribute("href", "/");
  });
});
