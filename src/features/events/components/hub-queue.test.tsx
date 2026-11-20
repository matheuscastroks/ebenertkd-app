import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HubQueue, type HubRow } from "./hub-queue";

const rows: HubRow[] = [
  { value: "r1", eventId: "e1", eventTitle: "Estadual", name: "Ana", detail: "Cadete" },
  { value: "r2", eventId: "e1", eventTitle: "Estadual", name: "Bia", detail: "Juvenil" }
];

describe("fila da central de inscrições", () => {
  it("mostra a contagem, o estado vazio e as filas só de consulta sem seleção", () => {
    const { unmount } = render(<HubQueue title="Lista de espera" hint="Aguardam vaga" rows={rows} returnTo="/admin/eventos/inscricoes" />);
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    unmount();
    render(<HubQueue title="Vazia" hint="" rows={[]} returnTo="/admin/eventos/inscricoes" />);
    expect(screen.getByText("Nada pendente aqui.")).toBeTruthy();
  });

  it("ação em lote fica desabilitada até selecionar e conta os selecionados", () => {
    render(<HubQueue title="Aguardando aprovação" hint="Esperam o seu aval" rows={rows} action={vi.fn()} actionLabel="Aprovar selecionadas" returnTo="/admin/eventos/inscricoes" />);
    const submit = screen.getByRole("button", { name: /Aprovar selecionadas/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar Ana" }));
    expect((screen.getByRole("button", { name: /Aprovar selecionadas \(1\)/ }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: /Selecionar todas/ }));
    expect(screen.getByRole("button", { name: /Aprovar selecionadas \(2\)/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Selecionar todas/ }));
    expect((screen.getByRole("button", { name: /Aprovar selecionadas/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
