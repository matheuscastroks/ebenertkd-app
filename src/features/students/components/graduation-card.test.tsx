import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GraduationCard } from "./graduation-card";

describe("graduação simples", () => {
  it("mostra faixa, próximo objetivo, forma e frequência", () => {
    render(<GraduationCard rankKey="gub-8" attendanceRate={85} />);
    expect(screen.getByText("Próxima faixa").nextElementSibling).toHaveTextContent("Ponta Verde");
    expect(screen.getByText("Poomsae atual").nextElementSibling).toHaveTextContent("Taegeuk Il Jang");
    expect(screen.getByText("Frequência para o exame").nextElementSibling).toHaveTextContent("85%");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("na última graduação habilitada não inventa uma próxima faixa", () => {
    render(<GraduationCard rankKey="dan-3" attendanceRate={90} />);
    expect(screen.getByText("Preta 3º Dan")).toBeInTheDocument();
    expect(screen.queryByText("Próxima faixa")).not.toBeInTheDocument();
    expect(screen.queryByText("Frequência para o exame")).not.toBeInTheDocument();
  });
  it("mantém os critérios do exame recolhidos até o aluno pedir", async () => {
    render(<GraduationCard rankKey="gub-10" />);
    const details = screen.getByText("Como funciona o exame").closest("details");
    expect(details).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("Como funciona o exame"));
    expect(details).toHaveAttribute("open");
  });
});
