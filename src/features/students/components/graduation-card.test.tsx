import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GraduationCard } from "./graduation-card";

describe("graduação simples", () => {
  it("mostra faixa, próximo objetivo e frequência sem porcentagem até a preta", () => {
    render(<GraduationCard currentBelt="Amarela" gub={8} attendanceRate={85} />);
    expect(screen.getByText(/Próximo: Faixa Ponta Verde/)).toBeInTheDocument();
    expect(screen.getByText(/Frequência para o exame: 85%/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/Confederação/)).not.toBeInTheDocument();
  });
  it("reconhece preta e não inventa um próximo GUB", () => {
    render(<GraduationCard currentBelt="Preta 1º Dan" gub={0} />);
    expect(screen.getByText(/Graduação Dan/)).toBeInTheDocument();
    expect(screen.queryByText(/Próximo:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });
});
