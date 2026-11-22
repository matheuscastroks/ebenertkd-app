import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
    locale,
    startMonth,
    endMonth,
    disabled,
  }: {
    onSelect: (date: Date) => void;
    locale?: { code?: string };
    startMonth?: Date;
    endMonth?: Date;
    disabled?: unknown[];
  }) => (
    <button
      type="button"
      data-locale={locale?.code}
      data-start={
        startMonth
          ? `${startMonth.getFullYear()}-${startMonth.getMonth() + 1}-${startMonth.getDate()}`
          : undefined
      }
      data-end={
        endMonth
          ? `${endMonth.getFullYear()}-${endMonth.getMonth() + 1}-${endMonth.getDate()}`
          : undefined
      }
      data-disabled-count={disabled?.length}
      onClick={() => onSelect(new Date(2026, 9, 5))}
    >
      Escolher 5 de outubro
    </button>
  ),
}));

import {
  DateField,
  formatLocalDate,
  maskDateInput,
  parseLocalDate,
  parseTypedDate,
} from "@/components/shared/date-field";

describe("DateField", () => {
  it("shows pt-BR text in the input and submits the ISO value", () => {
    const { container } = render(
      <DateField id="birth" name="birth_date" label="Nascimento" defaultValue="2000-01-20" required />
    );
    expect(screen.getByLabelText("Nascimento *")).toHaveValue("20/01/2000");
    expect(container.querySelector('input[name="birth_date"]')).toHaveValue("2000-01-20");
  });

  it("updates both visible input and hidden form value after calendar selection", () => {
    const { container } = render(<DateField id="due" name="due_date" label="Vencimento" />);
    fireEvent.click(screen.getByRole("button", { name: "Escolher 5 de outubro" }));
    expect(container.querySelector('input[name="due_date"]')).toHaveValue("2026-10-05");
    expect(screen.getByLabelText("Vencimento")).toHaveValue("05/10/2026");
  });

  it("allows typing digits with automatic dd/mm/yyyy masking and updates hidden ISO value", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <DateField id="birth" name="birth_date" label="Nascimento" onValueChange={onValueChange} />
    );
    const input = screen.getByLabelText("Nascimento");

    fireEvent.change(input, { target: { value: "20012000" } });

    expect(input).toHaveValue("20/01/2000");
    expect(container.querySelector('input[name="birth_date"]')).toHaveValue("2000-01-20");
    expect(onValueChange).toHaveBeenLastCalledWith("2000-01-20");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts pasted ISO dates and converts them to dd/mm/yyyy", () => {
    const { container } = render(<DateField id="due" name="due_date" label="Vencimento" />);
    const input = screen.getByLabelText("Vencimento");

    fireEvent.change(input, { target: { value: "2026-10-05" } });

    expect(input).toHaveValue("05/10/2026");
    expect(container.querySelector('input[name="due_date"]')).toHaveValue("2026-10-05");
  });

  it("rejects impossible dates and out-of-range dates with inline alert", () => {
    const { container } = render(
      <DateField
        id="limited"
        name="limited"
        label="Data limitada"
        min="2026-01-10"
        max="2026-12-20"
      />
    );
    const input = screen.getByLabelText("Data limitada");

    fireEvent.change(input, { target: { value: "30/02/2026" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Data inválida");
    expect(container.querySelector('input[name="limited"]')).toHaveValue("");

    fireEvent.change(input, { target: { value: "05/01/2026" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Data anterior ao mínimo permitido");
    expect(container.querySelector('input[name="limited"]')).toHaveValue("");

    fireEvent.change(input, { target: { value: "25/12/2026" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Data posterior ao máximo permitido");
    expect(container.querySelector('input[name="limited"]')).toHaveValue("");
  });

  it("shows incomplete-date alert on blur and clears value when emptied", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <DateField
        id="birth"
        name="birth_date"
        label="Nascimento"
        defaultValue="2000-01-20"
        onValueChange={onValueChange}
      />
    );
    const input = screen.getByLabelText("Nascimento");

    fireEvent.change(input, { target: { value: "20/01" } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent("Data incompleta");
    expect(container.querySelector('input[name="birth_date"]')).toHaveValue("");

    fireEvent.change(input, { target: { value: "" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("rejects impossible ISO and typed dates without timezone conversion", () => {
    expect(parseLocalDate("2026-02-30")).toBeUndefined();
    expect(parseTypedDate("30/02/2026")).toBeUndefined();
    expect(maskDateInput("2026-09-24")).toBe("24/09/2026");
    expect(formatLocalDate(parseLocalDate("2026-09-24"))).toBe("2026-09-24");
  });

  it("passes locale and date limits to the calendar", () => {
    render(
      <DateField
        id="limited"
        name="limited"
        label="Data limitada"
        min="2026-01-10"
        max="2026-12-20"
      />
    );
    const calendar = screen.getByRole("button", { name: "Escolher 5 de outubro" });
    expect(calendar).toHaveAttribute("data-locale", "pt-BR");
    expect(calendar).toHaveAttribute("data-start", "2026-1-10");
    expect(calendar).toHaveAttribute("data-end", "2026-12-20");
    expect(calendar).toHaveAttribute("data-disabled-count", "2");
  });
});
