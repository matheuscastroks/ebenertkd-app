import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        action_url: "/aluno/exames",
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
        title: "Mensalidade antiga",
        body: "Já lida anteriormente.",
        audience: "system",
        published_at: "2026-09-20T10:00:00Z",
      },
    },
  ];

  it("exibe apenas avisos pendentes (sem aba de histórico)", () => {
    render(<NotificationInbox items={dummyItems} />);

    expect(screen.getByText("Treino de graduação")).toBeInTheDocument();
    expect(screen.queryByText("Mensalidade antiga")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Histórico/i })).not.toBeInTheDocument();
  });

  it("remove o aviso imediatamente ao marcar como lido e mostra estado em dia", async () => {
    const user = userEvent.setup();
    render(<NotificationInbox items={dummyItems} />);

    await user.click(screen.getByRole("button", { name: "Marcar como lido" }));

    expect(screen.queryByText("Treino de graduação")).not.toBeInTheDocument();
    expect(screen.getByText("Tudo em dia")).toBeInTheDocument();
  });

  it("marca como lido automaticamente ao clicar no link do aviso", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<NotificationInbox items={dummyItems} onNavigate={onNavigate} />);

    await user.click(screen.getByRole("link", { name: /Treino de graduação/ }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Treino de graduação")).not.toBeInTheDocument();
    expect(screen.getByText("Tudo em dia")).toBeInTheDocument();
  });
});
