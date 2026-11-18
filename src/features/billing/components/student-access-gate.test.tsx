import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPathname = vi.fn<() => string>();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

import { StudentAccessGate } from "@/features/billing/components/student-access-gate";

describe("StudentAccessGate", () => {
  beforeEach(() => {
    mockPathname.mockReset().mockReturnValue("/aluno/frequencia");
  });

  it("bloqueia áreas comuns do aluno adulto quando o ciclo de 30 dias expira e direciona ao financeiro", () => {
    render(
      <StudentAccessGate
        isMinor={false}
        locked
        accessStatus="locked"
        accessValidUntil="2026-11-10"
        daysRemaining={-8}
        parqStatus="valid"
      >
        <div>Conteúdo bloqueado</div>
      </StudentAccessGate>
    );

    expect(screen.getByText(/Ciclo mensal expirado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Regularizar no Financeiro/ })).toHaveAttribute(
      "href",
      "/aluno/financeiro"
    );
    expect(screen.queryByText("Conteúdo bloqueado")).not.toBeInTheDocument();
  });

  it("mantém /aluno/financeiro e /aluno/parq liberados para o aluno adulto regularizar", () => {
    mockPathname.mockReturnValue("/aluno/financeiro");
    render(
      <StudentAccessGate
        isMinor={false}
        locked
        accessStatus="locked"
        accessValidUntil="2026-11-10"
        daysRemaining={-8}
        parqStatus="valid"
      >
        <div>Tela do financeiro</div>
      </StudentAccessGate>
    );

    expect(screen.getByText("Tela do financeiro")).toBeInTheDocument();
    expect(
      screen.getByText(/Acesso às demais áreas pausado até a regularização mensal/)
    ).toBeInTheDocument();
  });

  it("mostra tela neutra sem nenhum dado financeiro para aluno menor bloqueado", () => {
    render(
      <StudentAccessGate
        isMinor
        locked
        accessStatus="locked"
        parqStatus="valid"
      >
        <div>Conteúdo do menor</div>
      </StudentAccessGate>
    );

    expect(screen.getByText("Acesso temporariamente pausado")).toBeInTheDocument();
    expect(screen.getByText(/Peça ao seu responsável/)).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo do menor")).not.toBeInTheDocument();
    expect(screen.queryByText(/PIX/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Financeiro/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it("mostra aviso de PAR-Q vencido quando acesso está liberado", () => {
    render(
      <StudentAccessGate
        isMinor={false}
        locked={false}
        accessStatus="active"
        accessValidUntil="2026-12-01"
        daysRemaining={13}
        parqStatus="expired"
      >
        <div>Conteúdo liberado</div>
      </StudentAccessGate>
    );

    expect(screen.getByText("Conteúdo liberado")).toBeInTheDocument();
    expect(screen.getByText("Hora de renovar seu questionário de saúde")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Responder agora/ })).toHaveAttribute(
      "href",
      "/aluno/parq"
    );
  });
});
