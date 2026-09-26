import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, items: [] }),
  })
);

import { NotificationDrawer } from "@/features/notifications/components/notification-drawer";
import type { InboxItem } from "@/features/notifications/types";

describe("NotificationDrawer", () => {
  const dummyItems: InboxItem[] = [
    {
      recipient: {
        $id: "rec-1",
        read_at: null,
      },
      notification: {
        $id: "notif-1",
        kind: "announcement",
        title: "Treino especial de sábado",
        body: "Todos os alunos com graduação acima de ponta amarela estão convidados.",
        audience: "all",
        published_at: "2026-09-26T10:00:00Z",
      },
    },
    {
      recipient: {
        $id: "rec-2",
        read_at: "2026-09-20T10:00:00Z",
      },
      notification: {
        $id: "notif-2",
        kind: "system",
        title: "Aviso antigo do sistema",
        body: "Manutenção programada concluída.",
        audience: "system",
        published_at: "2026-09-20T10:00:00Z",
      },
    },
  ];

  it("renders unread notices stacked vertically with body visible and mark as read button", () => {
    render(<NotificationDrawer open={true} onOpenChange={vi.fn()} initialItems={dummyItems} />);

    // Title and body visible directly without opening a dropdown
    expect(screen.getByText("Treino especial de sábado")).toBeInTheDocument();
    expect(
      screen.getByText("Todos os alunos com graduação acima de ponta amarela estão convidados.")
    ).toBeInTheDocument();

    // Button "Marcar como lido" is present
    expect(screen.getByRole("button", { name: "Marcar como lido" })).toBeInTheDocument();
  });

  it("removes notice from unread tab and moves it to history when marked as read", async () => {
    render(<NotificationDrawer open={true} onOpenChange={vi.fn()} initialItems={dummyItems} />);

    const markButton = screen.getByRole("button", { name: "Marcar como lido" });
    fireEvent.click(markButton);

    // Unread notice should disappear from active tab
    expect(screen.queryByText("Treino especial de sábado")).not.toBeInTheDocument();
    expect(screen.getByText("Tudo em dia!")).toBeInTheDocument();

    // Click "Histórico" tab or action button
    const historyButton = screen.getByRole("button", { name: /^Histórico/i });
    fireEvent.click(historyButton);

    // Both notices should now be in the history tab
    expect(screen.getByText("Treino especial de sábado")).toBeInTheDocument();
    expect(screen.getByText("Aviso antigo do sistema")).toBeInTheDocument();
  });
});
