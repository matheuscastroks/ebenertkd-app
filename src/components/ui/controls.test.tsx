import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Input } from "./input";
import { Card } from "./card";

describe("controles da fundação", () => {
  it("mantém botão e campo com altura e raio consistentes", () => {
    render(<><Button>Salvar</Button><Input aria-label="Nome" /></>);
    for (const control of [screen.getByRole("button"), screen.getByRole("textbox")]) {
      expect(control).toHaveClass("h-10", "rounded-xl");
      expect(control.className).not.toMatch(/transition-all/);
    }
  });
  it("mantém tamanhos compacto e extra compacto legíveis", () => {
    render(<><Button size="sm">Compacto</Button><Button size="xs">Extra</Button></>);
    expect(screen.getByText("Compacto")).toHaveClass("h-9", "text-sm");
    expect(screen.getByText("Extra")).toHaveClass("h-8", "text-sm");
  });
  it("separa cards por superfície e borda sem efeitos de profundidade", () => {
    const { container } = render(<Card>Conteúdo</Card>);
    expect(container.firstChild).toHaveClass("bg-card", "border", "border-border");
    expect((container.firstChild as HTMLElement).className).not.toMatch(/depth-|transition-all/);
  });
});
