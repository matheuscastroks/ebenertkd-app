import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { NotificationItem } from "./notification-item";
import { NotificationInbox } from "./notification-inbox";
import type { InboxItem } from "../types";
const item: InboxItem = { notification: { $id: "n", title: "Aula de hoje", body: "Treino às 19h", kind: "announcement", audience: "all", published_at: "2026-11-17T12:00:00Z" }, recipient: { $id: "r", read_at: null } };
it("indica somente avisos nao lidos e oferece alvo de toque", () => {
 const { rerender } = render(<NotificationItem notification={item} onMarkRead={vi.fn()} />);
 expect(screen.getByLabelText("Não lido")).toBeInTheDocument();
 expect(screen.getByRole("button", { name: "Marcar como lido" })).toHaveClass("h-11");
 rerender(<NotificationItem notification={{ ...item, recipient: { ...item.recipient, read_at: "2026-11-17" } }} onMarkRead={vi.fn()} />);
 expect(screen.queryByLabelText("Não lido")).toBeNull(); expect(screen.queryByText("Lido")).toBeNull();
});
it("abas Avisos e Historico respondem ao teclado", async () => {
 const user = userEvent.setup(); render(<NotificationInbox items={[item]} />);
 const tab = screen.getByRole("tab", { name: /Avisos/ }); tab.focus(); await user.keyboard("{ArrowRight}");
 expect(screen.getByRole("tab", { name: /Histórico/ })).toHaveAttribute("aria-selected", "true");
});

