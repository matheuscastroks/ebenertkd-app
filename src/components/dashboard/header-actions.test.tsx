import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeaderActions } from "@/components/dashboard/header-actions";

describe("HeaderActions", () => {
  it("renderiza as ações em linha própria com quebra no celular e inline no desktop", () => {
    const { container } = render(
      <HeaderActions>
        <button type="button">Fechamento mensal</button>
        <button type="button">Exportar CSV</button>
      </HeaderActions>
    );
    const wrapper = container.querySelector("[data-slot='header-actions']");
    expect(wrapper).toHaveClass("flex-wrap", "w-full", "order-last", "md:order-none", "md:w-auto");
    expect(wrapper).toContainElement(screen.getByRole("button", { name: "Fechamento mensal" }));
    expect(wrapper).toContainElement(screen.getByRole("button", { name: "Exportar CSV" }));
  });
});
