import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BeltBadge } from "@/features/students/components/belt-badge";

describe("BeltBadge", () => {
  it("renders with correct belt name and GUB", () => {
    render(<BeltBadge belt="Amarela" gub={8} />);
    expect(screen.getByText("Faixa Amarela")).toBeInTheDocument();
    expect(screen.getByText("8º GUB")).toBeInTheDocument();
  });

  it("infers belt from GUB when belt is not provided", () => {
    render(<BeltBadge gub={4} />);
    expect(screen.getByText("Faixa Azul")).toBeInTheDocument();
    expect(screen.getByText("4º GUB")).toBeInTheDocument();
  });

  it("renders black belt with distinct styling", () => {
    render(<BeltBadge belt="Preta" showGub={false} />);
    expect(screen.getByText("Faixa Preta")).toBeInTheDocument();
  });

  it("handles unknown or missing belt gracefully", () => {
    render(<BeltBadge />);
    expect(screen.getByText("Faixa Não informada")).toBeInTheDocument();
  });
});
