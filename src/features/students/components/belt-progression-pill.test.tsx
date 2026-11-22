import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BeltProgressionPill } from "@/features/students/components/belt-progression-pill";

describe("BeltProgressionPill", () => {
  it("renders a single graduation with only belt mini and level", () => {
    render(<BeltProgressionPill toRankKey="gub-8" />);
    expect(screen.queryByText("Amarela")).not.toBeInTheDocument();
    expect(screen.getByText("8º Gub")).toBeInTheDocument();
  });

  it("renders progression from the current graduation to the target", () => {
    render(<BeltProgressionPill fromRankKey="gub-10" toRankKey="gub-9" />);
    expect(screen.getByText("10º Gub")).toBeInTheDocument();
    expect(screen.getByText("9º Gub")).toBeInTheDocument();
    expect(screen.queryByText("Branca")).not.toBeInTheDocument();
    expect(screen.queryByText("Ponta Amarela")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Progressão de faixa: Branca, 10º Gub para Ponta Amarela, 9º Gub/)).toBeInTheDocument();
  });

  it("renders the progression to the first Dan", () => {
    render(<BeltProgressionPill fromRankKey="gub-1" toRankKey="dan-1" />);
    expect(screen.getByText("1º Gub")).toBeInTheDocument();
    expect(screen.getByText("1º Dan")).toBeInTheDocument();
    expect(screen.queryByText("Ponta Preta")).not.toBeInTheDocument();
    expect(screen.queryByText("Preta")).not.toBeInTheDocument();
  });

  it("preserves the historical snapshot name in accessibility labels without displaying color names", () => {
    render(<BeltProgressionPill fromRankKey="gub-9" toRankKey="gub-8" fromName="Nome antigo" toName="Outro nome antigo" />);
    expect(screen.queryByText("Nome antigo")).not.toBeInTheDocument();
    expect(screen.queryByText("Outro nome antigo")).not.toBeInTheDocument();
    expect(screen.queryByText("Ponta Amarela")).not.toBeInTheDocument();
    expect(screen.getByText("9º Gub")).toBeInTheDocument();
    expect(screen.getByText("8º Gub")).toBeInTheDocument();
    expect(screen.getByLabelText(/Progressão de faixa: Nome antigo, 9º Gub para Outro nome antigo, 8º Gub/)).toBeInTheDocument();
  });

  it("handles missing graduation gracefully", () => {
    render(<BeltProgressionPill />);
    expect(screen.getByText("Não informada")).toBeInTheDocument();
  });
});
