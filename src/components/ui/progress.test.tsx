import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Progress } from "./progress";
it("informa o valor numérico do progresso às tecnologias assistivas", () => {
  render(<Progress value={40} aria-label="Matrícula" />);
  expect(screen.getByRole("progressbar", { name: "Matrícula" })).toHaveAttribute("aria-valuenow", "40");
});
