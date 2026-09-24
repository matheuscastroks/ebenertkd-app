import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GraduationFields } from "@/features/students/components/graduation-fields";

describe("GraduationFields", () => {
  it("updates GUB when the belt changes", async () => {
    const user = userEvent.setup();
    render(<GraduationFields defaultBelt="Cinza" defaultGub={9} />);
    await user.selectOptions(screen.getByLabelText("Faixa atual *"), "Azul");
    expect(screen.getByRole("combobox", { name: /^GUB/ })).toHaveValue("4");
  });

  it("updates the belt when GUB changes", async () => {
    const user = userEvent.setup();
    render(<GraduationFields defaultBelt="Cinza" defaultGub={9} />);
    await user.selectOptions(screen.getByRole("combobox", { name: /^GUB/ }), "2");
    expect(screen.getByLabelText("Faixa atual *")).toHaveValue("Vermelha");
  });
});
