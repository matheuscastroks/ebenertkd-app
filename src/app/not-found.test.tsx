import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { resolveAcademyIdentity } from "@/features/academy/identity-rules";
import { ROUTES } from "@/lib/navigation/routes";

const identity = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/features/academy/config-service", () => ({
  getAcademyIdentity: async () => identity.current
}));

import NotFound from "@/app/not-found";

describe("Root NotFound (404)", () => {
  it("renderiza aviso 404 e link para voltar ao início", async () => {
    identity.current = resolveAcademyIdentity(null);
    render(await NotFound());

    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByText("Erro 404")).toBeInTheDocument();
    expect(
      screen.getByText(/O endereço que você tentou acessar não existe/i)
    ).toBeInTheDocument();

    const homeLink = screen.getByRole("link", { name: "Voltar para o início" });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", ROUTES.home);
  });
});
