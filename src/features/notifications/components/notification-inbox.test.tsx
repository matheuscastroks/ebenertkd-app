import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, items: [] }),
  })
);

import { NotificationInbox } from "@/features/notifications/components/notification-inbox";
import type { InboxItem } from "@/features/notifications/types";

describe("NotificationInbox", () => {
  const dummyItems: InboxItem[] = [
    {
      recipient: {
        $id: "rec-1",
        read_at: null,
      },
      notification: {
        $id: "notif-1",
        kind: "announcement",
        title: "Treino de graduação",
        body: "Exame de faixa confirmado para o próximo mês.",
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
        kind: "payment_reminder",
        title: "Mensalidade disponível",
        body: "Sua mensalidade de setembro já está aberta para pagamento.",
        audience: "system",
        published_at: "2026-09-20T10:00:00Z",
      },
    },
  ];

  it("renders unread notices without accordion dropdown and with mark as read button", () => {
    render(<NotificationInbox items={dummyItems} />);

    expect(screen.getByText("Treino de graduação")).toBeInTheDocument();
    expect(
      screen.getByText("Exame de faixa confirmado para o próximo mês.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como lido" })).toBeInTheDocument();
  });

  it("moves unread notice to history tab upon marking as read", async () => {
    render(<NotificationInbox items={dummyItems} />);

    const markButton = screen.getByRole("button", { name: "Marcar como lido" });
    fireEvent.click(markButton);

    expect(screen.queryByText("Treino de graduação")).not.toBeInTheDocument();
    expect(screen.getByText("Tudo em dia!")).toBeInTheDocument();

    const historyTab = screen.getByRole("button", { name: /^Histórico/i });
    fireEvent.click(historyTab);

    expect(screen.getByText("Treino de graduação")).toBeInTheDocument();
    expect(screen.getByText("Mensalidade disponível")).toBeInTheDocument();
  });
});
