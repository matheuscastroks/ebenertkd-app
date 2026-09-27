import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BeltProgressionPill } from "@/features/students/components/belt-progression-pill";

describe("BeltProgressionPill", () => {
  it("renders single belt correctly", () => {
    render(<BeltProgressionPill belt="Amarela" gub={8} />);
    expect(screen.getByText("Faixa Amarela")).toBeInTheDocument();
    expect(screen.getByText("8º GUB")).toBeInTheDocument();
  });

  it("renders progression from current belt to target belt", () => {
    render(
      <BeltProgressionPill
        fromBelt="Branca"
        fromGub={10}
        toBelt="Ponta Amarela"
        toGub={9}
      />
    );
    expect(screen.getByText("Faixa Branca")).toBeInTheDocument();
    expect(screen.getByText("10º GUB")).toBeInTheDocument();
    expect(screen.getByText("Faixa Ponta Amarela")).toBeInTheDocument();
    expect(screen.getByText("9º GUB")).toBeInTheDocument();
  });

  it("renders black belt progression to 1º Dan", () => {
    render(
      <BeltProgressionPill
        fromBelt="Ponta Preta"
        fromGub={1}
        toBelt="Preta"
        toGub={0}
      />
    );
    expect(screen.getByText("Faixa Ponta Preta")).toBeInTheDocument();
    expect(screen.getByText("Faixa Preta")).toBeInTheDocument();
    expect(screen.getByText("1º Dan")).toBeInTheDocument();
  });

  it("handles missing belt information gracefully", () => {
    render(<BeltProgressionPill />);
    expect(screen.getByText("Faixa Não informada")).toBeInTheDocument();
  });
});
