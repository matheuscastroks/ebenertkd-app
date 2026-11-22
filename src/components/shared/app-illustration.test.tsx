import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppIllustration } from "./app-illustration";
import { EmptyState } from "./empty-state";

describe("illustrated content", () => {
  it("keeps content and actions available if the decorative image fails", () => {
    const { container } = render(<EmptyState illustration="empty-agenda" title="Sem eventos" description="Volte depois." action={<button>Ver agenda</button>} />);
    const image = container.querySelector("img")!;
    expect(image).toHaveAttribute("alt", "");
    fireEvent.error(image);
    expect(image).toHaveStyle({ visibility: "hidden" });
    expect(screen.getByRole("heading", { name: "Sem eventos" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ver agenda" })).toBeVisible();
  });
  it("reserves dimensions and softens locked achievements", () => {
    const { container } = render(<AppIllustration name="achievement-first-lesson" context="achievement" subdued />);
    expect(container.querySelector("img")).toHaveAttribute("width", "480");
    expect(container.firstChild).toHaveClass("grayscale");
  });
  it("preserves custom icons for existing empty states", () => {
    render(<EmptyState icon={<span data-testid="existing-icon" />} title="Sem itens" description="Ainda não há itens." />);
    expect(screen.getByTestId("existing-icon")).toBeVisible();
  });
});
