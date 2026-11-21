import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Input } from "./input";
import { Card } from "./card";
import { Avatar, AvatarFallback } from "./avatar";

describe("controles da fundação", () => {
  it("mostra uma ilustração local quando o avatar não tem foto", () => {
    const { container } = render(<Avatar><AvatarFallback>AS</AvatarFallback></Avatar>);
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveClass("avatar-placeholder");
    expect(screen.getByText("AS")).toHaveClass("sr-only");
  });
  it("mantém botão e campo com altura e raio consistentes", () => {
    render(<><Button>Salvar</Button><Input aria-label="Nome" /></>);
    for (const control of [screen.getByRole("button"), screen.getByRole("textbox")]) {
      expect(control).toHaveClass("h-10", "rounded-xl");
      expect(control.className).not.toMatch(/transition-all/);
    }
  });
  it("distingue controles por superfície, mantendo foco visível sem borda", () => {
    render(<><Button variant="outline">Ação</Button><Input aria-label="Campo" /></>);
    for (const control of [screen.getByRole("button"), screen.getByRole("textbox")]) {
      expect(control).not.toHaveClass("border");
      expect(control).toHaveClass("bg-muted", "focus-visible:ring-3");
    }
  });
  it("mantém tamanhos compacto e extra compacto legíveis", () => {
    render(<><Button size="sm">Compacto</Button><Button size="xs">Extra</Button></>);
    expect(screen.getByText("Compacto")).toHaveClass("h-9", "text-sm");
    expect(screen.getByText("Extra")).toHaveClass("h-8", "text-sm");
  });
  it("separa cards pela superfície sem borda externa", () => {
    const { container } = render(<Card>Conteúdo</Card>);
    expect(container.firstChild).toHaveClass("bg-card");
    expect(container.firstChild).not.toHaveClass("border");
    expect((container.firstChild as HTMLElement).className).not.toMatch(/depth-|transition-all/);
  });
});
