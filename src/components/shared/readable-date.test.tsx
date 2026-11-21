import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadableDate } from "./readable-date";

describe("ReadableDate", () => {
  it("preserva o dia civil e inclui o ano", () => {
    render(<ReadableDate value="2026-01-01" />);
    expect(screen.getByText("1 de jan. de 2026")).toHaveAttribute("datetime", "2026-01-01");
  });
  it("apresenta instantes no fuso de São Paulo", () => {
    render(<ReadableDate value="2026-01-02T01:00:00Z" />);
    expect(screen.getByText("1 de jan. de 2026")).toBeInTheDocument();
  });
});
