import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationPopoverContent } from "./notification-drawer";
import type { InboxItem } from "../types";

const fixture: InboxItem[] = [
  {
    notification: {
      $id: "n1",
      title: "Treino especial",
      body: "Treino confirmado",
      kind: "announcement",
      audience: "all",
      action_url: "/aluno/calendario",
      published_at: "2026-11-17T12:00:00Z",
    },
    recipient: { $id: "r1", read_at: null },
  },
  {
    notification: {
      $id: "n2",
      title: "Aviso antigo",
      body: "Aviso anterior",
      kind: "system",
      audience: "system",
      published_at: "2026-11-16T12:00:00Z",
    },
    recipient: { $id: "r2", read_at: "2026-11-16" },
  },
];

beforeEach(() => {
  let items = structuredClone(fixture);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      if (options?.method === "POST") {
        const body = JSON.parse(String(options.body));
        items = items.map((item) =>
          body.all || item.recipient.$id === body.recipient_id
            ? { ...item, recipient: { ...item.recipient, read_at: "2026-11-17" } }
            : item
        );
      }
      return { ok: true, json: async () => ({ items: structuredClone(items) }) };
    })
  );
});

describe("Dropdown de avisos", () => {
  it("mostra apenas avisos não lidos com contagem compacta", async () => {
    render(<NotificationPopoverContent open onClose={vi.fn()} />);
    expect(await screen.findByText("Treino especial")).toBeVisible();
    expect(screen.getByText("Treino confirmado")).toBeVisible();
    expect(screen.queryByText("Aviso antigo")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("limpa todos os avisos ao clicar em Limpar tudo", async () => {
    const user = userEvent.setup();
    const onCountChange = vi.fn();
    render(
      <NotificationPopoverContent open onClose={vi.fn()} onCountChange={onCountChange} />
    );

    await user.click(await screen.findByRole("button", { name: /Limpar tudo/ }));
    await waitFor(() => expect(screen.getByText("Tudo em dia")).toBeVisible());
    expect(onCountChange).toHaveBeenCalledWith(0);
  });

  it("falha de consulta mostra alerta sem parecer caixa vazia", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<NotificationPopoverContent open onClose={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Não foi possível atualizar/
    );
    expect(screen.queryByText("Tudo em dia")).toBeNull();
  });
});
