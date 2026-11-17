import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { ptBR } from "date-fns/locale";
import { Calendar } from "./calendar";

it("identifica o mesmo dia local independentemente do idioma do calendário", () => {
  const month = new Date(2026, 10, 1);
  const { container, rerender } = render(<Calendar mode="single" month={month} />);
  expect(container.querySelector('button[data-date="2026-11-17"]')).toHaveTextContent("17");
  rerender(<Calendar mode="single" month={month} locale={ptBR} />);
  expect(container.querySelector('button[data-date="2026-11-17"]')).toHaveTextContent("17");
});
