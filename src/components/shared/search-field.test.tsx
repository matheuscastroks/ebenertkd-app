import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildPageHref, ListPagination } from "@/components/shared/list-pagination";
import { SearchField } from "@/components/shared/search-field";

describe("SearchField", () => {
  it("renders an accessible GET-compatible search", () => {
    render(<form><SearchField id="student" name="student" label="Aluno" placeholder="Buscar nome" defaultValue="Camila" /></form>);
    expect(screen.getByRole("searchbox", { name: "Aluno" })).toHaveAttribute("name", "student");
    expect(screen.getByRole("searchbox", { name: "Aluno" })).toHaveValue("Camila");
  });

  it("clears and submits the surrounding form", () => {
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => undefined);
    render(<form><SearchField id="student" label="Aluno" placeholder="Buscar nome" defaultValue="Camila" /></form>);
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca por aluno" }));
    expect(screen.getByRole("searchbox", { name: "Aluno" })).toHaveValue("");
    expect(requestSubmit).toHaveBeenCalledOnce();
    requestSubmit.mockRestore();
  });

  it("offers the clear action after the user starts typing", () => {
    render(<form><SearchField id="student" label="Aluno" placeholder="Buscar nome" /></form>);
    fireEvent.change(screen.getByRole("searchbox", { name: "Aluno" }), { target: { value: "Lucas" } });
    expect(screen.getByRole("button", { name: "Limpar busca por aluno" })).toBeInTheDocument();
  });
});

describe("buildPageHref", () => {
  it("preserves filters and omits page one", () => {
    expect(buildPageHref("/admin/matriculas", { q: "Ana Clara", status: "active", empty: undefined }, 2)).toBe(
      "/admin/matriculas?q=Ana+Clara&status=active&page=2",
    );
    expect(buildPageHref("/admin/matriculas", { q: "Ana Clara", page: "7" }, 1)).toBe(
      "/admin/matriculas?q=Ana+Clara",
    );
  });

  it("renders the interval and navigation while preserving filters", () => {
    render(<ListPagination basePath="/admin/financeiro" params={{ status: "overdue" }} page={2} total={45} pageSize={20} />);
    expect(screen.getByText("Exibindo 21–40 de 45")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para a página anterior" })).toHaveAttribute("href", "/admin/financeiro?status=overdue");
    expect(screen.getByRole("link", { name: "Ir para a próxima página" })).toHaveAttribute("href", "/admin/financeiro?status=overdue&page=3");
  });
});
