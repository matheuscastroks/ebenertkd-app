import { describe, expect, it } from "vitest";
import { safeEventReturnPath, withQuery } from "@/features/events/paths";

describe("safeEventReturnPath", () => {
  it("aceita só telas de eventos", () => {
    expect(safeEventReturnPath("/aluno/eventos")).toBe("/aluno/eventos");
    expect(safeEventReturnPath("/admin/eventos/abc123")).toBe("/admin/eventos/abc123");
    expect(safeEventReturnPath("/responsavel/dependentes/p1/eventos")).toBe("/responsavel/dependentes/p1/eventos");
  });

  it("rejeita redirecionamento aberto e destinos de outras áreas", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil", "/aluno/financeiro", "/responsavel/dependentes/p1/financeiro", "/aluno/eventos?x=1", "/aluno/eventos#a", null, 42]) {
      expect(safeEventReturnPath(value as never)).toBe("/aluno/eventos");
    }
    expect(safeEventReturnPath("/aluno/financeiro", "/admin/eventos")).toBe("/admin/eventos");
  });

  it("monta a query de retorno", () => {
    expect(withQuery("/aluno/eventos", { ok: "registered" })).toBe("/aluno/eventos?ok=registered");
  });
});
