import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDrawer } from "./notification-drawer";
import type { InboxItem } from "../types";
const fixture: InboxItem[] = [
 { notification: { $id: "n1", title: "Treino especial", body: "Treino confirmado", kind: "announcement", audience: "all", published_at: "2026-11-17T12:00:00Z" }, recipient: { $id: "r1", read_at: null } },
 { notification: { $id: "n2", title: "Aviso antigo", body: "Aviso anterior", kind: "system", audience: "system", published_at: "2026-11-16T12:00:00Z" }, recipient: { $id: "r2", read_at: "2026-11-16" } }
];
beforeEach(() => {
 let items = structuredClone(fixture);
 vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
  if (options?.method === "POST") { const body = JSON.parse(options.body); items = items.map(item => item.recipient.$id === body.recipient_id ? { ...item, recipient: { ...item.recipient, read_at: "2026-11-17" } } : item); }
  return { ok: true, json: async () => ({ items: structuredClone(items) }) };
 }));
});
describe("Painel de avisos", () => {
 it("mostra titulo e conteudo com abas acessiveis", async () => {
  render(<NotificationDrawer open onOpenChange={vi.fn()} />);
  expect(await screen.findByText("Treino especial")).toBeVisible();
  expect(screen.getByText("Treino confirmado")).toBeVisible();
  expect(screen.getByRole("tab", { name: /Novos/ })).toHaveClass("min-h-11");
 });
 it("move aviso ao historico ao confirmar leitura", async () => {
  const user = userEvent.setup(); render(<NotificationDrawer open onOpenChange={vi.fn()} />);
  await user.click(await screen.findByRole("button", { name: "Marcar como lido" }));
  await waitFor(() => expect(screen.getByText("Nenhum aviso novo")).toBeVisible());
  await user.click(screen.getByRole("tab", { name: /^Histórico/ }));
  expect(await screen.findByText("Treino especial")).toBeVisible();
  expect(screen.getByText("Aviso antigo")).toBeVisible();
 });
 it("falha de consulta nao parece caixa vazia com sucesso", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<NotificationDrawer open onOpenChange={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível atualizar/);
  expect(screen.queryByText("Nenhum aviso novo")).toBeNull();
  expect(screen.queryByRole("tab", { name: /Novos/ })).toBeNull();
 });
});
