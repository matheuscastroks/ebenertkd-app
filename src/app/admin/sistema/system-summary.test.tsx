import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SystemSummary, systemAttentionItems } from "./system-summary";

const ok = { cronHealth: { level: "normal" as const }, backupHealth: { level: "normal" as const }, storage: { level: "unknown" as const }, failures: [] };

it("diz que está tudo funcionando quando não há alertas", () => {
  render(<SystemSummary health={ok} />);
  expect(screen.getByRole("status")).toHaveTextContent("Tudo funcionando");
});

it("resume o que precisa de atenção sem termos técnicos", () => {
  const health = { ...ok, backupHealth: { level: "critical" as const }, failures: [{}, {}] };
  expect(systemAttentionItems(health)).toEqual(["Backup externo", "2 falhas recentes"]);
  render(<SystemSummary health={health} />);
  expect(screen.getByRole("status")).toHaveTextContent("2 itens precisam de atenção");
});
