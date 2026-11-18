import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GraduationCard } from "./graduation-card";

describe("graduação simples", () => {
  it("mostra faixa, próximo objetivo e frequência sem porcentagem até a preta", () => {
    render(<GraduationCard currentBelt="Amarela" gub={8} attendanceRate={85} />);
    expect(screen.getByText("Próxima faixa").nextElementSibling).toHaveTextContent("Ponta Verde");
    expect(screen.getByText("Frequência para o exame").nextElementSibling).toHaveTextContent("85%");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/Confederação/)).not.toBeInTheDocument();
  });
  it("reconhece preta e não inventa um próximo GUB", () => {
    render(<GraduationCard currentBelt="Preta 1º Dan" gub={0} />);
    expect(screen.getByText(/Graduação Dan/)).toBeInTheDocument();
    expect(screen.queryByText("Próxima faixa")).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });
  it("mantém os critérios do exame recolhidos até o aluno pedir", async () => {
    render(<GraduationCard currentBelt="Branca" gub={10} />);
    const details = screen.getByText("Como funciona o exame").closest("details");
    expect(details).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("Como funciona o exame"));
    expect(details).toHaveAttribute("open");
  });
});
