import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setOpenMobile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/ui/sidebar", async () => {
  const actual = await vi.importActual<typeof import("@/components/ui/sidebar")>(
    "@/components/ui/sidebar"
  );
  return {
    ...actual,
    useSidebar: () => ({
      state: "expanded",
      open: true,
      setOpen: vi.fn(),
      openMobile: false,
      setOpenMobile: mocks.setOpenMobile,
      isMobile: false,
      toggleSidebar: vi.fn(),
    }),
  };
});

import { GlobalSearch } from "@/components/dashboard/global-search";
import { ROUTES } from "@/lib/navigation/routes";

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      })
    );
  });

  it("opens when clicking the sidebar search trigger and closes with Escape", () => {
    render(<GlobalSearch role="admin" capabilities={["admin"]} navItems={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir busca rápida" }));
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Buscar tela, aluno, turma ou evento...");
    expect(screen.queryByText(/Busca semântica ativa/i)).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("toggles with Ctrl+K keyboard shortcut and finds screens semantically", () => {
    render(<GlobalSearch role="admin" capabilities={["admin"]} navItems={[]} />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "boleto" } });
    expect(screen.getByRole("option", { name: /Financeiro · Cobranças/i })).toBeInTheDocument();
  });

  it("navigates with ArrowDown and Enter", () => {
    render(<GlobalSearch role="admin" capabilities={["admin"]} navItems={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir busca rápida" }));
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "faixa" } });

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThanOrEqual(2);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mocks.push).toHaveBeenCalledTimes(1);
    expect([ROUTES.adminExams, ROUTES.adminExamEligibility, ROUTES.adminAcademyGrades]).toContain(
      mocks.push.mock.calls[0]?.[0]
    );
  });

  it("fetches debounced remote results from /api/search and merges them by group", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "student-1",
            kind: "student",
            title: "João Pedro",
            subtitle: "Infantil · Ativo",
            href: "/admin/matriculas/student-1",
            icon: "students",
            badge: "Aluno",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<GlobalSearch role="admin" capabilities={["admin"]} navItems={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir busca rápida" }));
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "joao" } });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 260));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/search?q=joao",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(screen.getByRole("option", { name: /João Pedro/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("option", { name: /João Pedro/i }));
    expect(mocks.push).toHaveBeenCalledWith("/admin/matriculas/student-1");
  });
});
