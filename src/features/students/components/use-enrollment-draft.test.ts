import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { useEnrollmentDraft } from "./use-enrollment-draft";

beforeEach(() => localStorage.clear());
describe("rascunho de matrícula", () => {
  it("restaura os campos e isola por aluno e matrícula", () => {
    const first = renderHook(() => useEnrollmentDraft("aluno1:matricula1"));
    act(() => first.result.current.save({ full_name: "Ana", cpf: "12345678901" }));
    first.unmount();
    const restored = renderHook(() => useEnrollmentDraft("aluno1:matricula1"));
    expect(restored.result.current.values.full_name).toBe("Ana");
    const other = renderHook(() => useEnrollmentDraft("aluno2:matricula1"));
    expect(other.result.current.values).toEqual({});
    act(() => restored.result.current.clear());
    expect(localStorage.getItem("enrollment-draft:aluno1:matricula1")).toBeNull();
  });
  it("continua funcionando quando armazenamento indisponível", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const hook = renderHook(() => useEnrollmentDraft("a:b"));
    expect(() => act(() => hook.result.current.save({ full_name: "Ana" }))).not.toThrow();
    expect(hook.result.current.saved).toBe(false);
    spy.mockRestore();
  });
  it("troca de chave sem herdar dados de outro aluno", () => {
    localStorage.setItem("enrollment-draft:aluno1:e1:1", JSON.stringify({ full_name: "Ana" }));
    localStorage.setItem("enrollment-draft:aluno2:e2:1", JSON.stringify({ full_name: "Bruno" }));
    const hook = renderHook(({ identity }) => useEnrollmentDraft(identity), { initialProps: { identity: "aluno1:e1:1" } });
    expect(hook.result.current.values.full_name).toBe("Ana");
    hook.rerender({ identity: "aluno2:e2:1" });
    expect(hook.result.current.values.full_name).toBe("Bruno");
    hook.rerender({ identity: "aluno3:e3:1" });
    expect(hook.result.current.values).toEqual({});
  });
  it("usa snapshot seguro no servidor sem antecipar dados locais", () => {
    localStorage.setItem("enrollment-draft:a:e:1", JSON.stringify({ full_name: "Nome privado" }));
    function Probe() {
      const draft = useEnrollmentDraft("a:e:1");
      return createElement("p", null, draft.ready ? draft.values.full_name : "Carregando");
    }
    expect(renderToString(createElement(Probe))).toContain("Carregando");
    expect(renderToString(createElement(Probe))).not.toContain("Nome privado");
    expect(renderHook(() => useEnrollmentDraft("a:e:1")).result.current.values.full_name).toBe("Nome privado");
  });
});