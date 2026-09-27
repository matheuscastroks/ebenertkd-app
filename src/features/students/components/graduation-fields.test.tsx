import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GraduationFields } from "@/features/students/components/graduation-fields";

describe("GraduationFields", () => {
  it("updates GUB when the belt changes", async () => {
    const user = userEvent.setup();
    render(<GraduationFields defaultBelt="Ponta Amarela" defaultGub={9} />);
    await user.click(screen.getByRole("combobox", { name: "Faixa atual *" }));
    await user.click(screen.getByRole("option", { name: "Azul · 4º GUB" }));
    expect(screen.getByRole("combobox", { name: /^GUB/ })).toHaveTextContent("4º GUB");
  });

  it("updates the belt when GUB changes", async () => {
    const user = userEvent.setup();
    render(<GraduationFields defaultBelt="Ponta Amarela" defaultGub={9} />);
    await user.click(screen.getByRole("combobox", { name: /^GUB/ }));
    await user.click(screen.getByRole("option", { name: "2º GUB · Vermelha" }));
    expect(screen.getByRole("combobox", { name: "Faixa atual *" })).toHaveTextContent("Vermelha");
  });

  it("supports Black Belt (Faixa Preta / Dan) selection and sync", async () => {
    const user = userEvent.setup();
    render(<GraduationFields defaultBelt="Preta" defaultGub={0} />);
    expect(screen.getByRole("combobox", { name: "Faixa atual *" })).toHaveTextContent("Preta");
    expect(screen.getByRole("combobox", { name: /^GUB/ })).toHaveTextContent("Faixa Preta · Dan");

    await user.click(screen.getByRole("combobox", { name: "Faixa atual *" }));
    await user.click(screen.getByRole("option", { name: "Preta 2º Dan · 2º Dan" }));
    expect(screen.getByRole("combobox", { name: /^GUB/ })).toHaveTextContent("Faixa Preta · Dan");
  });
});
