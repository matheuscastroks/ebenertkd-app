import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BeltProgressionPill } from "@/features/students/components/belt-progression-pill";

describe("BeltProgressionPill", () => {
  it("renders a single graduation", () => {
    render(<BeltProgressionPill toRankKey="gub-8" />);
    expect(screen.getByText("Amarela")).toBeInTheDocument();
    expect(screen.getByText("8º Gub")).toBeInTheDocument();
  });

  it("renders progression from the current graduation to the target", () => {
    render(<BeltProgressionPill fromRankKey="gub-10" toRankKey="gub-9" />);
    expect(screen.getByText("Branca")).toBeInTheDocument();
    expect(screen.getByText("10º Gub")).toBeInTheDocument();
    expect(screen.getByText("Ponta Amarela")).toBeInTheDocument();
    expect(screen.getByText("9º Gub")).toBeInTheDocument();
    expect(screen.getByLabelText(/Progressão de faixa: Branca, 10º Gub para Ponta Amarela, 9º Gub/)).toBeInTheDocument();
  });

  it("renders the progression to the first Dan", () => {
    render(<BeltProgressionPill fromRankKey="gub-1" toRankKey="dan-1" />);
    expect(screen.getByText("Ponta Preta")).toBeInTheDocument();
    expect(screen.getByText("Preta")).toBeInTheDocument();
    expect(screen.getByText("1º Dan")).toBeInTheDocument();
  });

  it("shows the name recorded in the history instead of the current configured name", () => {
    render(<BeltProgressionPill fromRankKey="gub-9" toRankKey="gub-8" fromName="Nome antigo" toName="Outro nome antigo" />);
    expect(screen.getByText("Nome antigo")).toBeInTheDocument();
    expect(screen.getByText("Outro nome antigo")).toBeInTheDocument();
    expect(screen.queryByText("Ponta Amarela")).not.toBeInTheDocument();
  });

  it("handles missing graduation gracefully", () => {
    render(<BeltProgressionPill />);
    expect(screen.getByText("Não informada")).toBeInTheDocument();
  });
});
