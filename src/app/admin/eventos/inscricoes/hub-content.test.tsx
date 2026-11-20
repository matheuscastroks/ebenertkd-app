import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/championships", () => ({ bulkApproveAction: vi.fn(), bulkConfirmTeamAction: vi.fn(), reviewRegistrationDocumentAction: vi.fn(), submitToFederationAction: vi.fn() }));
vi.mock("@/features/events/championship-queries", () => ({ getRegistrationHub: vi.fn() }));
vi.mock("@/features/students/components/student-avatar", () => ({ StudentAvatar: () => null }));
import { getRegistrationHub } from "@/features/events/championship-queries";
import { HubContent } from "./hub-content";

const item = (id: string) => ({ registrationId: id, eventId: "e1", eventTitle: "Copa", name: `Atleta ${id}`, optionLabel: "Kyorugi", status: "pending", pendingDocuments: [] });
const hub = (queues: Record<string, unknown[]>) => ({
  total: Object.values(queues).flat().length,
  queues: { approval: [], interest: [], authorization: [], documents: [], payment: [], submit: [], waitlist: [], ...queues },
});

describe("inscrições", () => {
  it("mostra só filas com pendência, com resumo que leva a cada uma", async () => {
    vi.mocked(getRegistrationHub).mockResolvedValue(hub({ approval: [item("a"), item("b")], payment: [item("c")] }) as never);
    render(await HubContent());
    expect(screen.getByRole("link", { name: /Aguardando aprovação\s*2/ })).toHaveAttribute("href", "#fila-approval");
    expect(screen.getByRole("region", { name: "Pagamento pendente" })).toHaveAttribute("id", "fila-payment");
    expect(screen.queryByRole("region", { name: "Lista de espera" })).not.toBeInTheDocument();
    expect(screen.getByText(/Sem pendências: .*lista de espera/)).toBeInTheDocument();
  });

  it("dispensa o resumo quando há uma só fila", async () => {
    vi.mocked(getRegistrationHub).mockResolvedValue(hub({ submit: [item("a")] }) as never);
    render(await HubContent());
    expect(screen.queryByRole("navigation", { name: "Filas com pendência" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Prontos para a federação" })).toBeInTheDocument();
  });
});
