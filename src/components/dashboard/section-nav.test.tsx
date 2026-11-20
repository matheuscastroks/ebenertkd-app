import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/admin/financeiro/fechamento" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { BackLink, NavItemsProvider, SectionSegments } from "@/components/dashboard/section-nav";
import { navigationForProfile } from "@/lib/navigation/routes";

const items = navigationForProfile({ role: "admin", capabilities: ["admin"] });
const renderSegments = () => render(<NavItemsProvider items={items}><SectionSegments /></NavItemsProvider>);

describe("SectionSegments", () => {
  it("mostra os segmentos da seção como links e marca o atual", () => {
    pathname.value = "/admin/financeiro/fechamento";
    renderSegments();
    const nav = screen.getByRole("navigation", { name: "Seções de Financeiro" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fechamento" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Cobranças" })).toHaveAttribute("href", "/admin/financeiro");
    expect(screen.getByRole("link", { name: "Cobranças" })).not.toHaveAttribute("aria-current");
  });

  it("some nas telas de detalhe e em seções de um segmento só", () => {
    pathname.value = "/admin/financeiro/reajuste/c1";
    const { container, unmount } = renderSegments();
    expect(container).toBeEmptyDOMElement();
    unmount();
    pathname.value = "/admin/relatorios/anual";
    expect(renderSegments().container).toBeEmptyDOMElement();
  });
});

describe("BackLink", () => {
  it("volta para a tela anterior com rótulo acessível", () => {
    render(<BackLink label="Alunos" href="/admin/matriculas" />);
    expect(screen.getByRole("link", { name: "Voltar para Alunos" })).toHaveAttribute("href", "/admin/matriculas");
  });
});
