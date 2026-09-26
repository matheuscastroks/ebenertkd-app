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

  it("renders White belt (10º GUB) correctly", () => {
    render(<BeltBadge belt="Branca" gub={10} />);
    expect(screen.getByText("Faixa Branca")).toBeInTheDocument();
    expect(screen.getByText("10º GUB")).toBeInTheDocument();
  });

  it("renders Yellow Tip (9º GUB) and Black Tip (1º GUB) correctly", () => {
    render(<BeltBadge belt="Ponta Amarela" gub={9} />);
    expect(screen.getByText("Faixa Ponta Amarela")).toBeInTheDocument();
    expect(screen.getByText("9º GUB")).toBeInTheDocument();
  });

  it("handles unknown or missing belt gracefully", () => {
    render(<BeltBadge />);
    expect(screen.getByText("Faixa Não informada")).toBeInTheDocument();
  });

  it("treats Preta and Preta 1º Dan as identical 1st Dan black belt", () => {
    const { unmount } = render(<BeltBadge belt="Preta" />);
    expect(screen.getByText("Faixa Preta")).toBeInTheDocument();
    expect(screen.getByText("1º Dan")).toBeInTheDocument();
    unmount();

    render(<BeltBadge belt="Preta 1º Dan" />);
    expect(screen.getByText("Faixa Preta")).toBeInTheDocument();
    expect(screen.getByText("1º Dan")).toBeInTheDocument();
  });
});
