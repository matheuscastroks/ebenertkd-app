import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvatarGroup, avatarLift } from "@/components/shared/avatar-group";

const people = [
  { name: "Ana Silva" },
  { name: "Bruno Costa" },
  { name: "Clara Dias" },
  { name: "Diego Lima" },
  { name: "Eva Rocha" }
];

describe("AvatarGroup", () => {
  it("mostra o chip +N com os nomes ocultos no rótulo acessível", () => {
    render(<AvatarGroup people={people} max={3} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Mais 2 pessoas: Diego Lima, Eva Rocha" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ana Silva" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Diego Lima" })).not.toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("usa o total informado quando a lista é só uma amostra", () => {
    render(<AvatarGroup people={people.slice(0, 2)} max={4} total={7} />);
    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("não mostra chip quando todos cabem e não renderiza nada sem pessoas", () => {
    const { container, rerender } = render(<AvatarGroup people={people.slice(0, 2)} max={4} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    rerender(<AvatarGroup people={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calcula o decaimento da elevação pela distância", () => {
    expect(avatarLift(2, null)).toEqual({});
    expect(avatarLift(2, 2)).toEqual({ "--shift": "var(--avatar-lift)", "--scale-active": "var(--avatar-scale)", zIndex: 10 });
    expect(avatarLift(3, 2)).toEqual({ "--shift": "calc(var(--avatar-lift) * 0.45)" });
    expect(avatarLift(0, 2)).toEqual({ "--shift": "calc(var(--avatar-lift) * 0.2025)" });
  });

  it("aplica as variáveis ao passar o ponteiro e liga o retorno elástico ao sair", () => {
    render(<AvatarGroup people={people} max={4} />);
    const list = screen.getByRole("list");
    const items = screen.getAllByRole("listitem");
    fireEvent.pointerEnter(items[1]);
    expect(items[1].style.getPropertyValue("--shift")).toBe("var(--avatar-lift)");
    expect(items[1].style.getPropertyValue("--scale-active")).toBe("var(--avatar-scale)");
    expect(items[0].style.getPropertyValue("--shift")).toBe("calc(var(--avatar-lift) * 0.45)");
    expect(items[0].style.getPropertyValue("--scale-active")).toBe("");
    expect(items[1].style.zIndex).toBe("10");
    expect(items[3].style.getPropertyValue("--shift")).toBe("calc(var(--avatar-lift) * 0.2025)");
    fireEvent.pointerLeave(list);
    expect(items[1].style.getPropertyValue("--shift")).toBe("");
    expect(list).toHaveAttribute("data-leaving");
    fireEvent.pointerEnter(items[0]);
    expect(list).not.toHaveAttribute("data-leaving");
  });
});
