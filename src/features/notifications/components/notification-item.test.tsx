import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatRelativeTimeBr, NotificationItem } from "./notification-item";
import type { InboxItem } from "../types";

const itemWithAction: InboxItem = {
  notification: {
    $id: "n",
    title: "Pagamento confirmado",
    body: "Mensalidade 2026-11 quitada.",
    kind: "payment_reminder",
    audience: "system",
    action_url: "/aluno/financeiro",
    published_at: "2026-11-17T12:00:00Z",
  },
  recipient: { $id: "r", read_at: null },
};

describe("NotificationItem", () => {
  it("indica não lido, marca como lido ao clicar no link e oferece botão de dispensa", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    const onNavigate = vi.fn();

    render(
      <NotificationItem
        notification={itemWithAction}
        onMarkRead={onMarkRead}
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByLabelText("Não lido")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Pagamento confirmado/ });
    expect(link).toHaveAttribute("href", "/aluno/financeiro");
    await user.click(link);
    expect(onMarkRead).toHaveBeenCalledWith("r");
    expect(onNavigate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Marcar como lido" }));
    expect(onMarkRead).toHaveBeenCalledTimes(2);
  });

  it("formata tempo relativo de forma compacta", () => {
    const now = new Date("2026-11-18T15:00:00Z");
    expect(formatRelativeTimeBr("2026-11-18T14:59:30Z", now)).toBe("agora");
    expect(formatRelativeTimeBr("2026-11-18T14:45:00Z", now)).toBe("15 min");
    expect(formatRelativeTimeBr("2026-11-18T12:00:00Z", now)).toBe("3 h");
    expect(formatRelativeTimeBr("2026-11-17T18:00:00Z", now)).toBe("21 h");
    expect(formatRelativeTimeBr("2026-11-17T10:00:00Z", now)).toBe("ontem");
  });
});
