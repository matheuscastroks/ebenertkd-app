import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GraduationCard } from "@/features/students/components/graduation-card";

describe("GraduationCard", () => {
  it("renders student belt and evolution towards black belt", () => {
    render(
      <GraduationCard
        currentBelt="Amarela"
        gub={8}
        startedAtTkd="2025-01-15T00:00:00.000Z"
        attendanceRate={85}
      />
    );

    expect(screen.getByText("Jornada de Graduação")).toBeInTheDocument();
    expect(screen.getByText("8º GUB · Confederação Brasileira de Taekwondo")).toBeInTheDocument();
    expect(screen.getByText("Próximo objetivo:")).toBeInTheDocument();
    expect(screen.getByText(/Faixa Ponta Verde/)).toBeInTheDocument();
    expect(screen.getByText(/85% · Apto para exame/)).toBeInTheDocument();
  });

  it("handles black belt graduation without next step", () => {
    render(<GraduationCard currentBelt="Preta" gub={0} />);
    expect(screen.getByText("Grau de Mestre / Faixa Preta (Dan)")).toBeInTheDocument();
    expect(screen.getByText("100% concluído")).toBeInTheDocument();
  });
});
