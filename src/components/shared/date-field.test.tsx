import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect, locale, startMonth, endMonth, disabled }: {
    onSelect: (date: Date) => void;
    locale?: { code?: string };
    startMonth?: Date;
    endMonth?: Date;
    disabled?: unknown[];
  }) => (
    <button
      type="button"
      data-locale={locale?.code}
      data-start={startMonth ? `${startMonth.getFullYear()}-${startMonth.getMonth() + 1}-${startMonth.getDate()}` : undefined}
      data-end={endMonth ? `${endMonth.getFullYear()}-${endMonth.getMonth() + 1}-${endMonth.getDate()}` : undefined}
      data-disabled-count={disabled?.length}
      onClick={() => onSelect(new Date(2026, 9, 5))}
    >
      Escolher 5 de outubro
    </button>
  )
}));

import { DateField, formatLocalDate, parseLocalDate } from "@/components/shared/date-field";

describe("DateField", () => {
  it("shows pt-BR text and submits the ISO value", () => {
    const { container } = render(<DateField id="birth" name="birth_date" label="Nascimento" defaultValue="2000-01-20" required />);
    expect(screen.getByRole("button", { name: "Nascimento *" })).toHaveTextContent(
      "20/01/2000",
    );
    expect(container.querySelector('input[name="birth_date"]')).toHaveValue("2000-01-20");
  });

  it("updates the hidden form value after selection", () => {
    const { container } = render(<DateField id="due" name="due_date" label="Vencimento" />);
    fireEvent.click(screen.getByRole("button", { name: "Escolher 5 de outubro" }));
    expect(container.querySelector('input[name="due_date"]')).toHaveValue("2026-10-05");
    expect(screen.getByRole("button", { name: "Vencimento" })).toHaveTextContent(
      "05/10/2026",
    );
  });

  it("rejects impossible ISO dates without timezone conversion", () => {
    expect(parseLocalDate("2026-02-30")).toBeUndefined();
    expect(formatLocalDate(parseLocalDate("2026-09-24"))).toBe("2026-09-24");
  });

  it("passes locale and date limits to the calendar", () => {
    render(<DateField id="limited" name="limited" label="Data limitada" min="2026-01-10" max="2026-12-20" />);
    const calendar = screen.getByRole("button", { name: "Escolher 5 de outubro" });
    expect(calendar).toHaveAttribute("data-locale", "pt-BR");
    expect(calendar).toHaveAttribute("data-start", "2026-1-10");
    expect(calendar).toHaveAttribute("data-end", "2026-12-20");
    expect(calendar).toHaveAttribute("data-disabled-count", "2");
  });
});
