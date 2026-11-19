import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ACADEMY_IDENTITY } from "@/features/academy/defaults";
import { resolveAcademyIdentity } from "@/features/academy/identity-rules";
import { buildPrivacySections, PRIVACY_SECTIONS } from "@/features/privacy/privacy-policy-content";
import { ROUTES } from "@/lib/navigation/routes";

const identity = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/features/academy/config-service", () => ({ getAcademyIdentity: async () => identity.current }));

import PrivacyPolicyPage from "@/app/privacidade/page";

async function renderPage(row: Parameters<typeof resolveAcademyIdentity>[0] = null) {
  identity.current = resolveAcademyIdentity(row);
  render(await PrivacyPolicyPage());
}

describe("Política de Privacidade", () => {
  it("renderiza título, vigência e todas as seções", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeInTheDocument();
    expect(screen.getByText("17 de novembro de 2026")).toBeInTheDocument();
    for (const section of PRIVACY_SECTIONS) {
      expect(screen.getByRole("heading", { level: 2, name: section.title })).toBeInTheDocument();
    }
  });

  it("cobre os temas exigidos pela LGPD", async () => {
    await renderPage();
    const ids = PRIVACY_SECTIONS.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["controlador", "dados", "finalidades", "criancas", "compartilhamento", "retencao", "direitos", "seguranca", "cookies"]));
    expect(screen.getAllByText(/Frankfurt/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/exclusão de conta disponível em Configurações/).length).toBeGreaterThan(0);
  });

  it("não exibe campos pendentes: texto genérico com nome da academia e um contato", async () => {
    await renderPage({ legal_name: "Academia Dragão Ltda", display_name: "Dragão TKD", privacy_contact: "privacidade@dragao.test" });
    expect(screen.queryByTestId("privacy-pending")).not.toBeInTheDocument();
    expect(screen.queryByText(/A PREENCHER/)).not.toBeInTheDocument();
    expect(screen.getByText(/O controlador dos seus dados pessoais é a Dragão TKD/)).toBeInTheDocument();
    expect(screen.getByText("Nome: Academia Dragão Ltda")).toBeInTheDocument();
    expect(screen.getByText("Contato para assuntos de privacidade: privacidade@dragao.test")).toBeInTheDocument();
  });

  it("CNPJ, endereço e DPO são opcionais e só aparecem quando informados", () => {
    const bare = JSON.stringify(buildPrivacySections(DEFAULT_ACADEMY_IDENTITY));
    expect(bare).not.toContain("Documento:");
    expect(bare).not.toContain("Endereço:");
    expect(bare).not.toContain("DPO");
    const full = JSON.stringify(buildPrivacySections({ ...DEFAULT_ACADEMY_IDENTITY, document_type: "cnpj", document_number: "11222333000181", address_line: "Rua A, 10", dpo_name: "Maria" }));
    expect(full).toContain("CNPJ 11.222.333/0001-81");
    expect(full).toContain("Endereço: Rua A, 10");
    expect(full).toContain("Maria");
  });

  it("expõe a rota pública /privacidade e link de retorno", async () => {
    expect(ROUTES.privacy).toBe("/privacidade");
    await renderPage();
    expect(screen.getAllByRole("link", { name: /Voltar ao início/ })[0]).toHaveAttribute("href", "/");
  });
});
